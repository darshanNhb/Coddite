import { z } from 'zod';

export const CreateReportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT']),
  targetId: z.string().uuid(),
  reason: z.string().min(1).max(200),
  details: z.string().max(1000).optional(),
});

export const ResolveReportSchema = z.object({
  resolution: z.enum(['removed', 'warned', 'dismissed']),
  reason: z.string().max(500).optional(),
});
