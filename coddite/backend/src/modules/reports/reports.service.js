import { v7 as uuidv7 } from 'uuid';

import { writeAuditLog } from '../../lib/auditLog.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';

/**
 *
 * @param data
 * @param reporterId
 */
export async function createReport(data, reporterId) {
  // Resolve community from the target
  let communityId;

  if (data.targetType === 'POST') {
    const post = await prisma.post.findUnique({ where: { id: data.targetId }, select: { communityId: true } });
    if (!post) throw new AppError(404, 'Post not found');
    communityId = post.communityId;
  } else {
    const comment = await prisma.comment.findUnique({
      where: { id: data.targetId },
      select: { post: { select: { communityId: true } } }
    });
    if (!comment) throw new AppError(404, 'Comment not found');
    communityId = comment.post.communityId;
  }

  const report = await prisma.report.create({
    data: {
      id: uuidv7(),
      reporterId,
      targetType: data.targetType,
      postId: data.targetType === 'POST' ? data.targetId : null,
      commentId: data.targetType === 'COMMENT' ? data.targetId : null,
      communityId,
      reason: data.reason,
      details: data.details,
    }
  });

  return report;
}

/**
 *
 * @param communityId
 * @param status
 * @param limit
 */
export async function listReports(communityId, status, limit = 50) {
  const where = { communityId };
  if (status) where.status = status;

  return prisma.report.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { reporter: true }
  });
}

/**
 *
 * @param id
 * @param resolution
 * @param reason
 * @param actorId
 */
export async function resolveReport(id, resolution, reason, actorId) {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw new AppError(404, 'Report not found');
  if (report.status !== 'PENDING') throw new AppError(400, 'Report has already been resolved');

  const updatedReport = await prisma.report.update({
    where: { id },
    data: {
      status: resolution === 'dismissed' ? 'DISMISSED' : 'ACTIONED',
      resolvedById: actorId,
      resolvedAt: new Date(),
      resolution,
    }
  });

  // If actioned (removed), soft-delete the target
  if (resolution === 'removed') {
    if (report.targetType === 'POST') {
      await prisma.post.update({
        where: { id: report.postId },
        data: { deletedAt: new Date(), status: 'HIDDEN', removedReason: reason || 'Removed by moderator' }
      });
    } else if (report.targetType === 'COMMENT') {
      await prisma.comment.update({
        where: { id: report.commentId },
        data: { deletedAt: new Date(), bodyMarkdown: '[removed]', removedReason: reason || 'Removed by moderator' }
      });
    }
  }

  // Write audit log
  await writeAuditLog({
    actorId,
    action: 'report.resolve',
    targetType: 'REPORT',
    targetId: id,
    communityId: report.communityId,
    reason: `${resolution}: ${reason || ''}`,
    metadata: { originalTargetType: report.targetType, originalTargetId: report.postId || report.commentId },
  });

  return updatedReport;
}
