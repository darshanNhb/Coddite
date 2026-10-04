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

describe('Rate Limiting', () => {
  it('should return 429 after exceeding Auth request limit', async () => {
    const keys = await redis.keys('rl:auth:*');
    if (keys.length > 0) await redis.del(...keys);

    const email = `rl-test-${ts}@example.com`;
    const ip = `192.168.1.${ts % 255}`;

    for (let i = 0; i < 20; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('x-test-rate-limit', 'true')
        .set('x-forwarded-for', ip)
        .send({ email });
      if (res.status === 429) {
        break; // Reached limit
      }
    }

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('x-test-rate-limit', 'true')
      .set('x-forwarded-for', ip)
      .send({ email });
      
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Too many requests/);
    expect(res.headers['x-ratelimit-remaining']).toBe('0');
  }, 30000);

  it('should include rate-limit headers on successful responses', async () => {
    const email = `rl-headers-${ts}@example.com`;
    const ip = `192.168.2.${ts % 255}`;

    const res = await request(app)
      .post('/api/v1/auth/signup/verify')
      .set('x-test-rate-limit', 'true')
      .set('x-forwarded-for', ip)
      .send({ email, otp: '000000' });
    
    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
  });
});
