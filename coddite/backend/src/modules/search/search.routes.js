import { Router } from 'express';

import { optionalAuth } from '../../middleware/auth.js';

import * as searchController from './search.controller.js';

export const searchRouter = Router();

searchRouter.get('/', optionalAuth, searchController.search);
