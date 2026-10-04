import * as leaderboardService from './leaderboard.service.js';

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function getLeaderboard(req, res, next) {
  try {
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit || '20', 10);
    const { leaderboard, nextCursor } = await leaderboardService.getLeaderboard(cursor, limit);
    res.json({ data: leaderboard, meta: { nextCursor } });
  } catch (err) {
    next(err);
  }
}
