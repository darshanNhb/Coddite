import { Router } from 'express';

import { commentCreateLimiter } from '../../lib/rateLimit.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';

import * as commentsController from './comments.controller.js';

export const commentsRouter = Router();

commentsRouter.get('/', optionalAuth, commentsController.listComments);
commentsRouter.post('/', requireAuth, commentCreateLimiter, commentsController.createComment);
commentsRouter.patch('/:id', requireAuth, commentsController.updateComment);
commentsRouter.delete('/:id', requireAuth, commentsController.deleteComment);
