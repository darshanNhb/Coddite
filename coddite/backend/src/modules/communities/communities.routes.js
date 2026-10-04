import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';

import * as communitiesController from './communities.controller.js';

export const communitiesRouter = Router();

communitiesRouter.get('/', communitiesController.listCommunities);
communitiesRouter.get('/:slug', communitiesController.getCommunity);

// Protected routes
communitiesRouter.post('/', requireAuth, communitiesController.createCommunity);
communitiesRouter.post('/:id/join', requireAuth, communitiesController.joinCommunity);
communitiesRouter.post('/:id/leave', requireAuth, communitiesController.leaveCommunity);
communitiesRouter.patch('/:id/roles', requireAuth, communitiesController.assignRole);
