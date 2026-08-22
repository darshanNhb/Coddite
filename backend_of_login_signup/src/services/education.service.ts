import prisma from "../config/prisma.js";
import { createAuditLog } from "./audit.service.js";

const MAX_EDUCATION_ENTRIES = 5;

interface EducationData {
    institution: string;
    degree?: string | null | undefined;
    fieldOfStudy?: string | null | undefined;
    description?: string | null | undefined;
    startDate?: Date | null | undefined;
    endDate?: Date | null | undefined;
    current?: boolean | undefined;
}

// ─── Add Education ───────────────────────────────────────

export async function addEducation(
    userId: string,
    data: EducationData,
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const count = await prisma.education.count({
        where: { userId },
    });

    if (count >= MAX_EDUCATION_ENTRIES) {
        throw new Error("MAX_EDUCATION_ENTRIES_REACHED");
    }

    const entry = await prisma.education.create({
        data: {
            userId,
            institution: data.institution,
            degree: data.degree ?? null,
            fieldOfStudy: data.fieldOfStudy ?? null,
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
        metadata: { type: "education_added", entryId: entry.id },
    });

    return entry;
}

// ─── Update Education ────────────────────────────────────

export async function updateEducation(
    userId: string,
    entryId: string,
    data: { [K in keyof EducationData]?: EducationData[K] | undefined },
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const entry = await prisma.education.findUnique({
        where: { id: entryId },
        select: { userId: true },
    });

    if (!entry || entry.userId !== userId) {
        throw new Error("EDUCATION_ENTRY_NOT_FOUND");
    }

    const updateData: Record<string, unknown> = {};

    if (data.institution !== undefined) updateData.institution = data.institution;
    if (data.degree !== undefined) updateData.degree = data.degree;
    if (data.fieldOfStudy !== undefined) updateData.fieldOfStudy = data.fieldOfStudy;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.current !== undefined) updateData.current = data.current;

    const updated = await prisma.education.update({
        where: { id: entryId },
        data: updateData,
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "education_updated", entryId },
    });

    return updated;
}

// ─── Delete Education ────────────────────────────────────

export async function deleteEducation(
    userId: string,
    entryId: string,
    context: { ipAddress: string | undefined; userAgent: string | undefined; requestId: string | undefined }
) {
    const entry = await prisma.education.findUnique({
        where: { id: entryId },
        select: { userId: true },
    });

    if (!entry || entry.userId !== userId) {
        throw new Error("EDUCATION_ENTRY_NOT_FOUND");
    }

    await prisma.education.delete({
        where: { id: entryId },
    });

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { type: "education_deleted", entryId },
    });
}
