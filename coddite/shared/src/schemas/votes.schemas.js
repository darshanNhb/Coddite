import { z } from 'zod';

export const CastVoteSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT']),
  targetId: z.string().uuid(),
  value: z.number().int().min(-1).max(1), // 1 for upvote, -1 for downvote, 0 to remove vote
});
