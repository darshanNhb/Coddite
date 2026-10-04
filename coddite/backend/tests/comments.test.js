import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/redis.js';

let app;
let authorCookies = [];
let otherCookies = [];
let modCookies = [];
let communityId;
let postId;
let parentCommentId;
let childCommentId;
const ts = Date.now();

beforeAll(async () => {
  app = createApp();
  const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

  const modEmail = `mod-comm-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: modEmail, handle: `modc${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(modEmail)}`, hashOtp('111111'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: modEmail, otp: '111111' });
  const modLogin = await request(app).post('/api/v1/auth/login').send({ email: modEmail, password: 'Password123!' });
  modCookies = modLogin.headers['set-cookie'];

  const authorEmail = `auth-comm-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: authorEmail, handle: `authc${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(authorEmail)}`, hashOtp('222222'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: authorEmail, otp: '222222' });
  const authLogin = await request(app).post('/api/v1/auth/login').send({ email: authorEmail, password: 'Password123!' });
  authorCookies = authLogin.headers['set-cookie'];

  const otherEmail = `other-comm-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: otherEmail, handle: `othc${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(otherEmail)}`, hashOtp('333333'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: otherEmail, otp: '333333' });
  const otherLogin = await request(app).post('/api/v1/auth/login').send({ email: otherEmail, password: 'Password123!' });
  otherCookies = otherLogin.headers['set-cookie'];

  const commRes = await request(app).post('/api/v1/communities').set('Cookie', modCookies).send({ slug: `comm-test-${ts}`, name: 'Comm Test' });
  communityId = commRes.body.data.id;

  const postRes = await request(app).post('/api/v1/posts').set('Cookie', authorCookies).send({ communityId, title: 'T', bodyMarkdown: 'B' });
  postId = postRes.body.data.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('Comments Module', () => {
  it('1. should create a top-level comment', async () => {
    const res = await request(app)
      .post('/api/v1/comments')
      .set('Cookie', authorCookies)
      .send({ postId, bodyMarkdown: 'Top level' });
      
    expect(res.status).toBe(201);
    expect(res.body.data.bodyMarkdown).toBe('Top level');
    parentCommentId = res.body.data.id;
  });

  it('2. should create a threaded child comment', async () => {
    const res = await request(app)
      .post('/api/v1/comments')
      .set('Cookie', otherCookies)
      .send({ postId, parentId: parentCommentId, bodyMarkdown: 'Child reply' });
      
    expect(res.status).toBe(201);
    expect(res.body.data.parentId).toBe(parentCommentId);
    childCommentId = res.body.data.id;
  });

  it('3. should list comments for a post', async () => {
    const res = await request(app).get(`/api/v1/comments?postId=${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it('4. should allow author to update comment', async () => {
    const res = await request(app)
      .patch(`/api/v1/comments/${parentCommentId}`)
      .set('Cookie', authorCookies)
      .send({ bodyMarkdown: 'Edited top level' });
      
    expect(res.status).toBe(200);
    expect(res.body.data.bodyMarkdown).toBe('Edited top level');
  });

  it('5. should allow MODERATOR to soft-delete comment', async () => {
    const res = await request(app)
      .delete(`/api/v1/comments/${childCommentId}`)
      .set('Cookie', modCookies)
      .send({ removedReason: 'Rule 1' });
      
    expect(res.status).toBe(200);
    
    const dbComment = await prisma.comment.findUnique({ where: { id: childCommentId } });
    expect(dbComment.deletedAt).toBeDefined();
    expect(dbComment.bodyMarkdown).toBe('[deleted]');
    expect(dbComment.removedReason).toBe('Rule 1');
  });

  it('6. should prevent unauthorized user from updating comment', async () => {
    const res = await request(app)
      .patch(`/api/v1/comments/${parentCommentId}`)
      .set('Cookie', otherCookies)
      .send({ bodyMarkdown: 'Hacked!' });
    expect(res.status).toBe(403);
  });

  it('7. should return 404 for non-existent comment', async () => {
    const res = await request(app)
      .patch('/api/v1/comments/00000000-0000-0000-0000-000000000000')
      .set('Cookie', authorCookies)
      .send({ bodyMarkdown: 'Hmm' });
    expect(res.status).toBe(404);
  });

  it('8. should prevent unauthorized user from deleting comment', async () => {
    const res = await request(app)
      .delete(`/api/v1/comments/${parentCommentId}`)
      .set('Cookie', otherCookies)
      .send({ removedReason: 'Rule 2' });
    expect(res.status).toBe(403);
  });
});
