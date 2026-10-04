import { prisma } from '../../lib/prisma.js';

/**
 *
 * @param cursor
 * @param limit
 */
export async function getLeaderboard(cursor, limit = 20) {
  const args = {
    where: {
      user: {
        status: { notIn: ['DELETED', 'BANNED', 'SUSPENDED'] }
      }
    },
    take: limit,
    orderBy: [
      { karma: 'desc' },
      { id: 'asc' } // tiebreaker
    ],
    select: {
      id: true,
      handle: true,
      avatarUrl: true,
      bio: true,
      karma: true,
      createdAt: true,
      postCount: true,
      commentCount: true
    }
  };

  if (cursor) {
    args.cursor = { id: cursor };
    args.skip = 1;
  }

  const profiles = await prisma.profile.findMany(args);

  let nextCursor = null;
  if (profiles.length === limit) {
    nextCursor = profiles[profiles.length - 1].id;
  }

  return { leaderboard: profiles, nextCursor };
}
