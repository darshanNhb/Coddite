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

describe('Privacy and Access Control', () => {
  const memberEmail = `member-${ts}@example.com`;
  const nonMemberEmail = `non-member-${ts}@example.com`;
  const password = 'Password123!';
  
  let memberCookies = [];
  let nonMemberCookies = [];
  
  let privateCommunityId;
  let privatePostId;

  it('1. Setup users and a private community', async () => {
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

    // Create member
    await request(app).post('/api/v1/auth/signup').send({ email: memberEmail, handle: `member${ts}`, password });
    await redis.set(`otp:signup:${hashEmail(memberEmail)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: memberEmail, otp: '123456' });
    const memberLogin = await request(app).post('/api/v1/auth/login').send({ email: memberEmail, password });
    memberCookies = memberLogin.headers['set-cookie'];

    // Create non-member
    await request(app).post('/api/v1/auth/signup').send({ email: nonMemberEmail, handle: `nonmember${ts}`, password });
    await redis.set(`otp:signup:${hashEmail(nonMemberEmail)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: nonMemberEmail, otp: '123456' });
    const nonMemberLogin = await request(app).post('/api/v1/auth/login').send({ email: nonMemberEmail, password });
    nonMemberCookies = nonMemberLogin.headers['set-cookie'];

    // Member creates a community and makes it private
    const commRes = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', memberCookies)
      .send({ name: `Private Comm ${ts}`, slug: `private-comm-${ts}`, description: 'Secret' });
    privateCommunityId = commRes.body.data.id;

    await prisma.community.update({
      where: { id: privateCommunityId },
      data: { isPrivate: true }
    });

    // Member creates a post
    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Cookie', memberCookies)
      .send({ communityId: privateCommunityId, title: 'Secret Post', bodyMarkdown: 'Top secret' });
    privatePostId = postRes.body.data.id;

    // Member creates a comment
    await request(app).post('/api/v1/comments').set('Cookie', memberCookies).send({
      postId: privatePostId,
      bodyMarkdown: 'Secret comment'
    });
  });

  it('2. getPost should deny access to non-members and guests', async () => {
    const guestRes = await request(app).get(`/api/v1/posts/${privatePostId}`);
    expect(guestRes.status).toBe(403);
    expect(guestRes.body.error).toMatch(/Forbidden/i);

    const nonMemberRes = await request(app).get(`/api/v1/posts/${privatePostId}`).set('Cookie', nonMemberCookies);
    expect(nonMemberRes.status).toBe(403);
    expect(nonMemberRes.body.error).toMatch(/Forbidden/i);

    const memberRes = await request(app).get(`/api/v1/posts/${privatePostId}`).set('Cookie', memberCookies);
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.data.title).toBe('Secret Post');
  });

  it('3. listPosts should deny access to non-members and guests', async () => {
    const guestRes = await request(app).get(`/api/v1/posts?communityId=${privateCommunityId}`);
    expect(guestRes.status).toBe(403);

    const nonMemberRes = await request(app).get(`/api/v1/posts?communityId=${privateCommunityId}`).set('Cookie', nonMemberCookies);
    expect(nonMemberRes.status).toBe(403);

    const memberRes = await request(app).get(`/api/v1/posts?communityId=${privateCommunityId}`).set('Cookie', memberCookies);
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.data.length).toBeGreaterThan(0);
  });

  it('4. listComments should deny access to non-members and guests', async () => {
    const guestRes = await request(app).get(`/api/v1/comments?postId=${privatePostId}`);
    expect(guestRes.status).toBe(403);

    const nonMemberRes = await request(app).get(`/api/v1/comments?postId=${privatePostId}`).set('Cookie', nonMemberCookies);
    expect(nonMemberRes.status).toBe(403);

    const memberRes = await request(app).get(`/api/v1/comments?postId=${privatePostId}`).set('Cookie', memberCookies);
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.data.length).toBeGreaterThan(0);
  });

  it('5. Global feed should not include posts from private communities', async () => {
    const feedRes = await request(app).get('/api/v1/feed');
    expect(feedRes.status).toBe(200);
    const posts = feedRes.body.data;
    
    // Check that none of the posts returned belong to the private community
    const secretPost = posts.find(p => p.id === privatePostId);
    expect(secretPost).toBeUndefined();
    
    const privateComms = posts.filter(p => p.community.isPrivate === true);
    expect(privateComms.length).toBe(0);
  });
});
