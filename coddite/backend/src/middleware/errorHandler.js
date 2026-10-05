import { ZodError } from 'zod';

import { logger } from '../lib/logger.js';
import { AppError } from '../utils/errors.js';

/**
 *
 * @param err
 * @param req
 * @param res
 * @param next
 */
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const issues = err.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({ error: 'Validation failed', details: issues });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  logger.error({ err }, '[errorHandler] Uncaught error');
  console.error(err);
  const payload = { error: 'Internal server error' };
  if (process.env.NODE_ENV !== 'production') {
    payload.message = err.message;
  }
  res.status(500).json(payload);
}
