import { z } from 'zod';

import * as bookmarksService from './bookmarks.service.js';

const ToggleBookmarkSchema = z.object({
  postId: z.string().uuid('Invalid post ID format')
});

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function toggleBookmark(req, res, next) {
  try {
    const { postId } = ToggleBookmarkSchema.parse(req.body);
    const result = await bookmarksService.toggleBookmark(postId, req.profile.id);
    res.json({ data: result });
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
export async function listBookmarks(req, res, next) {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit || '20', 10);
    const { posts, nextCursor } = await bookmarksService.listBookmarks(req.profile.id, cursor, limit);
    res.json({ data: posts, meta: { nextCursor } });
  } catch (err) {
    next(err);
  }
}
