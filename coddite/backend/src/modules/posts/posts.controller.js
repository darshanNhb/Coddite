import { CreatePostSchema, UpdatePostSchema, DeletePostSchema } from '@coddite/shared/schemas/posts.schemas';

import * as postsService from './posts.service.js';

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function createPost(req, res, next) {
  try {
    const data = CreatePostSchema.parse(req.body);
    const post = await postsService.createPost(data, req.profile.id, req.user.role);
    res.status(201).json({ data: post });
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
export async function listPosts(req, res, next) {
  try {
    const communityId = req.query.communityId;
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit || '20', 10);
    const profileId = req.profile?.id || null;
    const globalRole = req.user?.role || null;
    const sort = req.query.sort || 'hot';
    const time = req.query.time || 'all';
    
    if (!communityId) {
      const { posts, nextCursor } = await postsService.getGlobalFeed(cursor, limit, sort, time, profileId);
      return res.json({ data: posts, meta: { nextCursor } });
    }

    const { posts, nextCursor } = await postsService.listPosts(communityId, cursor, limit, profileId, globalRole, sort, time);
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
export async function getGlobalFeed(req, res, next) {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit || '20', 10);
    const sort = req.query.sort || 'hot';
    const time = req.query.time || 'all';
    const profileId = req.profile?.id || null;
    const { posts, nextCursor } = await postsService.getGlobalFeed(cursor, limit, sort, time, profileId);
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
export async function getPost(req, res, next) {
  try {
    const profileId = req.profile?.id || null;
    const globalRole = req.user?.role || null;
    const post = await postsService.getPost(req.params.id, profileId, globalRole);
    res.json({ data: post });
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
export async function updatePost(req, res, next) {
  try {
    const data = UpdatePostSchema.parse(req.body);
    const post = await postsService.updatePost(req.params.id, data, req.profile.id, req.user.role);
    res.json({ data: post });
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
export async function deletePost(req, res, next) {
  try {
    const { removedReason } = DeletePostSchema.parse(req.body);
    await postsService.deletePost(req.params.id, removedReason, req.profile.id, req.user.role);
    res.json({ data: { message: 'Post deleted' } });
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
export async function getSimilar(req, res, next) {
  try {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ error: 'text query param is required' });
    }
    const limit = parseInt(req.query.limit || '5', 10);
    const similar = await postsService.getSimilarPosts(text, limit);
    res.json({ data: similar });
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
export async function suggestTags(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required in body' });
    }
    const ml = await import('../../lib/ml.js');
    const result = await ml.tags.suggestTags(text);
    res.json({ data: result.tags });
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
export async function acceptAnswer(req, res, next) {
  try {
    const { commentId } = req.body;
    if (!commentId) {
      return res.status(400).json({ error: 'commentId is required' });
    }
    const post = await postsService.acceptAnswer(req.params.id, commentId, req.profile.id);
    res.json({ data: post });
  } catch (err) {
    next(err);
  }
}

