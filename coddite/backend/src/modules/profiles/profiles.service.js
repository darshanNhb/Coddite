import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { AppError } from '../../utils/errors.js';

const HANDLE_COOLDOWN_DAYS = 30;

/**
 *
 * @param userId
 * @param newHandle
 */
export async function changeHandle(userId, newHandle) {
  const normalizedHandle = newHandle.toLowerCase().trim();

  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError(404, 'Profile not found');
  }

  // 1. Enforce cooldown
  if (profile.handleChangedAt) {
    const daysSinceChange = (Date.now() - profile.handleChangedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceChange < HANDLE_COOLDOWN_DAYS) {
      const nextEligibleDate = new Date(profile.handleChangedAt.getTime() + HANDLE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      throw new AppError(
        403, 
        `Handle was changed recently. You can change it again on ${nextEligibleDate.toLocaleDateString()}.`
      );
    }
  }

  // 2. Check if identical
  if (profile.handle.toLowerCase() === normalizedHandle) {
    throw new AppError(400, 'New handle must be different from current handle.');
  }

  // 3. Check if taken in DB
  const existingProfile = await prisma.profile.findUnique({
    where: { handle: normalizedHandle },
  });
  if (existingProfile) {
    throw new AppError(409, 'This handle is already taken.');
  }

  // 4. Check if reserved in Redis (by a pending signup)
  const reserveKey = `handle-reserve:${normalizedHandle}`;
  const existingReservation = await redis.get(reserveKey);
  if (existingReservation) {
    throw new AppError(409, 'This handle is currently reserved.');
  }

  // 5. Reserve temporarily while we update
  await redis.set(reserveKey, profile.userId, 'EX', 10); // short lock

  try {
    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        handle: newHandle, 
        handleChangedAt: new Date(),
      },
    });
    return updated;
  } finally {
    await redis.del(reserveKey);
  }
}

/**
 *
 * @param profileId
 */
export async function getNotificationPreferences(profileId) {
  const prefs = await prisma.notificationPreference.findMany({
    where: { profileId }
  });
  
  // Convert array to a keyed object, with defaults for missing
  const defaultPrefs = {
    NEW_COMMENT: true,
    NEW_REPLY: true,
    ANSWER_ACCEPTED: true,
    POST_REMOVED: true,
    KARMA_MILESTONE: true
  };
  
  const userPrefs = { ...defaultPrefs };
  for (const pref of prefs) {
    userPrefs[pref.type] = pref.enabled;
  }
  
  return userPrefs;
}

/**
 *
 * @param profileId
 * @param type
 * @param enabled
 */
export async function updateNotificationPreferences(profileId, type, enabled) {
  await prisma.notificationPreference.upsert({
    where: { profileId_type: { profileId, type } },
    update: { enabled },
    create: { profileId, type, enabled }
  });
  return getNotificationPreferences(profileId);
}
/**
 *
 * @param handle
 * @param viewerProfileId
 */
export async function getProfile(handle, viewerProfileId = null) {
  const normalizedHandle = handle.toLowerCase().trim();
  const profile = await prisma.profile.findUnique({
    where: { handle: normalizedHandle },
    select: {
      id: true,
      handle: true,
      avatarUrl: true,
      bio: true,
      karma: true,
      createdAt: true,
      postCount: true,
      commentCount: true,
      user: {
        select: { status: true }
      }
    }
  });

  if (!profile) throw new AppError(404, 'Profile not found');
  
  let isBlockedByMe = false;
  if (viewerProfileId) {
    const { getBlockedIds } = await import('../../utils/blocks.js');
    const blockedIds = await getBlockedIds(viewerProfileId);
    isBlockedByMe = blockedIds.has(profile.id);
  }

  if (profile.user.status === 'DELETED') {
    return {
      handle: '[deleted]',
      isDeleted: true,
      karma: profile.karma,
      createdAt: profile.createdAt
    };
  }

  const { user, ...rest } = profile;
  return { ...rest, isDeleted: false, isBlockedByMe };
}

import { serializePost, serializeCommentTree } from '../../utils/serializers.js';

/**
 *
 * @param handle
 * @param viewerProfileId
 * @param globalRole
 * @param cursor
 * @param limit
 */
export async function getProfilePosts(handle, viewerProfileId, globalRole, cursor, limit = 20) {
  const profile = await prisma.profile.findUnique({ where: { handle: handle.toLowerCase().trim() } });
  if (!profile) throw new AppError(404, 'Profile not found');

  if (viewerProfileId) {
    const { getBlockedIds } = await import('../../utils/blocks.js');
    const blockedIds = await getBlockedIds(viewerProfileId);
    if (blockedIds.has(profile.id)) return { posts: [], nextCursor: null };
  }

  const args = {
    where: {
      authorId: profile.id,
      deletedAt: null,
      status: 'PUBLISHED',
      OR: [
        { community: { isPrivate: false } },
        ...(globalRole === 'ADMIN' ? [{ community: { isPrivate: true } }] : []),
        ...(viewerProfileId ? [{ community: { members: { some: { profileId: viewerProfileId } } } }] : [])
      ]
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { include: { user: { select: { status: true } } } },
      community: true
    }
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
}

/**
 *
 * @param handle
 * @param viewerProfileId
 * @param globalRole
 * @param cursor
 * @param limit
 */
export async function getProfileComments(handle, viewerProfileId, globalRole, cursor, limit = 20) {
  const profile = await prisma.profile.findUnique({ where: { handle: handle.toLowerCase().trim() } });
  if (!profile) throw new AppError(404, 'Profile not found');

  if (viewerProfileId) {
    const { getBlockedIds } = await import('../../utils/blocks.js');
    const blockedIds = await getBlockedIds(viewerProfileId);
    if (blockedIds.has(profile.id)) return { comments: [], nextCursor: null };
  }

  const args = {
    where: {
      authorId: profile.id,
      deletedAt: null,
      post: {
        deletedAt: null,
        status: 'PUBLISHED',
        OR: [
          { community: { isPrivate: false } },
          ...(globalRole === 'ADMIN' ? [{ community: { isPrivate: true } }] : []),
          ...(viewerProfileId ? [{ community: { members: { some: { profileId: viewerProfileId } } } }] : [])
        ]
      }
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      author: { include: { user: { select: { status: true } } } },
      post: { include: { community: true } }
    }
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

  return { comments: serializeCommentTree(comments), nextCursor };
}

/**
 *
 * @param blockerId
 * @param handleToBlock
 * @param globalRole
 */
export async function blockUser(blockerId, handleToBlock, globalRole) {
  const target = await prisma.profile.findUnique({
    where: { handle: handleToBlock.toLowerCase().trim() },
    include: { user: { select: { role: true } } }
  });

  if (!target) throw new AppError(404, 'Profile not found');
  if (target.id === blockerId) throw new AppError(400, 'You cannot block yourself');
  if (target.user.role === 'ADMIN') throw new AppError(403, 'You cannot block an administrator');

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId: target.id } },
    update: {},
    create: { blockerId, blockedId: target.id }
  });
}

/**
 *
 * @param blockerId
 * @param handleToUnblock
 */
export async function unblockUser(blockerId, handleToUnblock) {
  const target = await prisma.profile.findUnique({
    where: { handle: handleToUnblock.toLowerCase().trim() }
  });

  if (!target) throw new AppError(404, 'Profile not found');

  try {
    await prisma.userBlock.delete({
      where: { blockerId_blockedId: { blockerId, blockedId: target.id } }
    });
  } catch (err) {
    // If it doesn't exist, ignore
  }
}
