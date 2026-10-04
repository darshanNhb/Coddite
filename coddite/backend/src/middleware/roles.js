import { AppError } from '../utils/errors.js';

/**
 * Middleware that requires the authenticated user to have ADMIN role.
 * @param req
 * @param res
 * @param next
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'Forbidden: Admin role required'));
  }
  next();
}

/**
 * Middleware that requires the user to be MODERATOR or OWNER of the
 * community specified by :communityId or body.communityId, or be an ADMIN.
 *
 * Must be placed AFTER requireAuth so req.user/req.profile are available.
 * @param getCommunityId
 */
export function requireModOrAdmin(getCommunityId) {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'ADMIN') return next();

      const communityId = getCommunityId(req);
      if (!communityId) return next(new AppError(400, 'communityId is required'));

      const { prisma } = await import('../lib/prisma.js');
      const membership = await prisma.communityMember.findUnique({
        where: { communityId_profileId: { communityId, profileId: req.profile.id } }
      });

      if (!membership || !['MODERATOR', 'OWNER'].includes(membership.role)) {
        return next(new AppError(403, 'Forbidden: Moderator or Owner role required'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
