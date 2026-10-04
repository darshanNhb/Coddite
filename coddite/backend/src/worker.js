import { logger } from './lib/logger.js';
/**
 * BullMQ worker entry point.
 *
 * In production with a separate worker service, this file is the
 * container's start command: `node src/worker.js`.
 *
 * When RUN_WORKER_IN_API=true, server.js imports startWorkers()
 * and runs the processors in the same process.
 */

/**
 * Starts all BullMQ worker processors.
 * Called either as the main entry point (separate worker service)
 * or from server.js (combined mode).
 */
export async function startWorkers() {
  const { Worker } = await import('bullmq');
  const { redis } = await import('./lib/redis.js');
  const { sendOtpEmail } = await import('./lib/email.js');

  new Worker('email', async job => {
    if (job.name === 'sendOtp') {
      const { email, otp } = job.data;
      await sendOtpEmail(email, otp);
    }
  }, { connection: redis });

  logger.warn('[worker] BullMQ workers started (email processor registered)');
}

// If this file is the entry point, start workers and keep the process alive
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;

if (isMainModule) {
  await startWorkers();
  logger.warn('[worker] Worker process running. Press Ctrl+C to stop.');

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.warn('[worker] SIGTERM received, draining...');
    // TODO: Close workers gracefully
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.warn('[worker] SIGINT received, draining...');
    process.exit(0);
  });
}
