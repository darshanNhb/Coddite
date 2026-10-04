import * as searchService from './search.service.js';

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function search(req, res, next) {
  try {
    const q = req.query.q || '';
    const scope = req.query.scope || null;
    const cursor = req.query.cursor || null;
    const limit = parseInt(req.query.limit || '20', 10);
    
    // Pass profileId if logged in (for access checks)
    const profileId = req.profile?.id || null;

    const { posts, nextCursor } = await searchService.searchPosts(q, scope, cursor, limit, profileId);
    res.json({ data: posts, meta: { nextCursor } });
  } catch (err) {
    next(err);
  }
}
