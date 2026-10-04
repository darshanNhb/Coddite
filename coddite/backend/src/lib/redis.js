import { Redis } from 'ioredis';

import { logger } from './logger.js';

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => {
  logger.error('[redis] Connection error:', err);
});
