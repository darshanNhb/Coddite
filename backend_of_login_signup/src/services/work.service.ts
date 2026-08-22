import prisma from "../config/prisma.js";
import { createAuditLog } from "./audit.service.js";

const MAX_WORK_ENTRIES = 5;

interface WorkData {
    jobTitle: string;
    company: string;
    employmentType?: string | null | undefined;
    location?: string | null | undefined;
    description?: string | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    current?: boolean | undefined;
}

// ─── Add Work Experience ─────────────────────────────────

export async function addWorkExperience(
    userId: string,
    data: WorkData,
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const count = await prisma.workExperience.count({
        where: { userId },
    });

    if (count >= MAX_WORK_ENTRIES) {
        throw new Error("MAX_WORK_ENTRIES_REACHED");
    }

    const entry = await prisma.workExperience.create({
        data: {
            userId,
            jobTitle: data.jobTitle,
            company: data.company,
            employmentType: data.employmentType ?? null,
            location: data.location ?? null,
            description: data.description ?? null,
            startDate: data.startDate ?? null,
            endDate: data.endDate ?? null,
            current: data.current ?? false,
        },
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "work_added", entryId: entry.id },
    });

    return entry;
}

// ─── Update Work Experience ──────────────────────────────

export async function updateWorkExperience(
    userId: string,
    entryId: string,
    data: { [K in keyof WorkData]?: WorkData[K] | undefined },
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const entry = await prisma.workExperience.findUnique({
        where: { id: entryId },
        select: { userId: true },
    });

    if (!entry || entry.userId !== userId) {
        throw new Error("WORK_ENTRY_NOT_FOUND");
    }

    const updateData: Record<string, unknown> = {};

    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.employmentType !== undefined) updateData.employmentType = data.employmentType;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.current !== undefined) updateData.current = data.current;

    const updated = await prisma.workExperience.update({
        where: { id: entryId },
        data: updateData,
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "work_updated", entryId },
    });

    return updated;
}

// ─── Delete Work Experience ──────────────────────────────

export async function deleteWorkExperience(
    userId: string,
    entryId: string,
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const entry = await prisma.workExperience.findUnique({
        where: { id: entryId },
        select: { userId: true },
    });

    if (!entry || entry.userId !== userId) {
        throw new Error("WORK_ENTRY_NOT_FOUND");
    }

    await prisma.workExperience.delete({
        where: { id: entryId },
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "work_deleted", entryId },
    });
}
