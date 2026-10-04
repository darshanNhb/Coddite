/**
 * API + Socket.IO entry point.
 * This is the only file that starts listening for HTTP connections.
 *
 * In low-budget deployments (RUN_WORKER_IN_API=true), this process
 * also starts the BullMQ processors.
 */

import { createServer } from 'node:http';

import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const RUN_WORKER_IN_API = process.env.RUN_WORKER_IN_API === 'true';

const app = createApp();
const httpServer = createServer(app);

import { initSocket, getIO } from './lib/socket.js';

// Attach Socket.IO to httpServer
initSocket(httpServer);
// If configured, start the BullMQ worker processors in this process
if (RUN_WORKER_IN_API) {
  const { startWorkers } = await import('./worker.js');
  await startWorkers();
  logger.warn('[server] BullMQ workers started inside API process (RUN_WORKER_IN_API=true)');
}

httpServer.listen(PORT, () => {
  logger.warn(`[server] Coddite API listening on http://localhost:${PORT}`);
  logger.warn(`[server] Health: http://localhost:${PORT}/health/live`);
});

// ── Graceful shutdown ──
/** @param {string} signal */
function gracefulShutdown(signal) {
  logger.warn(`[server] ${signal} received, shutting down gracefully...`);
  httpServer.close(() => {
    logger.warn('[server] HTTP server closed');
    try {
      getIO().close();
      logger.warn('[server] Socket.io closed');
    } catch(e){}
    // TODO: Close Prisma, Redis, BullMQ workers
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error('[server] Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
