import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

/**
 * Builds and configures the Express application.
 * Does NOT call listen — that is server.js's job.
 *
 * @returns {import('express').Express} The configured Express app
 */
import pinoHttp from 'pino-http';

import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { bookmarksRouter } from './modules/bookmarks/bookmarks.routes.js';
import { commentsRouter } from './modules/comments/comments.routes.js';
import { communitiesRouter } from './modules/communities/communities.routes.js';
import { leaderboardRouter } from './modules/leaderboard/leaderboard.routes.js';
import { feedRouter } from './modules/posts/feed.routes.js';
import { postsRouter } from './modules/posts/posts.routes.js';
import { profilesRouter } from './modules/profiles/profiles.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { searchRouter } from './modules/search/search.routes.js';
import { votesRouter } from './modules/votes/votes.routes.js';


/**
 *
 */
export function createApp() {
  const app = express();

  // ── Logger ──
  app.use(pinoHttp({ logger, autoLogging: false }));

  // ── Security headers ──
  app.use(helmet());

  // ── CORS ──
  // TODO: Read allowed origins from env once env loader is wired
  app.use(
    cors({
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      credentials: true,
    }),
  );

  // ── Body & Cookie parsing ──
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  // ── Compression ──
  app.use(compression());

  // ── Health checks ──
  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/health/ready', (_req, res) => {
    // TODO: Check database and Redis connectivity
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── API Routes ──
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/communities', communitiesRouter);
  app.use('/api/v1/posts', postsRouter);
  app.use('/api/v1/feed', feedRouter);
  app.use('/api/v1/comments', commentsRouter);
  app.use('/api/v1/votes', votesRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/profiles', profilesRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/bookmarks', bookmarksRouter);
  app.use('/api/v1/leaderboard', leaderboardRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
