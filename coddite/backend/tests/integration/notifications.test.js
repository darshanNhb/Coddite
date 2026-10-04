import request from 'supertest';
import { v7 as uuidv7 } from 'uuid';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import * as socketHelpers from '../../src/lib/socket.js';
import { generateTokens } from '../../src/modules/auth/auth.service.js';

vi.mock('../../src/lib/socket.js', () => ({
  emitToProfile: vi.fn(),
  emitToPost: vi.fn(),
  getIO: vi.fn(),
  initSocket: vi.fn(),
}));

vi.mock('../../src/lib/ml.js', () => ({
  toxicity: {
    classify: vi.fn().mockResolvedValue({ score: 0.1 }),
  },
  applyModerationPolicy: vi.fn().mockReturnValue({ decision: 'ALLOW' }),
  embeddings: {
    embed: vi.fn().mockResolvedValue({ vector: new Array(768).fill(0.1) }),
  }
}));

const app = createApp();

describe('Notifications & Karma Milestones (Integration)', () => {
  let user1, profile1, token1;
  let user2, profile2, token2;
  let community, post;

  beforeEach(async () => {
    vi.clearAllMocks();

    user1 = await prisma.user.create({
      data: {
        id: uuidv7(),
        emailHash: `hash1-${uuidv7()}`,
        emailCiphertext: 'cipher1',
        emailKeyId: 'v1',
        profile: {
          create: { id: uuidv7(), handle: `user1-${uuidv7().slice(-8)}` }
        }
      },
      include: { profile: true }
    });
    profile1 = user1.profile;
    token1 = (await generateTokens(user1, '127.0.0.1', 'test')).accessToken;

    user2 = await prisma.user.create({
      data: {
        id: uuidv7(),
        emailHash: `hash2-${uuidv7()}`,
        emailCiphertext: 'cipher2',
        emailKeyId: 'v1',
        profile: {
          create: { id: uuidv7(), handle: `user2-${uuidv7().slice(-8)}` }
        }
      },
      include: { profile: true }
    });
    profile2 = user2.profile;
    token2 = (await generateTokens(user2, '127.0.0.1', 'test')).accessToken;

    community = await prisma.community.create({
      data: {
        id: uuidv7(),
        slug: `notif-test-${uuidv7().slice(-8)}`,
        name: 'Notif Test',
        description: 'Testing',
        createdById: profile1.id
      }
    });

    post = await prisma.post.create({
      data: {
        id: uuidv7(),
        communityId: community.id,
        authorId: profile1.id,
        title: 'Notification Post',
        bodyMarkdown: 'Content',
        status: 'PUBLISHED'
      }
    });
  });

  it('should create and emit a NEW_COMMENT notification when another user comments', async () => {
    const res = await request(app)
      .post('/api/v1/comments')
      .set('Cookie', [`accessToken=${token2}`])
      .send({ postId: post.id, bodyMarkdown: 'Great post!' });

    expect(res.status).toBe(201);
    
    // Check DB
    const notifs = await prisma.notification.findMany({
      where: { profileId: profile1.id }
    });
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe('NEW_COMMENT');

    // Check Socket
    expect(socketHelpers.emitToProfile).toHaveBeenCalledWith(
      profile1.id,
      'notification',
      expect.objectContaining({ type: 'NEW_COMMENT' })
    );
  });

  it('should trigger karma-milestone notification exactly at thresholds (e.g. 10)', async () => {
    // Manually set profile2 karma to 9
    await prisma.profile.update({
      where: { id: profile2.id },
      data: { karma: 9 }
    });

    // Create a comment by user2 to vote on
    const comment = await prisma.comment.create({
      data: {
        id: uuidv7(),
        postId: post.id,
        authorId: profile2.id,
        bodyMarkdown: 'Test comment'
      }
    });

    // User1 upvotes User2's comment (Karma 9 -> 10)
    await request(app)
      .post('/api/v1/votes')
      .set('Cookie', [`accessToken=${token1}`])
      .send({ targetType: 'COMMENT', targetId: comment.id, value: 1 });

    let notifs = await prisma.notification.findMany({
      where: { profileId: profile2.id, type: 'KARMA_MILESTONE' }
    });
    expect(notifs).toHaveLength(1);
    expect(notifs[0].message).toContain('10');
    expect(socketHelpers.emitToProfile).toHaveBeenCalledWith(
      profile2.id,
      'notification',
      expect.objectContaining({ type: 'KARMA_MILESTONE' })
    );

    // Another upvote (Karma 10 -> 11) - should NOT trigger another milestone
    const user3 = await prisma.user.create({
      data: {
        id: uuidv7(),
        emailHash: `hash3-${uuidv7()}`,
        emailCiphertext: 'cipher3',
        emailKeyId: 'v1',
        profile: { create: { id: uuidv7(), handle: `user3-${uuidv7().slice(-8)}` } }
      },
      include: { profile: true }
    });
    const token3 = (await generateTokens(user3, '127.0.0.1', 'test')).accessToken;

    vi.clearAllMocks();
    
    await request(app)
      .post('/api/v1/votes')
      .set('Cookie', [`accessToken=${token3}`])
      .send({ targetType: 'COMMENT', targetId: comment.id, value: 1 });

    notifs = await prisma.notification.findMany({
      where: { profileId: profile2.id, type: 'KARMA_MILESTONE' }
    });
    
    // Still 1 notification
    expect(notifs).toHaveLength(1);
    expect(socketHelpers.emitToProfile).not.toHaveBeenCalled();
  });
});
