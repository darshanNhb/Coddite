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

describe('Bookmarks', () => {
  const user1Email = `user1-${ts}@example.com`;
  const user2Email = `user2-${ts}@example.com`;
  const user3Email = `user3-${ts}@example.com`;
  const password = 'Password123!';
  
  let user1Cookies = [];
  let user2Cookies = [];
  let user3Cookies = [];
  
  let publicCommId;
  let privateCommId;
  let publicPostId;
  let privatePostId;

  it('1. Setup users and communities', async () => {
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

    // Create user 1
    await request(app).post('/api/v1/auth/signup').send({ email: user1Email, handle: `buser1${ts}`, password });
    await redis.set(`otp:signup:${hashEmail(user1Email)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: user1Email, otp: '123456' });
    const login1 = await request(app).post('/api/v1/auth/login').send({ email: user1Email, password });
    user1Cookies = login1.headers['set-cookie'];

    // Create user 2 (Private comm owner)
    await request(app).post('/api/v1/auth/signup').send({ email: user2Email, handle: `buser2${ts}`, password });
    await redis.set(`otp:signup:${hashEmail(user2Email)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: user2Email, otp: '123456' });
    const login2 = await request(app).post('/api/v1/auth/login').send({ email: user2Email, password });
    user2Cookies = login2.headers['set-cookie'];

    // Create user 3 (Member of private comm temporarily)
    await request(app).post('/api/v1/auth/signup').send({ email: user3Email, handle: `buser3${ts}`, password });
    await redis.set(`otp:signup:${hashEmail(user3Email)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: user3Email, otp: '123456' });
    const login3 = await request(app).post('/api/v1/auth/login').send({ email: user3Email, password });
    user3Cookies = login3.headers['set-cookie'];

    // User 1 creates public comm and post
    const pubCommRes = await request(app).post('/api/v1/communities').set('Cookie', user1Cookies).send({ name: `Pub Comm ${ts}`, slug: `pub-comm-${ts}`, description: 'Public' });
    publicCommId = pubCommRes.body.data.id;
    const pubPostRes = await request(app).post('/api/v1/posts').set('Cookie', user1Cookies).send({ communityId: publicCommId, title: 'Public Post', bodyMarkdown: 'Hello' });
    publicPostId = pubPostRes.body.data.id;

    // User 2 creates private comm and post
    const privCommRes = await request(app).post('/api/v1/communities').set('Cookie', user2Cookies).send({ name: `Priv Comm ${ts}`, slug: `priv-comm-${ts}`, description: 'Private' });
    privateCommId = privCommRes.body.data.id;
    await prisma.community.update({ where: { id: privateCommId }, data: { isPrivate: true } });
    
    const privPostRes = await request(app).post('/api/v1/posts').set('Cookie', user2Cookies).send({ communityId: privateCommId, title: 'Private Post', bodyMarkdown: 'Secret' });
    privatePostId = privPostRes.body.data.id;

    // User 3 joins private comm
    const user3Profile = await prisma.profile.findUnique({ where: { handle: `buser3${ts}` } });
    await prisma.communityMember.create({ data: { communityId: privateCommId, profileId: user3Profile.id, role: 'MEMBER' } });
  });

  it('2. User can bookmark and unbookmark a post', async () => {
    const res1 = await request(app).post('/api/v1/bookmarks').set('Cookie', user1Cookies).send({ postId: publicPostId });
    expect(res1.status).toBe(200);
    expect(res1.body.data.bookmarked).toBe(true);

    const list1 = await request(app).get('/api/v1/bookmarks').set('Cookie', user1Cookies);
    expect(list1.status).toBe(200);
    expect(list1.body.data.length).toBe(1);
    expect(list1.body.data[0].id).toBe(publicPostId);

    const res2 = await request(app).post('/api/v1/bookmarks').set('Cookie', user1Cookies).send({ postId: publicPostId });
    expect(res2.status).toBe(200);
    expect(res2.body.data.bookmarked).toBe(false);

    const list2 = await request(app).get('/api/v1/bookmarks').set('Cookie', user1Cookies);
    expect(list2.status).toBe(200);
    expect(list2.body.data.length).toBe(0);
  });

  it('3. Bookmarks list hides private community posts if user is no longer a member', async () => {
    // User 3 bookmarks private post
    await request(app).post('/api/v1/bookmarks').set('Cookie', user3Cookies).send({ postId: privatePostId });

    // See it in list
    let listRes = await request(app).get('/api/v1/bookmarks').set('Cookie', user3Cookies);
    expect(listRes.body.data.length).toBe(1);

    // Leave comm
    const user3Profile = await prisma.profile.findUnique({ where: { handle: `buser3${ts}` } });
    await prisma.communityMember.delete({ where: { communityId_profileId: { communityId: privateCommId, profileId: user3Profile.id } } });

    // Hidden in list
    listRes = await request(app).get('/api/v1/bookmarks').set('Cookie', user3Cookies);
    expect(listRes.body.data.length).toBe(0);
  });
});
