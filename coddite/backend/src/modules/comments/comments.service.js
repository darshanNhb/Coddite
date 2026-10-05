import { v7 as uuidv7 } from 'uuid';

import { writeAuditLog } from '../../lib/auditLog.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';
import { serializeCommentTree } from '../../utils/serializers.js';

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
 */
export async function createComment(data, profileId) {
  const post = await prisma.post.findUnique({ where: { id: data.postId } });
  if (!post) throw new AppError(404, 'Post not found');
  if (post.status === 'LOCKED' || post.status === 'DELETED') {
    throw new AppError(403, 'Post is locked or deleted');
  }

  if (data.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
    if (!parent || parent.postId !== data.postId) {
      throw new AppError(400, 'Invalid parent comment');
    }
    if (parent.isLocked) throw new AppError(403, 'Parent comment is locked');
  }

  const commentId = uuidv7();

  let bodyMarkdown = data.bodyMarkdown;
  let deletedAt = null;
  let removedReason = null;
  let toxicityScore = null;

  try {
    const ml = await import('../../lib/ml.js');
    const toxResult = await ml.toxicity.classify(data.bodyMarkdown);
    toxicityScore = toxResult.score;
    const policy = ml.applyModerationPolicy(toxResult);
    
    if (policy.decision === 'HIDE') {
      deletedAt = new Date();
      bodyMarkdown = '[removed by automod]';
      removedReason = policy.reason;
    }
  } catch (err) {
    logger.error('Comment ML Processing Error:', err);
  }

  const comment = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        id: commentId,
        postId: data.postId,
        parentId: data.parentId || null,
        authorId: profileId,
        bodyMarkdown: bodyMarkdown,
        deletedAt: deletedAt,
        removedReason: removedReason
      }
    });

    if (toxicityScore && toxicityScore >= 0.65 && !deletedAt) {
      await tx.report.create({
        data: {
          id: uuidv7(),
          reporterId: null, // System report
          source: 'AI_MODERATION',
          communityId: post.communityId,
          targetType: 'COMMENT',
          commentId: commentId,
          reason: 'AUTO_MODERATION',
          details: `Flagged by toxicity classifier. Score: ${toxicityScore.toFixed(2)}`
        }
      });
    }

    await tx.post.update({
      where: { id: data.postId },
      data: { commentCount: { increment: 1 } }
    });

    await tx.profile.update({
      where: { id: profileId },
      data: { commentCount: { increment: 1 } }
    });

    return c;
  });

  try {
    const { invalidatePost } = await import('../../lib/cache.js');
    await invalidatePost(data.postId);
  } catch (err) {
    logger.error('Cache invalidation error:', err);
  }

  // Emit live update to anyone on the post page
  try {
    const { emitToPost, emitToProfile } = await import('../../lib/socket.js');
    const authorProfile = await prisma.profile.findUnique({ where: { id: profileId } });
    
    // Broadcast live comment update
    emitToPost(data.postId, 'new_comment', {
      ...comment,
      author: authorProfile
    });

    // Send notifications
    const { sendNotification } = await import('../../utils/notifications.js');

    if (data.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
      if (parent && parent.authorId !== profileId) {
        await sendNotification(
          parent.authorId,
          'NEW_REPLY',
          'New Reply',
          `${authorProfile.handle} replied to your comment.`,
          `/posts/${data.postId}`
        );
      }
    } else {
      if (post.authorId !== profileId) {
        await sendNotification(
          post.authorId,
          'NEW_COMMENT',
          'New Comment',
          `${authorProfile.handle} commented on your post.`,
          `/posts/${data.postId}`
        );
      }
    }
  } catch (err) {
    logger.error('Socket notification error:', err);
  }

  return comment;
}

/**
 *
 * @param postId
 * @param cursor
 * @param limit
 * @param profileId
 * @param globalRole
 */
export async function listComments(postId, cursor, limit = 50, profileId = null, globalRole = null) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { community: true }
  });
  if (!post) throw new AppError(404, 'Post not found');
  
  if (post.community.isPrivate && globalRole !== 'ADMIN') {
    if (!profileId) throw new AppError(403, 'Forbidden: Private community');
    const isMember = await prisma.communityMember.findUnique({
      where: { communityId_profileId: { communityId: post.communityId, profileId } }
    });
    if (!isMember) throw new AppError(403, 'Forbidden: Private community');
  }

  const args = {
    where: { postId, deletedAt: null },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { author: { include: { user: { select: { status: true } } } } }
  };

  if (cursor) {
    args.cursor = { id: cursor };
    args.skip = 1;
  }

  const comments = await prisma.comment.findMany(args);
  
  let nextCursor = null;
  if (comments.length === limit) {
    nextCursor = comments[comments.length - 1].id;
  }

  let serialized = serializeCommentTree(comments);

  if (profileId) {
    const { getBlockedIds, filterBlockedComments } = await import('../../utils/blocks.js');
    const blockedIds = await getBlockedIds(profileId);
    serialized = filterBlockedComments(serialized, blockedIds);
  }

  return { comments: serialized, nextCursor };
}

/**
 *
 * @param id
 * @param data
 * @param profileId
 * @param globalRole
 */
export async function updateComment(id, data, profileId, globalRole) {
  const comment = await prisma.comment.findUnique({ 
    where: { id },
    include: { post: true }
  });
  
  if (!comment) throw new AppError(404, 'Comment not found');
  if (comment.deletedAt) throw new AppError(410, 'Comment is deleted');

  const isAuthor = comment.authorId === profileId;
  const isMod = await checkPermission(comment.post.communityId, profileId, globalRole);

  if (!isAuthor && !isMod) {
    throw new AppError(403, 'Forbidden');
  }

  const updated = await prisma.comment.update({
    where: { id },
    data
  });

  try {
    const { invalidatePost } = await import('../../lib/cache.js');
    await invalidatePost(updated.postId);
  } catch (err) {
    logger.error('Cache invalidation error:', err);
  }

  return updated;
}

/**
 *
 * @param id
 * @param removedReason
 * @param profileId
 * @param globalRole
 */
export async function deleteComment(id, removedReason, profileId, globalRole) {
  const comment = await prisma.comment.findUnique({ 
    where: { id },
    include: { post: true }
  });
  
  if (!comment) throw new AppError(404, 'Comment not found');

  const isAuthor = comment.authorId === profileId;
  const isMod = await checkPermission(comment.post.communityId, profileId, globalRole);

  if (!isAuthor && !isMod) {
    throw new AppError(403, 'Forbidden');
  }

  // Soft delete logic: hide content but keep threading (often reddit leaves a "[deleted]" stub)
  // For this we will just mark deletedAt and set body to "[deleted]".
  const updatedComment = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        bodyMarkdown: '[deleted]',
        removedReason: isMod && !isAuthor ? removedReason : null
      }
    });

    // Decrement commentCount on Post and Profile
    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } }
    });
    await tx.profile.update({
      where: { id: comment.authorId },
      data: { commentCount: { decrement: 1 } }
    });

    return c;
  });

  try {
    const { invalidatePost } = await import('../../lib/cache.js');
    await invalidatePost(comment.postId);
  } catch (err) {
    logger.error('Cache invalidation error:', err);
  }

  if (isMod && !isAuthor) {
    await writeAuditLog({
      actorId: profileId,
      action: 'comment.delete',
      targetType: 'COMMENT',
      targetId: id,
      communityId: comment.post.communityId,
      reason: removedReason,
    });
  }

  return updatedComment;
}
