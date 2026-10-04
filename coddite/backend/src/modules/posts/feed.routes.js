import { Router } from 'express';

import { optionalAuth } from '../../middleware/auth.js';

import * as postsController from './posts.controller.js';

export const feedRouter = Router();
feedRouter.get('/', optionalAuth, postsController.getGlobalFeed);
