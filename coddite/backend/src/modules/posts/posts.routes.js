import { Router } from 'express';

import { postCreateLimiter } from '../../lib/rateLimit.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

import * as postsController from './posts.controller.js';

export const postsRouter = Router();

postsRouter.get('/', optionalAuth, postsController.listPosts);
postsRouter.get('/similar', postsController.getSimilar);
postsRouter.post('/tags/suggest', requireAuth, postsController.suggestTags);
postsRouter.get('/:id', optionalAuth, postsController.getPost);

postsRouter.post('/', requireAuth, postCreateLimiter, postsController.createPost);
postsRouter.patch('/:id', requireAuth, postsController.updatePost);
postsRouter.delete('/:id', requireAuth, postsController.deletePost);

postsRouter.post('/:id/accept-answer', requireAuth, postsController.acceptAnswer);
