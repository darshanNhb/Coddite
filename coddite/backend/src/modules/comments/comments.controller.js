import { CreateCommentSchema, UpdateCommentSchema, DeleteCommentSchema } from '@coddite/shared/schemas/comments.schemas';

import * as commentsService from './comments.service.js';

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function createComment(req, res, next) {
  try {
    const data = CreateCommentSchema.parse(req.body);
    const comment = await commentsService.createComment(data, req.profile.id);
    res.status(201).json({ data: comment });
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
export async function listComments(req, res, next) {
  try {
    const postId = req.query.postId;
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit || '50', 10);
    
    if (!postId) {
      return res.status(400).json({ error: 'postId query param is required' });
    }

    const profileId = req.profile?.id || null;
    const globalRole = req.user?.role || null;
    const { comments, nextCursor } = await commentsService.listComments(postId, cursor, limit, profileId, globalRole);
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
export async function updateComment(req, res, next) {
  try {
    const data = UpdateCommentSchema.parse(req.body);
    const comment = await commentsService.updateComment(req.params.id, data, req.profile.id, req.user.role);
    res.json({ data: comment });
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
export async function deleteComment(req, res, next) {
  try {
    const { removedReason } = DeleteCommentSchema.parse(req.body);
    await commentsService.deleteComment(req.params.id, removedReason, req.profile.id, req.user.role);
    res.json({ data: { message: 'Comment deleted' } });
  } catch (err) {
    next(err);
  }
}
