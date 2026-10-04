import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/redis.js';

let app;
const ts = Date.now();

beforeAll(async () => {
  app = createApp();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
  const { emailQueue } = await import('../src/lib/queues.js');
  await emailQueue.close();
});

describe('Phase D: Blocks, Notifications, Leaderboard', () => {
  let user1Cookies, user2Cookies, user3Cookies, adminCookies;

  it('0. Setup users', async () => {
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

    const register = async (email, handle, role = 'USER') => {
      await request(app).post('/api/v1/auth/signup').send({ email, handle, password: 'Password123!' });
      await redis.set(`otp:signup:${hashEmail(email)}`, hashOtp('123456'), 'EX', 600);
      await request(app).post('/api/v1/auth/signup/verify').send({ email, otp: '123456' });
      
      const user = await prisma.user.findUnique({ where: { emailHash: hashEmail(email) } });
      if (role === 'ADMIN') {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
      }
      
      const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'Password123!' });
      return login.headers['set-cookie'];
    };

    user1Cookies = await register(`u1_${ts}@example.com`, `user1_${ts}`);
    user2Cookies = await register(`u2_${ts}@example.com`, `user2_${ts}`);
    user3Cookies = await register(`u3_${ts}@example.com`, `user3_${ts}`);
    adminCookies = await register(`admin_${ts}@example.com`, `admin_${ts}`, 'ADMIN');

    // Add karma
    await prisma.profile.update({ where: { handle: `user1_${ts}` }, data: { karma: 100 } });
    await prisma.profile.update({ where: { handle: `user2_${ts}` }, data: { karma: 50 } });
    await prisma.profile.update({ where: { handle: `user3_${ts}` }, data: { karma: 150 } });
  }, 30000);

  it('1. Fetches Leaderboard correctly', async () => {
    const res = await request(app).get('/api/v1/leaderboard?limit=100');
    expect(res.status).toBe(200);
    // User3 should be higher than User1, User1 > User2
    const handles = res.body.data.map(p => p.handle);
    expect(handles).toContain(`user3_${ts}`);
    expect(handles).toContain(`user1_${ts}`);
  });

  it('2. Excludes deleted users from Leaderboard', async () => {
    // Delete user2
    const u2Profile = await prisma.profile.findUnique({ where: { handle: `user2_${ts}` } });
    await prisma.user.update({ where: { id: u2Profile.userId }, data: { status: 'DELETED' } });
    const res = await request(app).get('/api/v1/leaderboard');
    const handles = res.body.data.map(p => p.handle);
    expect(handles).not.toContain(`user2_${ts}`);
  });

  it('3. Can block a user', async () => {
    // User1 blocks User3
    const res = await request(app)
      .post(`/api/v1/profiles/user3_${ts}/block`)
      .set('Cookie', user1Cookies);
    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    
    const u1Profile = await prisma.profile.findUnique({ where: { handle: `user1_${ts}` } });
    const u3Profile = await prisma.profile.findUnique({ where: { handle: `user3_${ts}` } });

    const blocks = await prisma.userBlock.findMany({ where: { blockerId: u1Profile.id } });
    expect(blocks.length).toBe(1);
    expect(blocks[0].blockedId).toBe(u3Profile.id);
  });

  it('4. Cannot block self or admin', async () => {
    const res1 = await request(app)
      .post(`/api/v1/profiles/user1_${ts}/block`)
      .set('Cookie', user1Cookies);
    expect(res1.status).toBe(400); // Cannot block self

    const res2 = await request(app)
      .post(`/api/v1/profiles/admin_${ts}/block`)
      .set('Cookie', user1Cookies);
    expect(res2.status).toBe(403); // Cannot block admin
  });

  it('5. Updates notification preferences', async () => {
    const res = await request(app)
      .patch('/api/v1/profiles/me/notification-preferences')
      .set('Cookie', user1Cookies)
      .send({ type: 'NEW_COMMENT', enabled: false });
    if (res.status !== 200) console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.NEW_COMMENT).toBe(false);
    expect(res.body.data.KARMA_MILESTONE).toBe(true); // default
  });

  it('6. Blocked users posts are hidden in global feed', async () => {
    // Create community and posts
    const commRes = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', user3Cookies)
      .send({ name: `Comm_${ts}`, slug: `comm-${ts}`, description: 'Test' });
    if (commRes.status !== 201) console.log(commRes.body);
    const commId = commRes.body.data.id;

    // user3 posts
    const p1 = await request(app).post('/api/v1/posts').set('Cookie', user3Cookies).send({
      title: `Post by user3 ${ts}`, bodyMarkdown: 'hello', communityId: commId
    });

    // user1 (blocker) views global feed
    const feed1 = await request(app).get('/api/v1/feed?sort=new').set('Cookie', user1Cookies);
    const postTitles = feed1.body.data.map(p => p.title);
    expect(postTitles).not.toContain(`Post by user3 ${ts}`);

    // anonymous views global feed
    const feedAnon = await request(app).get('/api/v1/feed?sort=new');
    const postTitlesAnon = feedAnon.body.data.map(p => p.title);
    expect(postTitlesAnon).toContain(`Post by user3 ${ts}`);
  }, 10000);
});
