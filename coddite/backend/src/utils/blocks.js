import { prisma } from '../lib/prisma.js';

/**
 *
 * @param profileId
 */
export async function getBlockedIds(profileId) {
  if (!profileId) return new Set();
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: profileId },
    select: { blockedId: true }
  });
  return new Set(blocks.map(b => b.blockedId));
}

/**
 *
 * @param posts
 * @param blockedIds
 */
export function filterBlockedPosts(posts, blockedIds) {
  if (!blockedIds || blockedIds.size === 0) return posts;
  return posts.filter(p => p.author && !blockedIds.has(p.author.id));
}

/**
 *
 * @param comments
 * @param blockedIds
 */
export function filterBlockedComments(comments, blockedIds) {
  if (!blockedIds || blockedIds.size === 0) return comments;
  return comments
    .filter(c => c.author && !blockedIds.has(c.author.id))
    .map(c => ({
      ...c,
      replies: c.replies ? filterBlockedComments(c.replies, blockedIds) : []
    }));
}
