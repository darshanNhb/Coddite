import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/redis.js';

let app;
let authorCookies = [];
let modCookies = [];
let randomCookies = [];
let communityId;
let postId;
const ts = Date.now();

beforeAll(async () => {
  app = createApp();
  const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

  const modEmail = `mod-post-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: modEmail, handle: `modp${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(modEmail)}`, hashOtp('111111'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: modEmail, otp: '111111' });
  const modLogin = await request(app).post('/api/v1/auth/login').send({ email: modEmail, password: 'Password123!' });
  modCookies = modLogin.headers['set-cookie'];

  const authorEmail = `author-post-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: authorEmail, handle: `authp${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(authorEmail)}`, hashOtp('222222'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: authorEmail, otp: '222222' });
  const authorLogin = await request(app).post('/api/v1/auth/login').send({ email: authorEmail, password: 'Password123!' });
  authorCookies = authorLogin.headers['set-cookie'];

  const randomEmail = `random-post-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: randomEmail, handle: `randp${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(randomEmail)}`, hashOtp('333333'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: randomEmail, otp: '333333' });
  const randomLogin = await request(app).post('/api/v1/auth/login').send({ email: randomEmail, password: 'Password123!' });
  randomCookies = randomLogin.headers['set-cookie'];

  const commRes = await request(app)
    .post('/api/v1/communities')
    .set('Cookie', modCookies)
    .send({ slug: `post-test-${ts}`, name: 'Post Test Comm' });
  communityId = commRes.body.data.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('Posts Module', () => {
  it('1. should create a post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Cookie', authorCookies)
      .send({
        communityId,
        title: 'First Post',
        bodyMarkdown: 'Hello world',
        tags: ['welcome', 'test']
      });
      
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('First Post');
    postId = res.body.data.id;
  });

  it('2. should list posts by community id', async () => {
    const res = await request(app).get(`/api/v1/posts?communityId=${communityId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.nextCursor).toBeNull();
  });

  it('3. should update a post if author', async () => {
    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set('Cookie', authorCookies)
      .send({ title: 'Updated Title' });
      
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
  });

  it('4. should prevent random user from updating post', async () => {
    const res = await request(app)
      .patch(`/api/v1/posts/${postId}`)
      .set('Cookie', randomCookies)
      .send({ title: 'Hacked Title' });
      
    expect(res.status).toBe(403);
  });

  it('6. should get global hot feed', async () => {
    const res = await request(app).get('/api/v1/feed');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('7. should accept answer', async () => {
    // 1. Create a comment
    const commentRes = await request(app)
      .post('/api/v1/comments')
      .set('Cookie', randomCookies)
      .send({ postId, bodyMarkdown: 'This is the answer' });
    const commentId = commentRes.body.data.id;

    // 2. Accept answer
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/accept-answer`)
      .set('Cookie', authorCookies)
      .send({ commentId });
    expect(res.status).toBe(200);
    expect(res.body.data.isSolved).toBe(true);
    expect(res.body.data.acceptedCommentId).toBe(commentId);
  });

  it('8. should get similar posts', async () => {
    const res = await request(app).get('/api/v1/posts/similar?text=hello');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('9. should suggest tags', async () => {
    const res = await request(app)
      .post('/api/v1/posts/tags/suggest')
      .set('Cookie', authorCookies)
      .send({ text: 'How do I center a div?' });
    expect(res.status).toBe(200);
  });

  it('9.5. should return 400 if text is missing for suggest tags', async () => {
    const res = await request(app)
      .post('/api/v1/posts/tags/suggest')
      .set('Cookie', authorCookies)
      .send({});
    expect(res.status).toBe(400);
  });

  it('10. should prevent random user from accepting answer', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/accept-answer`)
      .set('Cookie', modCookies)
      .send({ commentId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
  });

  it('10.5. should return 400 if commentId is missing for accept answer', async () => {
    const res = await request(app)
      .post(`/api/v1/posts/${postId}/accept-answer`)
      .set('Cookie', authorCookies)
      .send({});
    expect(res.status).toBe(400);
  });

  it('11. should allow MODERATOR to delete post with reason', async () => {
    const res = await request(app)
      .delete(`/api/v1/posts/${postId}`)
      .set('Cookie', modCookies)
      .send({ removedReason: 'Spam' });
      
    expect(res.status).toBe(200);
    
    const fetchRes = await request(app).get(`/api/v1/posts/${postId}`);
    expect(fetchRes.status).toBe(410);
    
    const dbPost = await prisma.post.findUnique({ where: { id: postId } });
    expect(dbPost.deletedAt).toBeDefined();
    expect(dbPost.removedReason).toBe('Spam');
    expect(dbPost.status).toBe('DELETED');
  });

  it('12. should return 404 for non-existent post', async () => {
    const res = await request(app).get('/api/v1/posts/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('13. should return 400 if text is missing for similar posts', async () => {
    const res = await request(app).get('/api/v1/posts/similar');
    expect(res.status).toBe(400);
  });
});
