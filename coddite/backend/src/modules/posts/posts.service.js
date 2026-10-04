import { v7 as uuidv7 } from 'uuid';

import { writeAuditLog } from '../../lib/auditLog.js';
import { cacheGet, cacheKeys, invalidateCommunityFeed, invalidateGlobalHotFeed, invalidatePost } from '../../lib/cache.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';
import { serializePost } from '../../utils/serializers.js';

async function checkPermission(communityId, profileId, globalRole) {
  if (globalRole === 'ADMIN') return true;
  
  const membership = await prisma.communityMember.findUnique({
    where: { communityId_profileId: { communityId, profileId } }
  });
  
  return ['MODERATOR', 'OWNER'].includes(membership?.role);
}

/**
 *
 * @param data
 * @param profileId
 * @param globalRole
 */
export async function createPost(data, profileId, globalRole) {
  const community = await prisma.community.findUnique({ where: { id: data.communityId } });
  if (!community) throw new AppError(404, 'Community not found');

  const membership = await prisma.communityMember.findUnique({
    where: { communityId_profileId: { communityId: data.communityId, profileId } }
  });

  // Check posting policy
  if (community.postingPolicy === 'ADMIN_ONLY' && globalRole !== 'ADMIN') {
    if (!membership || !['OWNER', 'MODERATOR'].includes(membership.role)) {
      throw new AppError(403, 'Only admins and moderators can post here');
    }
  } else if (community.postingPolicy === 'MEMBERS_ONLY' && !membership && globalRole !== 'ADMIN') {
    throw new AppError(403, 'You must join the community to post');
  }

  const postId = uuidv7();

  // Process Tags
  const tagConnectOrCreate = (data.tags || []).map(tagName => {
    const t = tagName.toLowerCase();
    return {
      tag: {
        connectOrCreate: {
          where: { name: t },
          create: { id: uuidv7(), name: t }
        }
      }
    };
  });

  // Run AI checks (Toxicity & Embeddings)
  // In tests, we'd mock these, or initialize the fake providers.
  // For now we'll import from a central ml client instance.
  let toxicityScore = null;
  let status = 'PUBLISHED';
  let removedReason = null;
  let vectorString = null;
  
  try {
    const ml = await import('../../lib/ml.js');
    
    // 1. Toxicity
    const toxResult = await ml.toxicity.classify(data.title + '\n' + data.bodyMarkdown);
    toxicityScore = toxResult.score;
    const policy = ml.applyModerationPolicy(toxResult);
    
    if (policy.decision === 'HIDE') {
      status = 'HIDDEN';
      removedReason = policy.reason;
    } else if (policy.decision === 'REVIEW') {
      // We will create a report after post creation
    }
    
    // 2. Embeddings
    const embedResult = await ml.embeddings.embed(data.title + '\n' + data.bodyMarkdown);
    if (embedResult.vector) {
      vectorString = `[${embedResult.vector.join(',')}]`;
    }
  } catch (err) {
    logger.error('ML Processing Error:', err);
  }

  const post = await prisma.post.create({
    data: {
      id: postId,
      communityId: data.communityId,
      authorId: profileId,
      title: data.title,
      bodyMarkdown: data.bodyMarkdown,
      status: status,
      isNsfw: data.isNsfw,
      toxicityScore,
      removedReason,
      tags: { create: tagConnectOrCreate }
    }
  });
  
  if (vectorString) {
    // Update vector using raw SQL since Prisma doesn't natively support creating vectors in the standard payload
    await prisma.$executeRaw`UPDATE "posts" SET "embedding" = ${vectorString}::vector WHERE "id" = ${postId}::uuid`;
  }

  // Increment postCount
  await prisma.profile.update({
    where: { id: profileId },
    data: { postCount: { increment: 1 } }
  });

  if (toxicityScore && status !== 'HIDDEN' && toxicityScore >= 0.65) {
    // Review threshold hit (but not hide), create a report.
    await prisma.report.create({
      data: {
        id: uuidv7(),
        reporterId: null, // System report
        source: 'AI_MODERATION',
        communityId: data.communityId,
        targetType: 'POST',
        postId: postId,
        reason: 'AUTO_MODERATION',
        details: `Flagged by toxicity classifier. Score: ${toxicityScore.toFixed(2)}`
      }
    });
  }

  // Explicitly invalidate cached feeds for this community and global
  await invalidateCommunityFeed(data.communityId);
  await invalidateGlobalHotFeed();

  return post;
}

function buildSortArgs(sort, time) {
  let orderBy = { createdAt: 'desc' };
  let timeWhere = {};

  if (sort === 'hot') {
    orderBy = [{ voteScore: 'desc' }, { createdAt: 'desc' }];
  } else if (sort === 'top') {
    orderBy = [{ voteScore: 'desc' }, { createdAt: 'desc' }];
    if (time !== 'all') {
      const date = new Date();
      if (time === 'day') date.setDate(date.getDate() - 1);
      else if (time === 'week') date.setDate(date.getDate() - 7);
      else if (time === 'month') date.setMonth(date.getMonth() - 1);
      else if (time === 'year') date.setFullYear(date.getFullYear() - 1);
      timeWhere = { createdAt: { gte: date } };
    }
  }

  return { orderBy, timeWhere };
}

/**
 *
 * @param communityId
 * @param cursor
 * @param limit
 * @param profileId
 * @param globalRole
 * @param sort
 * @param time
 */
export async function listPosts(communityId, cursor, limit = 20, profileId = null, globalRole = null, sort = 'hot', time = 'all') {
  const community = await prisma.community.findUnique({ where: { id: communityId } });
  if (!community) throw new AppError(404, 'Community not found');
  
  if (community.isPrivate && globalRole !== 'ADMIN') {
    if (!profileId) throw new AppError(403, 'Forbidden: Private community');
    const isMember = await prisma.communityMember.findUnique({
      where: { communityId_profileId: { communityId, profileId } }
    });
    if (!isMember) throw new AppError(403, 'Forbidden: Private community');
  }

  const key = cacheKeys.communityFeed(communityId, cursor, sort, time);

  const cachedData = await cacheGet(key, async () => {
    const { orderBy, timeWhere } = buildSortArgs(sort, time);
    const args = {
      where: { communityId, status: 'PUBLISHED', deletedAt: null, ...timeWhere },
      take: limit,
      orderBy,
      include: { author: { include: { user: { select: { status: true } } } } }
    };

    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1;
    }

    const posts = await prisma.post.findMany(args);
    
    let nextCursor = null;
    if (posts.length === limit) {
      nextCursor = posts[posts.length - 1].id;
    }

    return { posts: posts.map(serializePost), nextCursor };
  });

  if (profileId) {
    const { getBlockedIds, filterBlockedPosts } = await import('../../utils/blocks.js');
    const blockedIds = await getBlockedIds(profileId);
    return {
      posts: filterBlockedPosts(cachedData.posts, blockedIds),
      nextCursor: cachedData.nextCursor
    };
  }
  
  return cachedData;
}

/**
 *
 * @param cursor
 * @param limit
 * @param sort
 * @param time
 * @param profileId
 */
export async function getGlobalFeed(cursor, limit = 20, sort = 'hot', time = 'all', profileId = null) {
  const key = cacheKeys.globalHotFeed(cursor, sort, time);

  const cachedData = await cacheGet(key, async () => {
    const { orderBy, timeWhere } = buildSortArgs(sort, time);
    const args = {
      where: { 
        status: 'PUBLISHED', 
        deletedAt: null,
        community: { isPrivate: false },
        ...timeWhere
      },
      take: limit,
      orderBy,
      include: { author: { include: { user: { select: { status: true } } } }, community: true }
    };

    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1;
    }

    const posts = await prisma.post.findMany(args);
    
    let nextCursor = null;
    if (posts.length === limit) {
      nextCursor = posts[posts.length - 1].id;
    }

    return { posts: posts.map(serializePost), nextCursor };
  });

  if (profileId) {
    const { getBlockedIds, filterBlockedPosts } = await import('../../utils/blocks.js');
    const blockedIds = await getBlockedIds(profileId);
    return {
      posts: filterBlockedPosts(cachedData.posts, blockedIds),
      nextCursor: cachedData.nextCursor
    };
  }
  
  return cachedData;
}

/**
 *
 * @param id
 * @param profileId
 * @param globalRole
 */
export async function getPost(id, profileId = null, globalRole = null) {
  const key = cacheKeys.post(id);

  const post = await cacheGet(key, async () => {
    const p = await prisma.post.findUnique({
      where: { id },
      include: { 
        author: { include: { user: { select: { status: true } } } }, 
        community: true, 
        tags: { include: { tag: true } },
        comments: {
          where: { deletedAt: null },
          include: { author: { include: { user: { select: { status: true } } } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!p) throw new AppError(404, 'Post not found');
    if (p.deletedAt) throw new AppError(410, 'Post has been deleted');
    return serializePost(p);
  });

  if (post.community.isPrivate) {
    if (globalRole !== 'ADMIN' && post.authorId !== profileId) {
      if (!profileId) throw new AppError(403, 'Forbidden: Private community');
      
      const isMember = await prisma.communityMember.findUnique({
        where: { communityId_profileId: { communityId: post.communityId, profileId } }
      });
      if (!isMember) throw new AppError(403, 'Forbidden: Private community');
    }
  }

  if (profileId) {
    const { getBlockedIds, filterBlockedComments } = await import('../../utils/blocks.js');
    const blockedIds = await getBlockedIds(profileId);
    
    if (blockedIds.has(post.author.id)) {
      throw new AppError(404, 'Post not found');
    }

    if (post.comments) {
      post.comments = filterBlockedComments(post.comments, blockedIds);
    }
  }

  return post;
}

/**
 *
 * @param id
 * @param data
 * @param profileId
 * @param globalRole
 */
export async function updatePost(id, data, profileId, globalRole) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new AppError(404, 'Post not found');
  if (post.deletedAt) throw new AppError(410, 'Post has been deleted');

  const isAuthor = post.authorId === profileId;
  const isMod = await checkPermission(post.communityId, profileId, globalRole);

  if (!isAuthor && !isMod) {
    throw new AppError(403, 'Forbidden');
  }

  const updated = await prisma.post.update({
    where: { id },
    data
  });

  await invalidatePost(id);
  await invalidateCommunityFeed(post.communityId);

  return updated;
}

/**
 *
 * @param id
 * @param removedReason
 * @param profileId
 * @param globalRole
 */
export async function deletePost(id, removedReason, profileId, globalRole) {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new AppError(404, 'Post not found');

  const isAuthor = post.authorId === profileId;
  const isMod = await checkPermission(post.communityId, profileId, globalRole);

  if (!isAuthor && !isMod) {
    throw new AppError(403, 'Forbidden');
  }

  const [deleted] = await prisma.$transaction([
    prisma.post.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        status: 'DELETED',
        removedReason: isMod && !isAuthor ? removedReason : null
      }
    }),
    prisma.profile.update({
      where: { id: post.authorId },
      data: { postCount: { decrement: 1 } }
    })
  ]);

  await invalidatePost(id);
  await invalidateCommunityFeed(post.communityId);
  await invalidateGlobalHotFeed();

  if (isMod && !isAuthor) {
    await writeAuditLog({
      actorId: profileId,
      action: 'post.delete',
      targetType: 'POST',
      targetId: id,
      communityId: post.communityId,
      reason: removedReason,
    });
    
    try {
      const { sendNotification } = await import('../../utils/notifications.js');
      await sendNotification(
        post.authorId,
        'POST_REMOVED',
        'Post Removed',
        `Your post in the community was removed: ${removedReason || 'No reason provided.'}`
      );
    } catch (err) {
      logger.error('Notification error:', err);
    }
  }

  return deleted;
}

/**
 *
 * @param text
 * @param limit
 */
export async function getSimilarPosts(text, limit = 5) {
  try {
    const ml = await import('../../lib/ml.js');
    const embedResult = await ml.embeddings.embed(text);
    if (!embedResult.vector) return [];

    const vectorString = `[${embedResult.vector.join(',')}]`;
    
    // Use pgvector cosine distance (<=>)
    const similar = await prisma.$queryRaw`
      SELECT id, title, "communityId", 1 - ("embedding" <=> ${vectorString}::vector) AS similarity
      FROM posts
      WHERE "embedding" IS NOT NULL
        AND status = 'PUBLISHED'
        AND "deletedAt" IS NULL
      ORDER BY "embedding" <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    return similar;
  } catch (err) {
    logger.error('Similar Posts Error:', err);
    return [];
  }
}

/**
 *
 * @param postId
 * @param commentId
 * @param profileId
 */
export async function acceptAnswer(postId, commentId, profileId) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError(404, 'Post not found');
  
  if (post.authorId !== profileId) {
    throw new AppError(403, 'Only the post author can accept an answer');
  }

  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.postId !== postId) {
    throw new AppError(404, 'Comment not found on this post');
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      isSolved: true,
      acceptedCommentId: commentId
    }
  });

  // Notify the comment author
  if (comment.authorId !== profileId) {
    try {
      const { sendNotification } = await import('../../utils/notifications.js');
      await sendNotification(
        comment.authorId,
        'ANSWER_ACCEPTED',
        'Answer Accepted',
        `Your comment was accepted as the answer on a post.`,
        `/p/${postId}`
      );
    } catch (err) {
      logger.error('Notification error:', err);
    }
  }

  await invalidatePost(postId);
  return updatedPost;
}

