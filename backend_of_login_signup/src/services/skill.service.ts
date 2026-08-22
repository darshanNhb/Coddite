import prisma from "../config/prisma.js";
import { createAuditLog } from "./audit.service.js";

const MAX_SKILLS = 7;

// ─── Add Skill ───────────────────────────────────────────

export async function addSkill(
    userId: string,
    name: string,
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const normalizedName = name.trim().toLowerCase();

    const count = await prisma.userSkill.count({
        where: { userId },
    });

    if (count >= MAX_SKILLS) {
        throw new Error("MAX_SKILLS_REACHED");
    }

    // Check for duplicate (case-insensitive via normalized name)
    const existing = await prisma.userSkill.findUnique({
        where: {
            userId_name: {
                userId,
                name: normalizedName,
            },
        },
    });

    if (existing) {
        throw new Error("DUPLICATE_SKILL");
    }

    const skill = await prisma.userSkill.create({
        data: {
            userId,
            name: normalizedName,
        },
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "skill_added", skillName: normalizedName },
    });

    return skill;
}

// ─── Delete Skill ────────────────────────────────────────

export async function deleteSkill(
    userId: string,
    skillId: string,
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const skill = await prisma.userSkill.findUnique({
        where: { id: skillId },
        select: { userId: true, name: true },
    });

    if (!skill || skill.userId !== userId) {
        throw new Error("SKILL_NOT_FOUND");
    }

    await prisma.userSkill.delete({
        where: { id: skillId },
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "skill_deleted", skillName: skill.name },
    });
}
