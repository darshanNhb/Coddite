import { Router } from 'express';

import * as profilesController from './profiles.controller.js';

import { requireAuth, optionalAuth } from '../../middleware/auth.js';
export const profilesRouter = Router();

// ── Profile Settings ────────────────────────────────────────────────────────
profilesRouter.patch('/me/handle', requireAuth, profilesController.changeHandle);
profilesRouter.get('/me/notification-preferences', requireAuth, profilesController.getNotificationPreferences);
profilesRouter.patch('/me/notification-preferences', requireAuth, profilesController.updateNotificationPreferences);

// ── Blocks ────────────────────────────────────────────────────────
profilesRouter.post('/:handle/block', requireAuth, profilesController.blockUser);
profilesRouter.delete('/:handle/block', requireAuth, profilesController.unblockUser);

// ── Public Profile ──────────────────────────────────────────────────────────

profilesRouter.get('/:handle', profilesController.getProfile);
profilesRouter.get('/:handle/posts', optionalAuth, profilesController.getProfilePosts);
profilesRouter.get('/:handle/comments', optionalAuth, profilesController.getProfileComments);
