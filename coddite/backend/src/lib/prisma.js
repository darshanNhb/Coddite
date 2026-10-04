import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma Client instance.
 * @type {PrismaClient}
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
