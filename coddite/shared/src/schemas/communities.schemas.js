import { z } from 'zod';

export const CreateCommunitySchema = z.object({
  slug: z.string().min(3).max(30).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(3).max(50),
  description: z.string().max(255).optional(),
  isPrivate: z.boolean().default(false),
  postingPolicy: z.enum(['ANYONE', 'MEMBERS_ONLY', 'ADMIN_ONLY']).default('ANYONE'),
});

export const UpdateCommunitySchema = CreateCommunitySchema.partial();

export const AssignRoleSchema = z.object({
  profileId: z.string().uuid(),
  role: z.enum(['MEMBER', 'MODERATOR', 'OWNER']),
});
