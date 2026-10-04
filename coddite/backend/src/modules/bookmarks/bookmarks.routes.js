import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';

import * as bookmarksController from './bookmarks.controller.js';

export const bookmarksRouter = Router();

bookmarksRouter.post('/', requireAuth, bookmarksController.toggleBookmark);
bookmarksRouter.get('/', requireAuth, bookmarksController.listBookmarks);
