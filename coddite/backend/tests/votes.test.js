import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/redis.js';

let app;
let authorCookies = [];
let voterCookies = [];
let communityId;
let postId;
const ts = Date.now();

beforeAll(async () => {
  app = createApp();
  const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');
  
  const authEmail = `auth-vote-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: authEmail, handle: `auth${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(authEmail)}`, hashOtp('111111'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: authEmail, otp: '111111' });
  const login_1 = await request(app).post('/api/v1/auth/login').send({ email: authEmail, password: 'Password123!' });
  authorCookies = login_1.headers['set-cookie'];

  const voterEmail = `voter-vote-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: voterEmail, handle: `voter${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(voterEmail)}`, hashOtp('222222'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: voterEmail, otp: '222222' });
  const login_2 = await request(app).post('/api/v1/auth/login').send({ email: voterEmail, password: 'Password123!' });
  voterCookies = login_2.headers['set-cookie'];

  const slug = `vote-comm-${ts}`;
  const commRes = await request(app).post('/api/v1/communities').set('Cookie', authorCookies).send({ slug, name: 'Vote Comm' });
  communityId = commRes.body.data.id;

  const postRes = await request(app).post('/api/v1/posts').set('Cookie', authorCookies).send({ communityId, title: 'Vote Post', bodyMarkdown: 'Test' });
  postId = postRes.body.data.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('Votes Module', () => {
  it('1. should upvote a post', async () => {
    const res = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', voterCookies)
      .send({ targetType: 'POST', targetId: postId, value: 1 });
      
    expect(res.status).toBe(200);

    const post = await prisma.post.findUnique({ where: { id: postId } });
    expect(post.upvotes).toBe(1);
    expect(post.downvotes).toBe(0);
    expect(post.voteScore).toBe(1);
  });

  it('2. should change upvote to downvote', async () => {
    const res = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', voterCookies)
      .send({ targetType: 'POST', targetId: postId, value: -1 });
      
    expect(res.status).toBe(200);

    const post = await prisma.post.findUnique({ where: { id: postId } });
    expect(post.upvotes).toBe(0);
    expect(post.downvotes).toBe(1);
    expect(post.voteScore).toBe(-1);
  });

  it('3. should remove vote', async () => {
    const res = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', voterCookies)
      .send({ targetType: 'POST', targetId: postId, value: 0 });
      
    expect(res.status).toBe(200);

    const post = await prisma.post.findUnique({ where: { id: postId } });
    expect(post.upvotes).toBe(0);
    expect(post.downvotes).toBe(0);
    expect(post.voteScore).toBe(0);
    
    const votes = await prisma.vote.findMany({ where: { postId } });
    expect(votes.length).toBe(0);
  });
});
