import { CreateCommunitySchema, AssignRoleSchema } from '@coddite/shared/schemas/communities.schemas';

import * as communitiesService from './communities.service.js';

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function createCommunity(req, res, next) {
  try {
    const data = CreateCommunitySchema.parse(req.body);
    const community = await communitiesService.createCommunity(data, req.profile.id);
    res.status(201).json({ data: community });
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
export async function listCommunities(req, res, next) {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit || '20', 10);
    const communities = await communitiesService.listCommunities(query, limit);
    res.json({ data: communities });
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
export async function getCommunity(req, res, next) {
  try {
    const community = await communitiesService.getCommunityBySlug(req.params.slug);
    res.json({ data: community });
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
export async function joinCommunity(req, res, next) {
  try {
    await communitiesService.joinCommunity(req.params.id, req.profile.id);
    res.json({ data: { message: 'Joined successfully' } });
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
export async function leaveCommunity(req, res, next) {
  try {
    await communitiesService.leaveCommunity(req.params.id, req.profile.id);
    res.json({ data: { message: 'Left successfully' } });
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
export async function assignRole(req, res, next) {
  try {
    const { profileId, role } = AssignRoleSchema.parse(req.body);
    const updatedMember = await communitiesService.assignRole(
      req.params.id, 
      profileId, 
      role, 
      req.profile.id, 
      req.user.role
    );
    res.json({ data: updatedMember });
  } catch (err) {
    next(err);
  }
}
