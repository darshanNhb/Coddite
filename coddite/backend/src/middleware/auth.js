import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Middleware to enforce authentication and attach the Profile to req.profile.
 * @param req
 * @param res
 * @param next
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No access token' });
    }

    const payload = verifyAccessToken(token);
    
    // In many endpoints we just need the IDs, but attaching the full profile is requested
    const profile = await prisma.profile.findUnique({
      where: { id: payload.profileId }
    });

    if (!profile) {
      return res.status(401).json({ error: 'Unauthorized: Profile not found' });
    }

    req.profile = profile;
    req.user = { id: payload.userId, role: payload.role };
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.accessToken;
    if (!token) {
      return next();
    }
    const payload = verifyAccessToken(token);
    const profile = await prisma.profile.findUnique({
      where: { id: payload.profileId }
    });
    if (profile) {
      req.profile = profile;
      req.user = { id: payload.userId, role: payload.role };
    }
    next();
  } catch (err) {
    // ignore invalid token for optional auth
    next();
  }
}
