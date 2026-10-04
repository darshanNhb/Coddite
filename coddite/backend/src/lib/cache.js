import { logger } from './logger.js';
import { redis } from './redis.js';

const FEED_TTL = 60; // 60 seconds

/**
 * Cache key generators — centralised so invalidation always targets the right keys.
 */
export const cacheKeys = {
  communityFeed: (communityId, cursor, sort = 'hot', time = 'all') => `feed:community:${communityId}:${sort}:${time}:${cursor || 'first'}`,
  globalHotFeed: (cursor, sort = 'hot', time = 'all') => `feed:global:${sort}:${time}:${cursor || 'first'}`,
  post: (postId) => `post:${postId}`,
};

/**
 * Generic cache-aside helper.
 * @param {string} key  Redis key
 * @param {Function} fetcher  Async fn that returns the data to cache
 * @param {number} [ttl=FEED_TTL]  TTL in seconds
 * @returns {Promise<any>}
 */
export async function cacheGet(key, fetcher, ttl = FEED_TTL) {
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    // Redis down → fall through to DB, never block reads
    logger.error('[cache] Redis read error, falling through:', err.message);
  }

  const data = await fetcher();

  try {
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
  } catch (err) {
    logger.error('[cache] Redis write error:', err.message);
  }

  return data;
}

/**
 * Explicitly invalidate feed keys after writes (post create/delete/vote).
 * @param {string} communityId  The community whose feed changed
 */
export async function invalidateCommunityFeed(communityId) {
  try {
    // Delete all cursor pages for this community feed
    const pattern = `feed:community:${communityId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.error('[cache] Feed invalidation error:', err.message);
  }
}

/**
 * Invalidate the global hot feed (e.g. after vote changes or post deletion).
 */
export async function invalidateGlobalHotFeed() {
  try {
    const pattern = 'feed:global:*';
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.error('[cache] Global feed invalidation error:', err.message);
  }
}

/**
 * Invalidate a single cached post.
 * @param postId
 */
export async function invalidatePost(postId) {
  try {
    await redis.del(cacheKeys.post(postId));
  } catch (err) {
    logger.error('[cache] Post invalidation error:', err.message);
  }
}
