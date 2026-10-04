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

describe('Profiles', () => {
  const userEmail = `profile-${ts}@example.com`;
  const guestEmail = `guest-${ts}@example.com`;
  const password = 'Password123!';
  
  let userCookies = [];
  let guestCookies = [];
  
  let publicCommId;
  let privateCommId;

  it('1. Setup users and communities', async () => {
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

    // Create user
    await request(app).post('/api/v1/auth/signup').send({ email: userEmail, handle: `puser${ts}`, password });
    await redis.set(`otp:signup:${hashEmail(userEmail)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: userEmail, otp: '123456' });
    const login = await request(app).post('/api/v1/auth/login').send({ email: userEmail, password });
    userCookies = login.headers['set-cookie'];

    // Create guest
    await request(app).post('/api/v1/auth/signup').send({ email: guestEmail, handle: `pguest${ts}`, password });
    await redis.set(`otp:signup:${hashEmail(guestEmail)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: guestEmail, otp: '123456' });
    const guestLogin = await request(app).post('/api/v1/auth/login').send({ email: guestEmail, password });
    guestCookies = guestLogin.headers['set-cookie'];

    // Create public comm
    const pubCommRes = await request(app).post('/api/v1/communities').set('Cookie', userCookies).send({ name: `Pub Comm ${ts}`, slug: `pub-comm-${ts}`, description: 'Public' });
    publicCommId = pubCommRes.body.data.id;
    await request(app).post('/api/v1/posts').set('Cookie', userCookies).send({ communityId: publicCommId, title: 'Public Post', bodyMarkdown: 'Hello' });

    // Create private comm
    const privCommRes = await request(app).post('/api/v1/communities').set('Cookie', userCookies).send({ name: `Priv Comm ${ts}`, slug: `priv-comm-${ts}`, description: 'Private' });
    privateCommId = privCommRes.body.data.id;
    await prisma.community.update({ where: { id: privateCommId }, data: { isPrivate: true } });
    await request(app).post('/api/v1/posts').set('Cookie', userCookies).send({ communityId: privateCommId, title: 'Private Post', bodyMarkdown: 'Secret' });
  });

  it('2. Fetching profile returns basic info', async () => {
    const res = await request(app).get(`/api/v1/profiles/puser${ts}`);
    expect(res.status).toBe(200);
    expect(res.body.data.handle).toBe(`puser${ts}`);
    expect(res.body.data.postCount).toBe(2);
  });

  it('3. Fetching profile posts hides private posts from non-members', async () => {
    // Guest (non-member) fetches posts
    const res = await request(app).get(`/api/v1/profiles/puser${ts}/posts`).set('Cookie', guestCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1); // Only public post
    expect(res.body.data[0].title).toBe('Public Post');
  });

  it('4. Fetching profile posts shows private posts to members', async () => {
    // User (owner/member) fetches posts
    const res = await request(app).get(`/api/v1/profiles/puser${ts}/posts`).set('Cookie', userCookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2); // Public and private posts
  });

  it('5. Decrements postCount correctly on post deletion', async () => {
    // Create a 3rd post
    const postRes = await request(app).post('/api/v1/posts').set('Cookie', userCookies).send({ communityId: publicCommId, title: 'Temp Post', bodyMarkdown: 'Hello' });
    const postId = postRes.body.data.id;
    
    // Check count is 3
    let res = await request(app).get(`/api/v1/profiles/puser${ts}`);
    expect(res.body.data.postCount).toBe(3);
    
    // Delete it
    const delRes = await request(app).delete(`/api/v1/posts/${postId}`).set('Cookie', userCookies).send({});
    expect(delRes.status).toBe(200);
    
    // Check count is 2 again
    res = await request(app).get(`/api/v1/profiles/puser${ts}`);
    expect(res.body.data.postCount).toBe(2);
  });

  it('6. Decrements commentCount correctly on comment deletion', async () => {
    // Get public post to comment on
    const postRes = await request(app).get(`/api/v1/profiles/puser${ts}/posts`).set('Cookie', userCookies);
    const postId = postRes.body.data.find(p => p.title === 'Public Post').id;

    // Create 1st comment
    const commentRes1 = await request(app).post('/api/v1/comments').set('Cookie', userCookies).send({ postId, bodyMarkdown: 'Comment 1' });
    // Create 2nd comment
    const commentRes2 = await request(app).post('/api/v1/comments').set('Cookie', userCookies).send({ postId, bodyMarkdown: 'Comment 2' });
    
    // Check count is 2
    let res = await request(app).get(`/api/v1/profiles/puser${ts}`);
    expect(res.body.data.commentCount).toBe(2);
    
    // Delete 1st comment
    const delRes2 = await request(app).delete(`/api/v1/comments/${commentRes1.body.data.id}`).set('Cookie', userCookies).send({});
    expect(delRes2.status).toBe(200);
    
    // Check count is 1
    res = await request(app).get(`/api/v1/profiles/puser${ts}`);
    expect(res.body.data.commentCount).toBe(1);
  });
});
