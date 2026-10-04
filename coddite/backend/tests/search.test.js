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

describe('Search API', () => {
  const email = `search-user-${ts}@example.com`;
  const handle = `searcher${ts}`;
  const password = 'Password123!';
  let cookies = [];
  let profileId;
  let commId;
  let postsCreated = [];

  it('1. Setup user, community, and multiple posts', async () => {
    await request(app).post('/api/v1/auth/signup').send({ email, handle, password });
    const { hashEmail, hashOtp } = await import('../src/lib/crypto.js');
    await redis.set(`otp:signup:${hashEmail(email)}`, hashOtp('123456'), 'EX', 600);
    await request(app).post('/api/v1/auth/signup/verify').send({ email, otp: '123456' });

    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password });
    cookies = loginRes.headers['set-cookie'];
    profileId = loginRes.body.data.profile.id;

    const commRes = await request(app)
      .post('/api/v1/communities')
      .set('Cookie', cookies)
      .send({ name: `Search Comm ${ts}`, slug: `search-comm-${ts}`, description: 'Test search' });
    commId = commRes.body.data.id;

    // Create 4 posts for testing search
    // 1: Highest rank (test in title and body)
    // 2: Medium rank (test in body only)
    // 3: Hidden post (should not appear)
    // 4: Another test post to test deduplication and pagination
    const p1 = await request(app).post('/api/v1/posts').set('Cookie', cookies).send({
      communityId: commId,
      title: `Amazing test post ${ts}`,
      bodyMarkdown: `This post is a great test for our test suite ${ts}.`
    });
    
    const p2 = await request(app).post('/api/v1/posts').set('Cookie', cookies).send({
      communityId: commId,
      title: `Irrelevant title ${ts}`,
      bodyMarkdown: 'But the body has the word test inside it.'
    });

    const p3 = await request(app).post('/api/v1/posts').set('Cookie', cookies).send({
      communityId: commId,
      title: `Hidden test post ${ts}`,
      bodyMarkdown: 'This test post should be hidden.'
    });
    await prisma.post.update({
      where: { id: p3.body.data.id },
      data: { status: 'HIDDEN' } // Hide it directly
    });

    const p4 = await request(app).post('/api/v1/posts').set('Cookie', cookies).send({
      communityId: commId,
      title: `Another test title ${ts}`,
      bodyMarkdown: 'Another body.'
    });

    postsCreated = [p1.body.data, p2.body.data, p3.body.data, p4.body.data];
  });

  it('2. should return search results ranked correctly and without duplicates', async () => {
    const res = await request(app).get(`/api/v1/search?q=${ts}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    
    const posts = res.body.data;
    
    // Check no duplicates by making a Set of IDs
    const ids = posts.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Verify hidden post is NOT present
    const hiddenPost = posts.find(p => p.title === `Hidden test post ${ts}`);
    expect(hiddenPost).toBeUndefined();

    // "Amazing test post" should be first because it has 'test' in both title and body
    expect(posts[0].title).toBe(`Amazing test post ${ts}`);
  });

  it('3. should support pagination with cursor/limit', async () => {
    // Page 1 (limit 2)
    const page1 = await request(app).get(`/api/v1/search?q=${ts}&limit=2`).set('Cookie', cookies);
    expect(page1.status).toBe(200);
    expect(page1.body.data.length).toBe(2);
    expect(page1.body.meta.nextCursor).not.toBeNull();
    
    // Page 2 (offset 2)
    const page2 = await request(app).get(`/api/v1/search?q=${ts}&limit=2&cursor=${page1.body.meta.nextCursor}`).set('Cookie', cookies);
    expect(page2.status).toBe(200);
    expect(page2.body.data.length).toBeGreaterThan(0); // at least 1 remaining
    
    // Ensure page1 and page2 have distinct posts
    const page1Ids = page1.body.data.map(p => p.id);
    const page2Ids = page2.body.data.map(p => p.id);
    const intersection = page1Ids.filter(id => page2Ids.includes(id));
    expect(intersection.length).toBe(0);
  });

  it('4. should filter by scope', async () => {
    const res = await request(app).get(`/api/v1/search?q=${ts}&scope=search-comm-${ts}`).set('Cookie', cookies);
    expect(res.status).toBe(200);
    
    const posts = res.body.data;
    // all returned posts must belong to the scope
    for (const post of posts) {
      expect(post.community.slug).toBe(`search-comm-${ts}`);
    }
  });
});
