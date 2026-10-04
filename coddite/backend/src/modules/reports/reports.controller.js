import { CreateReportSchema, ResolveReportSchema } from '@coddite/shared/schemas/reports.schemas';

import * as reportsService from './reports.service.js';

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function createReport(req, res, next) {
  try {
    const data = CreateReportSchema.parse(req.body);
    const report = await reportsService.createReport(data, req.profile.id);
    res.status(201).json({ data: report });
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
export async function listReports(req, res, next) {
  try {
    const communityId = req.params.communityId;
    const status = req.query.status || undefined;
    const reports = await reportsService.listReports(communityId, status);
    res.json({ data: reports });
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
export async function resolveReport(req, res, next) {
  try {
    const { resolution, reason } = ResolveReportSchema.parse(req.body);
    const report = await reportsService.resolveReport(req.params.id, resolution, reason, req.profile.id);
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}
