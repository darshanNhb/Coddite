import { z } from 'zod';

export const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  bodyMarkdown: z.string().min(1).max(10000), // Max reddit comment length is ~10k
});

export const UpdateCommentSchema = z.object({
  bodyMarkdown: z.string().min(1).max(10000),
});

export const DeleteCommentSchema = z.object({
  removedReason: z.string().optional(),
});
