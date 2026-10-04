import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';
import { serializePost } from '../../utils/serializers.js';

/**
 *
 * @param postId
 * @param profileId
 */
export async function toggleBookmark(postId, profileId) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError(404, 'Post not found');

  const existing = await prisma.bookmark.findUnique({
    where: { profileId_postId: { profileId, postId } }
  });

  if (existing) {
    await prisma.bookmark.delete({
      where: { profileId_postId: { profileId, postId } }
    });
    return { bookmarked: false };
  } else {
    await prisma.bookmark.create({
      data: { profileId, postId }
    });
    return { bookmarked: true };
  }
}

/**
 *
 * @param profileId
 * @param cursor
 * @param limit
 */
export async function listBookmarks(profileId, cursor, limit = 20) {
  const args = {
    where: { 
      profileId,
      post: {
        deletedAt: null,
        status: 'PUBLISHED',
        OR: [
          { community: { isPrivate: false } },
          {
            community: {
              members: {
                some: { profileId }
              }
            }
          }
        ]
      }
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          author: { include: { user: { select: { status: true } } } },
          community: true,
          tags: { include: { tag: true } }
        }
      }
    }
  };

  if (cursor) {
    args.cursor = { profileId_postId: { profileId, postId: cursor } };
    args.skip = 1;
  }

  const bookmarks = await prisma.bookmark.findMany(args);
  
  let nextCursor = null;
  if (bookmarks.length === limit) {
    nextCursor = bookmarks[bookmarks.length - 1].postId;
  }

  const { getBlockedIds } = await import('../../utils/blocks.js');
  const blockedIds = await getBlockedIds(profileId);

  const posts = bookmarks
    .map(b => b.post)
    .filter(p => p.author && !blockedIds.has(p.author.id))
    .map(serializePost);

  return { posts, nextCursor };
}
