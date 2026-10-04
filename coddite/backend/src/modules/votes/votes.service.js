import { v7 as uuidv7 } from 'uuid';

import { invalidateCommunityFeed, invalidateGlobalHotFeed, invalidatePost } from '../../lib/cache.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';

/**
 *
 * @param profileId
 * @param data
 */
export async function castVote(profileId, data) {
  const isPost = data.targetType === 'POST';
  const targetWhere = isPost ? { postId: data.targetId } : { commentId: data.targetId };

  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify target exists
    if (isPost) {
      const post = await tx.post.findUnique({ where: { id: data.targetId } });
      if (!post || post.status === 'DELETED') throw new AppError(404, 'Post not found');
    } else {
      const comment = await tx.comment.findUnique({ where: { id: data.targetId } });
      if (!comment || comment.deletedAt) throw new AppError(404, 'Comment not found');
    }

    // 2. Find existing vote
    const existingVote = await tx.vote.findUnique({
      where: isPost 
        ? { profileId_postId: { profileId, postId: data.targetId } }
        : { profileId_commentId: { profileId, commentId: data.targetId } }
    });

    const oldVal = existingVote ? existingVote.value : 0;
    const newVal = data.value;

    if (oldVal === newVal) {
      return { message: 'Vote unchanged' };
    }

    // Calculate diffs
    let upvoteDiff = 0;
    let downvoteDiff = 0;

    // Undo old vote
    if (oldVal === 1) upvoteDiff -= 1;
    if (oldVal === -1) downvoteDiff -= 1;

    // Apply new vote
    if (newVal === 1) upvoteDiff += 1;
    if (newVal === -1) downvoteDiff += 1;

    const voteScoreDiff = newVal - oldVal;

    // 3. Update or delete vote record
    if (newVal === 0 && existingVote) {
      await tx.vote.delete({ where: { id: existingVote.id } });
    } else if (existingVote) {
      await tx.vote.update({
        where: { id: existingVote.id },
        data: { value: newVal }
      });
    } else {
      await tx.vote.create({
        data: {
          id: uuidv7(),
          profileId,
          ...targetWhere,
          value: newVal
        }
      });
    }

    // 4. Update target score and author karma
    let targetAuthorId = null;
    let newScore = 0;
    
    if (isPost) {
      const updatedPost = await tx.post.update({
        where: { id: data.targetId },
        data: {
          upvotes: { increment: upvoteDiff },
          downvotes: { increment: downvoteDiff },
          voteScore: { increment: voteScoreDiff }
        }
      });
      targetAuthorId = updatedPost.authorId;
      newScore = updatedPost.voteScore;
    } else {
      const updatedComment = await tx.comment.update({
        where: { id: data.targetId },
        data: {
          upvotes: { increment: upvoteDiff },
          downvotes: { increment: downvoteDiff },
          voteScore: { increment: voteScoreDiff }
        }
      });
      targetAuthorId = updatedComment.authorId;
      newScore = updatedComment.voteScore;
    }

    // 5. Update Profile Karma
    if (targetAuthorId && voteScoreDiff !== 0) {
      const profile = await tx.profile.update({
        where: { id: targetAuthorId },
        data: { karma: { increment: voteScoreDiff } }
      });
      
      return { message: 'Vote recorded successfully', profile, oldKarma: profile.karma - voteScoreDiff, newKarma: profile.karma, targetAuthorId };
    }

    return { message: 'Vote recorded successfully' };
  });

  // Invalidate cached feeds after vote (score changed affects ordering)
  if (isPost) {
    const post = await prisma.post.findUnique({ where: { id: data.targetId }, select: { communityId: true } });
    if (post) {
      await invalidatePost(data.targetId);
      await invalidateCommunityFeed(post.communityId);
      await invalidateGlobalHotFeed();
    }
  } else {
    const comment = await prisma.comment.findUnique({
      where: { id: data.targetId },
      select: { post: { select: { communityId: true } } }
    });
    if (comment?.post) {
      await invalidateCommunityFeed(comment.post.communityId);
    }
  }

  // Check Karma Milestone
  if (result.targetAuthorId && result.oldKarma !== undefined && result.newKarma !== undefined) {
    const milestones = [10, 50, 100, 500, 1000, 5000, 10000];
    const crossedMilestone = milestones.find(m => result.oldKarma < m && result.newKarma >= m);
    
    if (crossedMilestone) {
      try {
        const { sendNotification } = await import('../../utils/notifications.js');
        await sendNotification(
          result.targetAuthorId,
          'KARMA_MILESTONE',
          'Karma Milestone Reached!',
          `Congratulations! You've reached ${crossedMilestone} karma.`
        );
      } catch (err) {
        logger.error('Karma notification error:', err);
      }
    }
  }

  return { message: result.message };
}
