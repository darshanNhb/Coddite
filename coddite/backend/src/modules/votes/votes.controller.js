import { CastVoteSchema } from '@coddite/shared/schemas/votes.schemas';

import * as votesService from './votes.service.js';

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function castVote(req, res, next) {
  try {
    const data = CastVoteSchema.parse(req.body);
    const result = await votesService.castVote(req.profile.id, data);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
