import { PrismaClient, Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { serializePost } from '../../utils/serializers.js';

/**
 *
 * @param query
 * @param scopeSlug
 * @param cursor
 * @param limit
 * @param profileId
 */
export async function searchPosts(query, scopeSlug, cursor, limit = 20, profileId = null) {
  if (!query || query.trim().length === 0) {
    return { posts: [], nextCursor: null };
  }

  const offset = parseInt(cursor || '0', 10);
  
  const conditions = [
    Prisma.sql`p."deletedAt" IS NULL`,
    Prisma.sql`p."status" = 'PUBLISHED'`,
    Prisma.sql`p."searchVector" @@ websearch_to_tsquery('english', ${query})`
  ];

  if (scopeSlug) {
    conditions.push(Prisma.sql`c."slug" = ${scopeSlug}`);
  }

  if (profileId) {
    conditions.push(Prisma.sql`(c."isPrivate" = false OR EXISTS (SELECT 1 FROM "community_members" cm WHERE cm."communityId" = p."communityId" AND cm."profileId" = ${profileId}::uuid))`);
    conditions.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "user_blocks" ub WHERE ub."blockerId" = ${profileId}::uuid AND ub."blockedId" = p."authorId")`);
  } else {
    conditions.push(Prisma.sql`c."isPrivate" = false`);
  }

  const rawQuery = Prisma.sql`
    SELECT p.id, ts_rank(p."searchVector", websearch_to_tsquery('english', ${query})) as rank
    FROM "posts" p
    JOIN "communities" c ON p."communityId" = c.id
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY rank DESC, p."createdAt" DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const results = await prisma.$queryRaw(rawQuery);

  if (results.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const postIds = results.map(r => r.id);

  // 2. Fetch full post objects using Prisma's findMany to include relations
  const posts = await prisma.post.findMany({
    where: { id: { in: postIds } },
    include: {
      author: { include: { user: { select: { status: true } } } },
      community: true,
      tags: { include: { tag: true } }
    }
  });

  // Prisma doesn't guarantee order with IN clause, so we must sort them to match the raw query's rank order
  const postMap = new Map(posts.map(p => [p.id, p]));
  const sortedPosts = postIds.map(id => postMap.get(id)).filter(Boolean);

  let nextCursor = null;
  if (results.length === limit) {
    nextCursor = (offset + limit).toString();
  }

  return { posts: sortedPosts.map(serializePost), nextCursor };
}
