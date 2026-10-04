import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/redis.js';

let app;
let ownerCookies = [];
let memberCookies = [];
let ownerProfileId;
let communityId;
const ts = Date.now();

beforeAll(async () => {
  app = createApp();
  const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

  const ownerEmail = `owner-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: ownerEmail, handle: `ownc${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(ownerEmail)}`, hashOtp('111111'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: ownerEmail, otp: '111111' });
  const login_1 = await request(app).post('/api/v1/auth/login').send({ email: ownerEmail, password: 'Password123!' });
  ownerCookies = login_1.headers['set-cookie'];
  ownerProfileId = login_1.body.data.profile.id;

  const memberEmail = `member-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: memberEmail, handle: `membc${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(memberEmail)}`, hashOtp('222222'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: memberEmail, otp: '222222' });
  const login_2 = await request(app).post('/api/v1/auth/login').send({ email: memberEmail, password: 'Password123!' });
  memberCookies = login_2.headers['set-cookie'];
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('Communities Module', () => {
  it('1. should create a community and set creator as OWNER', async () => {
    const res = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', ownerCookies)
      .send({ slug: `test-comm-${ts}`, name: 'Test Community' });
      
    expect(res.status).toBe(201);
    communityId = res.body.data.id;

    const membership = await prisma.communityMember.findUnique({
      where: { communityId_profileId: { communityId, profileId: ownerProfileId } }
    });
    expect(membership.role).toBe('OWNER');
  });

  it('2. should list communities', async () => {
    const res = await request(app).get('/api/v1/communities?q=Test Community');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('3. should allow a user to join and leave', async () => {
    const joinRes = await request(app)
      .post(`/api/v1/communities/${communityId}/join`)
      .set('Cookie', memberCookies);
    expect(joinRes.status).toBe(200);

    const commAfterJoin = await prisma.community.findUnique({ where: { id: communityId } });
    expect(commAfterJoin.memberCount).toBe(2);

    const leaveRes = await request(app)
      .post(`/api/v1/communities/${communityId}/leave`)
      .set('Cookie', memberCookies);
    expect(leaveRes.status).toBe(200);
    
    const commAfterLeave = await prisma.community.findUnique({ where: { id: communityId } });
    expect(commAfterLeave.memberCount).toBe(1);
  });

  it('4. should prevent OWNER from leaving', async () => {
    const res = await request(app)
      .post(`/api/v1/communities/${communityId}/leave`)
      .set('Cookie', ownerCookies);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Owners cannot leave/);
  });

  it('5. should allow OWNER to assign roles', async () => {
    await request(app).post(`/api/v1/communities/${communityId}/join`).set('Cookie', memberCookies);

    const memberRes = await request(app).get('/api/v1/auth/me').set('Cookie', memberCookies);
    const targetProfileId = memberRes.body.data.profile.id;

    const roleRes = await request(app)
      .patch(`/api/v1/communities/${communityId}/roles`)
      .set('Cookie', ownerCookies)
      .send({ profileId: targetProfileId, role: 'MODERATOR' });
      
    expect(roleRes.status).toBe(200);
    expect(roleRes.body.data.role).toBe('MODERATOR');
  });

  it('6. should prevent non-OWNER from assigning roles', async () => {
    const roleRes = await request(app)
      .patch(`/api/v1/communities/${communityId}/roles`)
      .set('Cookie', memberCookies)
      .send({ profileId: ownerProfileId, role: 'MEMBER' });
      
    expect(roleRes.status).toBe(403);
    expect(roleRes.body.error).toMatch(/Forbidden/);
  });
});
