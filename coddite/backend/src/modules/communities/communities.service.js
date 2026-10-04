import { v7 as uuidv7 } from 'uuid';

import { writeAuditLog } from '../../lib/auditLog.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';

/**
 *
 * @param data
 * @param creatorProfileId
 */
export async function createCommunity(data, creatorProfileId) {
  const existing = await prisma.community.findUnique({ where: { slug: data.slug } });
  if (existing) throw new AppError(400, 'Slug is already taken');

  const communityId = uuidv7();

  const community = await prisma.community.create({
    data: {
      id: communityId,
      slug: data.slug,
      name: data.name,
      description: data.description || '',
      isPrivate: data.isPrivate,
      postingPolicy: data.postingPolicy,
      createdById: creatorProfileId,
      memberCount: 1,
      members: {
        create: {
          profileId: creatorProfileId,
          role: 'OWNER',
        }
      }
    }
  });

  return community;
}

/**
 *
 * @param searchQuery
 * @param limit
 */
export async function listCommunities(searchQuery = '', limit = 20) {
  const where = searchQuery 
    ? { 
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } }
        ]
      }
    : {};

  return prisma.community.findMany({
    where,
    take: limit,
    orderBy: { memberCount: 'desc' }
  });
}

/**
 *
 * @param slug
 */
export async function getCommunityBySlug(slug) {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      _count: { select: { posts: true, members: true } }
    }
  });
  if (!community) throw new AppError(404, 'Community not found');
  return community;
}

/**
 *
 * @param communityId
 * @param profileId
 */
export async function joinCommunity(communityId, profileId) {
  // Check if already member
  const existing = await prisma.communityMember.findUnique({
    where: { communityId_profileId: { communityId, profileId } }
  });

  if (existing) return;

  await prisma.$transaction([
    prisma.communityMember.create({
      data: { communityId, profileId, role: 'MEMBER' }
    }),
    prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { increment: 1 } }
    })
  ]);
}

/**
 *
 * @param communityId
 * @param profileId
 */
export async function leaveCommunity(communityId, profileId) {
  const existing = await prisma.communityMember.findUnique({
    where: { communityId_profileId: { communityId, profileId } }
  });

  if (!existing) return;
  if (existing.role === 'OWNER') {
    throw new AppError(400, 'Owners cannot leave the community. Transfer ownership first.');
  }

  await prisma.$transaction([
    prisma.communityMember.delete({
      where: { communityId_profileId: { communityId, profileId } }
    }),
    prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { decrement: 1 } }
    })
  ]);
}

/**
 *
 * @param communityId
 * @param targetProfileId
 * @param role
 * @param requesterProfileId
 * @param requesterGlobalRole
 */
export async function assignRole(communityId, targetProfileId, role, requesterProfileId, requesterGlobalRole) {
  // Must be OWNER of the community or GLOBAL ADMIN
  const requesterMembership = await prisma.communityMember.findUnique({
    where: { communityId_profileId: { communityId, profileId: requesterProfileId } }
  });

  const isOwner = requesterMembership?.role === 'OWNER';
  const isAdmin = requesterGlobalRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'Forbidden: Only the Owner or System Admin can assign roles');
  }

  const targetMembership = await prisma.communityMember.findUnique({
    where: { communityId_profileId: { communityId, profileId: targetProfileId } }
  });

  if (!targetMembership) {
    throw new AppError(404, 'User is not a member of this community');
  }

  const updated = await prisma.communityMember.update({
    where: { communityId_profileId: { communityId, profileId: targetProfileId } },
    data: { role }
  });

  await writeAuditLog({
    actorId: requesterProfileId,
    action: 'role.assign',
    targetType: 'COMMUNITY_MEMBER',
    targetId: targetProfileId,
    communityId,
    reason: `Assigned role ${role}`,
    metadata: { oldRole: targetMembership.role, newRole: role }
  });

  return updated;
}
