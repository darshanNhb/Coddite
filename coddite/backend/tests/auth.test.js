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

describe('Signup and Auth Flow', () => {
  const testEmail = `test-${ts}@example.com`;
  const testHandle = `user${ts}`;
  const testPassword = 'Password123!';
  let cookies = [];

  it('1. should signup and send verification OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: testEmail, handle: testHandle, password: testPassword });
      
    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Verification code sent to your email.');
  }, 10000);

  it('2. should verify signup OTP and set cookies', async () => {
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');
    const hashedEmail = hashEmail(testEmail);
    const mockOtp = '123456';
    const hashedOtp = hashOtp(mockOtp);
    await redis.set(`otp:signup:${hashedEmail}`, hashedOtp, 'EX', 600);

    const res = await request(app)
      .post('/api/v1/auth/signup/verify')
      .send({ email: testEmail, otp: mockOtp });
      
    expect(res.status).toBe(201);
    expect(res.body.data.profile.handle).toBe(testHandle);
    
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.some(c => c.includes('accessToken=') && c.includes('HttpOnly'))).toBe(true);
    expect(setCookie.some(c => c.includes('refreshToken=') && c.includes('HttpOnly'))).toBe(true);
  });

  it('3. should login with email and password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });
      
    expect(res.status).toBe(200);
    expect(res.body.data.profile.handle).toBe(testHandle);
    
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    cookies = setCookie;
  });

  it('4. should fetch /me with the access token cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookies);
      
    expect(res.status).toBe(200);
    expect(res.body.data.profile.handle).toBe(testHandle);
  });

  it('5. should request password reset', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: testEmail });
      
    expect(res.status).toBe(200);
  });

  it('6. should verify password reset OTP and set new password', async () => {
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');
    const hashedEmail = hashEmail(testEmail);
    const mockOtp = '654321';
    const hashedOtp = hashOtp(mockOtp);
    await redis.set(`otp:password-reset:${hashedEmail}`, hashedOtp, 'EX', 600);

    const res = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: testEmail, otp: mockOtp, newPassword: 'NewPassword123!' });
      
    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Password has been reset. Please log in.');
    
    // Test login with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'NewPassword123!' });
      
    expect(loginRes.status).toBe(200);
  });

  it('7. should refresh tokens and detect family-wide reuse', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);
      
    // Because step 6 revoked all tokens on reset, the old cookies should fail!
    // Using a revoked token triggers reuse detection (403)
    expect(res.status).toBe(403);

    // Login again to get fresh tokens
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'NewPassword123!' });
    
    const freshCookies = loginRes.headers['set-cookie'];

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', freshCookies);
      
    expect(refreshRes.status).toBe(200);
    const newCookies = refreshRes.headers['set-cookie'];
    
    // Reuse detection: Try OLD refresh token
    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', freshCookies);
      
    expect(reuseRes.status).toBe(403);

    // Verify NEW legitimate token in same family is ALSO revoked
    const legitRefreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', newCookies);

    expect(legitRefreshRes.status).toBe(403);
  });

  it('8. should logout', async () => {
    // Login to get a valid token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'NewPassword123!' });
      
    const activeCookies = loginRes.headers['set-cookie'];
    
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', activeCookies);
      
    expect(logoutRes.status).toBe(200);
    
    const clearCookies = logoutRes.headers['set-cookie'];
    expect(clearCookies.some(c => c.startsWith('accessToken=;') || c.includes('Expires=Thu, 01 Jan 1970'))).toBe(true);
  });

  it('9. should allow password reset for a legacy account with NULL passwordHash', async () => {
    const { hashEmail, hashOtp, encryptEmail } = await import('../src/lib/crypto.js');
    const legacyEmail = `legacy-${ts}@example.com`;
    const hashedEmail = hashEmail(legacyEmail);
    const mockOtp = '987654';
    const hashedOtp = hashOtp(mockOtp);

    // 1. Manually create a user with passwordHash: null
    const { v7: uuidv7 } = await import('uuid');
    await prisma.user.create({
      data: {
        id: uuidv7(),
        emailHash: hashedEmail,
        emailCiphertext: encryptEmail(legacyEmail),
        emailKeyId: 'v1',
        passwordHash: null,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            id: uuidv7(),
            handle: `legacyuser${ts}`,
          }
        }
      }
    });

    // 2. Request forgot password
    const reqRes = await request(app)
      .post('/api/v1/auth/password/forgot')
      .send({ email: legacyEmail });
    expect(reqRes.status).toBe(200);

    // Seed Redis with OTP
    await redis.set(`otp:password-reset:${hashedEmail}`, hashedOtp, 'EX', 600);

    // 3. Reset password
    const newPassword = 'SetFirstPassword123!';
    const resetRes = await request(app)
      .post('/api/v1/auth/password/reset')
      .send({ email: legacyEmail, otp: mockOtp, newPassword });
    expect(resetRes.status).toBe(200);

    // 4. Confirm login works with new password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: legacyEmail, password: newPassword });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.profile.handle).toBe(`legacyuser${ts}`);
  });

  it('10. should prevent email change if email is taken between request and verify (race condition)', async () => {
    // 1. Create original user
    const originalEmail = `orig-${ts}@example.com`;
    const origHandle = `orig${ts}`;
    const origPassword = 'Password123!';

    await request(app).post('/api/v1/auth/signup').send({ email: originalEmail, handle: origHandle, password: origPassword });
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');
    await redis.set(`otp:signup:${hashEmail(originalEmail)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: originalEmail, otp: '123456' });
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: originalEmail, password: origPassword });
    const origCookies = loginRes.headers['set-cookie'];
    const origUserId = loginRes.body.data.profile.userId;

    // 2. Request email change
    const newEmail = `new-${ts}@example.com`;
    await request(app).post('/api/v1/auth/email/change').set('Cookie', origCookies).send({ newEmail });
    
    // We need the OTP. Our test helper doesn't easily expose it since it's generated randomly.
    // Instead, we will directly seed Redis with a known OTP just for the email change verify step.
    const mockChangeOtp = '111111';
    const { encryptEmail } = await import('../src/lib/crypto.js');
    const data = JSON.stringify({ 
      otp: hashOtp(mockChangeOtp), 
      emailHash: hashEmail(newEmail), 
      emailCiphertext: encryptEmail(newEmail) 
    });
    await redis.set(`otp:email-change:${origUserId}`, data, 'EX', 600);

    // 3. Race condition: Another user signs up with `newEmail`
    await request(app).post('/api/v1/auth/signup').send({ email: newEmail, handle: `racer${ts}`, password: origPassword });
    await redis.set(`otp:signup:${hashEmail(newEmail)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email: newEmail, otp: '123456' });

    // 4. Original user tries to verify the email change
    const verifyRes = await request(app)
      .post('/api/v1/auth/email/verify')
      .set('Cookie', origCookies)
      .send({ otp: mockChangeOtp });

    // 5. Must be 409 conflict
    expect(verifyRes.status).toBe(409);
    expect(verifyRes.body.error).toBe('This email was just taken by another account.');
  });

  it('11. should delete account and preserve content with deleted author', async () => {
    // 1. Setup user and get tokens
    const email = `delete-me-${ts}@example.com`;
    const handle = `delete-me-${ts}`;
    const password = 'Password123!';

    await request(app).post('/api/v1/auth/signup').send({ email, handle, password });
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');
    await redis.set(`otp:signup:${hashEmail(email)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email, otp: '123456' });
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });
    const cookies = loginRes.headers['set-cookie'];
    const profileId = loginRes.body.data.profile.id;

    // 2. Create a community and a post
    const commRes = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', cookies)
      .send({ name: `Delete Comm ${ts}`, slug: `del-comm-${ts}`, description: 'Test' });
    expect(commRes.status).toBe(201);
    const commId = commRes.body.data.id;

    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Cookie', cookies)
      .send({ communityId: commId, title: 'My Final Post', bodyMarkdown: 'Goodbye world!' });
    expect(postRes.status).toBe(201);
    const postId = postRes.body.data.id;

    // 3. Delete account
    const delRes = await request(app)
      .post('/api/v1/auth/account/delete')
      .set('Cookie', cookies)
      .send({ password });
    expect(delRes.status).toBe(200);

    // 4. Verify user can't login
    const loginAttempt = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(loginAttempt.status).toBe(401); // "Invalid email or password." or "Account is suspended or deleted."

    // 5. Verify post still exists and author handle starts with "deleted-"
    const fetchPost = await request(app).get(`/api/v1/posts/${postId}`);
    expect(fetchPost.status).toBe(200);
    expect(fetchPost.body.data.title).toBe('My Final Post');
    expect(fetchPost.body.data.author.isDeleted).toBe(true);
  });

  it('12. should handle a normal user choosing a handle that starts with "deleted-" without anonymizing them', async () => {
    const email = `deleted-fan-${ts}@example.com`;
    const handle = `deleted-fan-${ts}`;
    const password = 'Password123!';

    // Signup
    await request(app).post('/api/v1/auth/signup').send({ email, handle, password });
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');
    await redis.set(`otp:signup:${hashEmail(email)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email, otp: '123456' });

    // Login
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];

    // Create a community and post
    const commRes = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', cookies)
      .send({ name: `Fan Comm ${ts}`, slug: `fan-comm-${ts}`, description: 'Test' });
    const commId = commRes.body.data.id;

    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Cookie', cookies)
      .send({ communityId: commId, title: 'I love deleted stuff', bodyMarkdown: 'Yes!' });
    const postId = postRes.body.data.id;

    // Fetch the post
    const fetchPost = await request(app).get(`/api/v1/posts/${postId}`);
    expect(fetchPost.status).toBe(200);
    
    // Should NOT be marked as deleted despite the handle
    expect(fetchPost.body.data.author.isDeleted).toBe(false);
    expect(fetchPost.body.data.author.handle).toBe(handle);
  });
});
