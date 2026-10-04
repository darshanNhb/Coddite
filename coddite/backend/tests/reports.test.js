import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/redis.js';

let app;
let authorCookies = [];
let modCookies = [];
let userCookies = [];
let communityId;
let postId;
let reportId;
const ts = Date.now();

beforeAll(async () => {
  app = createApp();
  const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');

  const modEmail = `mod-report-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: modEmail, handle: `modr${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(modEmail)}`, hashOtp('111111'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: modEmail, otp: '111111' });
  const modLogin = await request(app).post('/api/v1/auth/login').send({ email: modEmail, password: 'Password123!' });
  modCookies = modLogin.headers['set-cookie'];

  const slug = `report-comm-${ts}`;
  const commRes = await request(app).post('/api/v1/communities').set('Cookie', modCookies).send({ slug, name: 'Report Comm' });
  communityId = commRes.body.data.id;

  const authEmail = `auth-report-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: authEmail, handle: `authr${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(authEmail)}`, hashOtp('222222'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: authEmail, otp: '222222' });
  const authLogin = await request(app).post('/api/v1/auth/login').send({ email: authEmail, password: 'Password123!' });
  authorCookies = authLogin.headers['set-cookie'];

  const postRes = await request(app).post('/api/v1/posts').set('Cookie', authorCookies).send({ communityId, title: 'Report Post', bodyMarkdown: 'Rule breaking content' });
  postId = postRes.body.data.id;

  const userEmail = `user-report-${ts}@example.com`;
  await request(app).post('/api/v1/auth/signup').send({ email: userEmail, handle: `userr${ts}`, password: 'Password123!' });
  await redis.set(`otp:signup:${hashEmail(userEmail)}`, hashOtp('333333'), 'EX', 600);
  await request(app).post('/api/v1/auth/signup/verify').send({ email: userEmail, otp: '333333' });
  const userLogin = await request(app).post('/api/v1/auth/login').send({ email: userEmail, password: 'Password123!' });
  userCookies = userLogin.headers['set-cookie'];
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});

describe('Reports & Moderation', () => {
  it('1. should allow a user to report a post', async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Cookie', userCookies)
      .send({ targetType: 'POST', targetId: postId, reason: 'Spam' });

    expect(res.status).toBe(201);
    expect(res.body.data.reason).toBe('Spam');
    expect(res.body.data.status).toBe('PENDING');
    reportId = res.body.data.id;
  });

  it('2. should allow moderator to list reports for their community', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/community/${communityId}`)
      .set('Cookie', modCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(reportId);
  });

  it('3. should prevent regular user from listing reports', async () => {
    const res = await request(app)
      .get(`/api/v1/reports/community/${communityId}`)
      .set('Cookie', userCookies);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Forbidden/);
  });

  it('4. should allow moderator to resolve a report by removing the post', async () => {
    const res = await request(app)
      .patch(`/api/v1/reports/${reportId}/resolve`)
      .set('Cookie', modCookies)
      .send({ resolution: 'removed', reason: 'Confirmed spam' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIONED');
    expect(res.body.data.resolution).toBe('removed');

    // Verify post was soft-deleted
    const post = await prisma.post.findUnique({ where: { id: postId } });
    expect(post.status).toBe('HIDDEN');
    expect(post.removedReason).toBe('Confirmed spam');
    expect(post.deletedAt).not.toBeNull();

    // Verify audit log was written
    const logs = await prisma.auditLog.findMany({ where: { reportId } });
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe('report.resolve');
  });

  it('5. should allow reporting a comment and resolving it', async () => {
    // Create a comment
    const commentRes = await request(app)
      .post('/api/v1/comments')
      .set('Cookie', userCookies)
      .send({ postId, bodyMarkdown: 'This comment is bad' });
    const commentId = commentRes.body.data.id;

    // Report it
    const repRes = await request(app)
      .post('/api/v1/reports')
      .set('Cookie', authorCookies)
      .send({ targetType: 'COMMENT', targetId: commentId, reason: 'Harassment' });
    expect(repRes.status).toBe(201);
    const newReportId = repRes.body.data.id;

    // Resolve it
    const resolveRes = await request(app)
      .patch(`/api/v1/reports/${newReportId}/resolve`)
      .set('Cookie', modCookies)
      .send({ resolution: 'removed', reason: 'Verified harassment' });
    expect(resolveRes.status).toBe(200);

    const dbComment = await prisma.comment.findUnique({ where: { id: commentId } });
    expect(dbComment.deletedAt).not.toBeNull();
    expect(dbComment.bodyMarkdown).toBe('[removed]');
  });

  it('6. should return 404 when reporting non-existent post', async () => {
    const res = await request(app)
      .post('/api/v1/reports')
      .set('Cookie', userCookies)
      .send({ targetType: 'POST', targetId: '00000000-0000-0000-0000-000000000000', reason: 'Spam' });
    expect(res.status).toBe(404);
  });
});
