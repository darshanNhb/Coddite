import { Router } from 'express';

import { voteLimiter } from '../../lib/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';

import * as votesController from './votes.controller.js';

export const votesRouter = Router();

votesRouter.post('/', requireAuth, voteLimiter, votesController.castVote);
