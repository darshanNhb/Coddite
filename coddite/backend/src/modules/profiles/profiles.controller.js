import { z } from 'zod';

import * as profilesService from './profiles.service.js';

const ChangeHandleSchema = z.object({
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(30, 'Handle must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Handle may only contain letters, numbers, hyphens, and underscores'),
});

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function changeHandle(req, res, next) {
  try {
    const { handle } = ChangeHandleSchema.parse(req.body);
    const updatedProfile = await profilesService.changeHandle(req.user.id, handle);
    res.json({ data: { profile: updatedProfile } });
  } catch (err) {
    next(err);
  }
}

const UpdateNotificationPreferencesSchema = z.object({
  type: z.enum(['NEW_COMMENT', 'NEW_REPLY', 'ANSWER_ACCEPTED', 'POST_REMOVED', 'KARMA_MILESTONE']),
  enabled: z.boolean(),
});

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function getNotificationPreferences(req, res, next) {
  try {
    const prefs = await profilesService.getNotificationPreferences(req.profile.id);
    res.json({ data: prefs });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function updateNotificationPreferences(req, res, next) {
  try {
    const { type, enabled } = UpdateNotificationPreferencesSchema.parse(req.body);
    const updatedPref = await profilesService.updateNotificationPreferences(req.profile.id, type, enabled);
    res.json({ data: updatedPref });
  } catch (err) {
    next(err);
  }
}
/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function getProfile(req, res, next) {
  try {
    const profile = await profilesService.getProfile(req.params.handle, req.profile?.id);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function getProfilePosts(req, res, next) {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit || '20', 10);
    const { posts, nextCursor } = await profilesService.getProfilePosts(
      req.params.handle, 
      req.profile?.id, 
      req.user?.role, 
      cursor, 
      limit
    );
    res.json({ data: posts, meta: { nextCursor } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function getProfileComments(req, res, next) {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit || '20', 10);
    const { comments, nextCursor } = await profilesService.getProfileComments(
      req.params.handle, 
      req.profile?.id, 
      req.user?.role, 
      cursor, 
      limit
    );
    res.json({ data: comments, meta: { nextCursor } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function blockUser(req, res, next) {
  try {
    await profilesService.blockUser(req.profile.id, req.params.handle, req.user.role);
    res.json({ data: { message: 'User blocked' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function unblockUser(req, res, next) {
  try {
    await profilesService.unblockUser(req.profile.id, req.params.handle);
    res.json({ data: { message: 'User unblocked' } });
  } catch (err) {
    next(err);
  }
}
