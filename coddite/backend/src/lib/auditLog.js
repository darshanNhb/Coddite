import { v7 as uuidv7 } from 'uuid';

import { logger } from './logger.js';
import { prisma } from './prisma.js';

/**
 * Write an entry to the audit_logs table.
 *
 * @param {object} entry
 * @param {string} entry.actorId     Profile ID of the person taking action
 * @param {string} entry.action      Dot-notation action name ('post.delete', 'report.resolve', …)
 * @param {string} entry.targetType  'POST', 'COMMENT', 'REPORT', 'COMMUNITY_MEMBER'
 * @param {string} entry.targetId    UUID of the target
 * @param {string} [entry.communityId]
 * @param {string} [entry.reason]
 * @param {object} [entry.metadata]  Extra context (JSON-safe)
 */
export async function writeAuditLog(entry) {
  try {
    await prisma.auditLog.create({
      data: {
        id: uuidv7(),
        actorId: entry.actorId,
        action: entry.action,
        targetType: entry.targetType,
        postId: entry.targetType === 'POST' ? entry.targetId : null,
        commentId: entry.targetType === 'COMMENT' ? entry.targetId : null,
        reportId: entry.targetType === 'REPORT' ? entry.targetId : null,
        targetProfileId: entry.targetType === 'COMMUNITY_MEMBER' ? entry.targetId : null,
        communityId: entry.communityId || null,
        reason: entry.reason || null,
        metadata: entry.metadata || null,
      }
    });
  } catch (err) {
    // Audit failures should never block the request
    logger.error('[auditLog] Failed to write:', err.message);
  }
}
