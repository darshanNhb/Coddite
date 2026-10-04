import { AppError } from '../utils/errors.js';

import { logger } from './logger.js';
import { redis } from './redis.js';

/**
 * Redis-backed sliding-window rate limiter middleware factory.
 *
 * @param {object} opts
 * @param {string} opts.prefix    Redis key prefix (e.g. 'rl:otp-req')
 * @param {number} opts.windowSec Window in seconds
 * @param {number} opts.max       Max requests per window
 * @param {Function} [opts.keyFn] Custom key extractor (req) => string.  Defaults to IP.
 * @returns {import('express').RequestHandler}
 */
export function rateLimit({ prefix, windowSec, max, keyFn }) {
  return async (req, res, next) => {
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const identifier = keyFn ? keyFn(req) : req.ip;
    const key = `${prefix}:${identifier}`;
    const maxLimit = max;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        // First request in window — set expiry
        await redis.expire(key, windowSec);
      }

      // Set rate-limit headers regardless
      const ttl = await redis.ttl(key);
      res.set('X-RateLimit-Limit', String(maxLimit));
      res.set('X-RateLimit-Remaining', String(Math.max(0, maxLimit - current)));
      res.set('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + Math.max(0, ttl)));

      if (current > maxLimit) {
        return next(new AppError(429, 'Too many requests. Please try again later.'));
      }
    } catch (err) {
      // Redis failure → let request through rather than blocking users
      logger.error('[rateLimit] Redis error, letting request through:', err.message);
    }

    next();
  };
}

// ── Pre-built limiters ──────────────────────────────────────────────────────

/** OTP request — 5 requests per 15 minutes per IP */
export const otpRequestLimiter = rateLimit({
  prefix: 'rl:otp-req',
  windowSec: 15 * 60,
  max: 5,
});

/** OTP verify — 10 attempts per 15 minutes per IP */
export const otpVerifyLimiter = rateLimit({
  prefix: 'rl:otp-verify',
  windowSec: 15 * 60,
  max: 10,
});

/** Signup — 5 attempts per hour per IP */
export const signupLimiter = rateLimit({
  prefix: 'rl:signup',
  windowSec: 60 * 60,
  max: 5,
});

/** Login — 10 attempts per 15 minutes per IP */
export const loginLimiter = rateLimit({
  prefix: 'rl:login',
  windowSec: 15 * 60,
  max: 10,
});

/** Post creation — 10 posts per hour per profile */
export const postCreateLimiter = rateLimit({
  prefix: 'rl:post-create',
  windowSec: 60 * 60,
  max: 10,
  keyFn: (req) => req.profile?.id || req.ip,
});

/** Comment creation — 30 comments per 15 minutes per profile */
export const commentCreateLimiter = rateLimit({
  prefix: 'rl:comment-create',
  windowSec: 15 * 60,
  max: 30,
  keyFn: (req) => req.profile?.id || req.ip,
});

/** Voting — 60 votes per minute per profile */
export const voteLimiter = rateLimit({
  prefix: 'rl:vote',
  windowSec: 60,
  max: 60,
  keyFn: (req) => req.profile?.id || req.ip,
});
