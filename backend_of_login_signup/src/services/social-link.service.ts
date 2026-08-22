import prisma from "../config/prisma.js";
import { createAuditLog } from "./audit.service.js";
import type { SocialPlatform } from "../generated/prisma/client.js";

const MAX_SOCIAL_LINKS = 5;

// ─── Get Social Links ────────────────────────────────────

export async function getSocialLinks(userId: string) {
    return prisma.socialLink.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });
}

// ─── Add Social Link ─────────────────────────────────────

export async function addSocialLink(
    userId: string,
    data: { platform: SocialPlatform; url: string; label?: string | undefined },
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const count = await prisma.socialLink.count({
        where: { userId },
    });

    if (count >= MAX_SOCIAL_LINKS) {
        throw new Error("MAX_SOCIAL_LINKS_REACHED");
    }

    const link = await prisma.socialLink.create({
        data: {
            userId,
            platform: data.platform,
            url: data.url,
            label: data.label ?? null,
        },
    });

    await createAuditLog({
        userId,
        event: "SOCIAL_LINK_ADDED",
        ...context,
        metadata: { platform: data.platform, linkId: link.id },
    });

    return link;
}

// ─── Update Social Link ──────────────────────────────────

export async function updateSocialLink(
    userId: string,
    linkId: string,
    data: { platform?: SocialPlatform | undefined; url?: string | undefined; label?: string | null | undefined },
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const link = await prisma.socialLink.findUnique({
        where: { id: linkId },
        select: { userId: true },
    });

    if (!link || link.userId !== userId) {
        throw new Error("SOCIAL_LINK_NOT_FOUND");
    }

    const updateData: Record<string, unknown> = {};

    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.label !== undefined) updateData.label = data.label;

    const updated = await prisma.socialLink.update({
        where: { id: linkId },
        data: updateData,
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "social_link_updated", linkId },
    });

    return updated;
}

// ─── Delete Social Link ──────────────────────────────────

export async function deleteSocialLink(
    userId: string,
    linkId: string,
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const link = await prisma.socialLink.findUnique({
        where: { id: linkId },
        select: { userId: true, platform: true },
    });

    if (!link || link.userId !== userId) {
        throw new Error("SOCIAL_LINK_NOT_FOUND");
    }

    await prisma.socialLink.delete({
        where: { id: linkId },
    });

    await createAuditLog({
        userId,
        event: "SOCIAL_LINK_REMOVED",
        ...context,
        metadata: { platform: link.platform, linkId },
    });
}
