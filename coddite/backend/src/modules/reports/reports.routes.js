import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { requireModOrAdmin } from '../../middleware/roles.js';

import * as reportsController from './reports.controller.js';

export const reportsRouter = Router();

// Any authenticated user can submit a report
reportsRouter.post('/', requireAuth, reportsController.createReport);

// Moderator queue: list reports for a community (requires mod/owner/admin)
reportsRouter.get(
  '/community/:communityId',
  requireAuth,
  requireModOrAdmin((req) => req.params.communityId),
  reportsController.listReports
);

// Resolve a report (requires mod/owner/admin of that report's community)
// We load the report to find the communityId, so the middleware uses body or query
reportsRouter.patch(
  '/:id/resolve',
  requireAuth,
  // We'll check permissions inside the service since we need to lookup the report first
  reportsController.resolveReport
);
