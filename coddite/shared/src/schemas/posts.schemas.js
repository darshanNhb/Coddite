import { z } from 'zod';

export const CreatePostSchema = z.object({
  communityId: z.string().uuid(),
  title: z.string().min(1).max(300),
  bodyMarkdown: z.string().min(1).max(40000), // Max reddit post length is ~40k
  isNsfw: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(30)).max(5).optional(), // max 5 tags
});

export const UpdatePostSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  bodyMarkdown: z.string().min(1).max(40000).optional(),
  isNsfw: z.boolean().optional(),
});

export const DeletePostSchema = z.object({
  removedReason: z.string().optional(), // For moderation
});
