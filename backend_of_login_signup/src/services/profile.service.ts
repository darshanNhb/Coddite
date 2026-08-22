import prisma from "../config/prisma.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { uploadProfilePhoto as uploadToCloud, deleteProfilePhoto as deleteFromCloud } from "./storage.service.js";
import { createEmailChangeOtp, verifyEmailChangeOtp } from "./email-change.service.js";
import { createAccountDeleteOtp, verifyAccountDeleteOtp } from "./account-delete.service.js";
import { createPasswordResetOtp, verifyPasswordResetOtp } from "./password-reset.service.js";
import { sendEmailChangeOtp, sendAccountDeleteOtp, sendPasswordResetOtp } from "./email.service.js";
import { createAuditLog } from "./audit.service.js";

export interface RequestContext {
    ipAddress: string | undefined;
    userAgent: string | undefined;
    requestId: string | undefined;
}

// ─── Get Full Profile ────────────────────────────────────


export async function getFullProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            mobileNumber: true,
            emailVerified: true,
            profilePhotoUrl: true,
            gender: true,
            location: true,
            birthday: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            socialLinks: {
                orderBy: { createdAt: "asc" },
            },
            educations: {
                orderBy: { createdAt: "desc" },
            },
            workExperiences: {
                orderBy: { createdAt: "desc" },
            },
            skills: {
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    return user;
}

// ─── Update General Profile ──────────────────────────────

interface UpdateProfileData {
    fullName?: string | undefined;
    username?: string | undefined;
    gender?: string | null | undefined;
    location?: string | null | undefined;
    birthday?: Date | null | undefined;
}

export async function updateGeneralProfile(
    userId: string,
    data: UpdateProfileData,
    context: RequestContext
) {
    // Check username uniqueness if changing
    if (data.username !== undefined) {
        const normalized = data.username.trim().toLowerCase();
        const existing = await prisma.user.findFirst({
            where: {
                username: normalized,
                NOT: { id: userId },
            },
            select: { id: true },
        });

        if (existing) {
            throw new Error("USERNAME_TAKEN");
        }
    }

    const updateData: Record<string, unknown> = {};

    if (data.fullName !== undefined) {
        updateData.fullName = data.fullName.trim();
    }
    if (data.username !== undefined) {
        updateData.username = data.username.trim().toLowerCase();
    }
    if (data.gender !== undefined) {
        updateData.gender = data.gender;
    }
    if (data.location !== undefined) {
        updateData.location = data.location === null ? null : data.location.trim();
    }
    if (data.birthday !== undefined) {
        updateData.birthday = data.birthday;
    }

    let updatedUser;
    try {
        updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                mobileNumber: true,
                emailVerified: true,
                profilePhotoUrl: true,
                gender: true,
                location: true,
                birthday: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
            throw new Error("USERNAME_TAKEN");
        }
        throw error;
    }

    await createAuditLog({
        userId,
        event: "PROFILE_UPDATED",
        ...context,
        metadata: { fields: Object.keys(updateData) },
    });

    return updatedUser;
}

// ─── Upload Profile Photo ────────────────────────────────

export async function handleProfilePhotoUpload(
    userId: string,
    buffer: Buffer,
    context: RequestContext
) {
    // Get current photo to delete later
    const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePhotoPublicId: true },
    });

    const result = await uploadToCloud(buffer, userId);

    // Delete old photo from cloud if it exists
    if (current?.profilePhotoPublicId) {
        await deleteFromCloud(current.profilePhotoPublicId);
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            profilePhotoUrl: result.url,
            profilePhotoPublicId: result.publicId,
        },
    });

    await createAuditLog({
        userId,
        event: "PROFILE_PHOTO_CHANGED",
        ...context,
        metadata: { action: "upload" },
    });

    return { profilePhotoUrl: result.url };
}

// ─── Remove Profile Photo ────────────────────────────────

export async function handleProfilePhotoRemove(
    userId: string,
    context: RequestContext
) {
    const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { profilePhotoPublicId: true, profilePhotoUrl: true },
    });

    if (!current?.profilePhotoUrl) {
        throw new Error("NO_PROFILE_PHOTO");
    }

    if (current.profilePhotoPublicId) {
        await deleteFromCloud(current.profilePhotoPublicId);
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            profilePhotoUrl: null,
            profilePhotoPublicId: null,
        },
    });

    await createAuditLog({
        userId,
        event: "PROFILE_PHOTO_CHANGED",
        ...context,
        metadata: { action: "remove" },
    });
}

// ─── Change Password (User knows current password) ──────

export async function changePasswordWithCurrent(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId: string,
    context: RequestContext
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);

    if (!valid) {
        throw new Error("INVALID_CURRENT_PASSWORD");
    }

    const newHash = await hashPassword(newPassword);

    // Update password and revoke all other sessions
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        }),
        prisma.session.updateMany({
            where: {
                userId,
                revokedAt: null,
                NOT: { id: currentSessionId },
            },
            data: { revokedAt: new Date() },
        }),
    ]);

    await createAuditLog({
        userId,
        event: "PASSWORD_CHANGED",
        ...context,
        metadata: { reason: "user_changed" },
    });
}

// ─── Forgot Password from Profile (Request OTP) ─────────

export async function requestForgotPasswordFromProfile(
    userId: string,
    context: RequestContext
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true },
    });

    if (!user || !user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
    }

    const otp = await createPasswordResetOtp(user.email);
    await sendPasswordResetOtp(user.email, otp);

    await createAuditLog({
        userId,
        event: "OTP_REQUESTED",
        ...context,
        metadata: { type: "profile_password_reset" },
    });
}

// ─── Forgot Password from Profile (Verify OTP + Set) ────

export async function resetPasswordFromProfile(
    userId: string,
    otp: string,
    newPassword: string,
    context: RequestContext
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const verified = await verifyPasswordResetOtp(user.email, otp);

    if (!verified) {
        throw new Error("INVALID_OTP");
    }

    const newHash = await hashPassword(newPassword);

    // Update password and revoke ALL sessions
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newHash },
        }),
        prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
    ]);

    await createAuditLog({
        userId,
        event: "PASSWORD_CHANGED",
        ...context,
        metadata: { reason: "profile_password_reset" },
    });
}

// ─── Email Change (Request OTP) ──────────────────────────

export async function requestEmailChange(
    userId: string,
    newEmail: string,
    context: RequestContext
) {
    const normalizedEmail = newEmail.toLowerCase().trim();

    // Check that user's current email is verified
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    if (normalizedEmail === user.email) {
        throw new Error("EMAIL_SAME_AS_CURRENT");
    }

    // Check that new email is not already used by someone else
    const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
    });

    if (existing && existing.id !== userId) {
        throw new Error("EMAIL_ALREADY_USED");
    }

    const otp = await createEmailChangeOtp(userId, normalizedEmail);
    await sendEmailChangeOtp(normalizedEmail, otp);

    await createAuditLog({
        userId,
        event: "EMAIL_CHANGE_REQUESTED",
        ...context,
        metadata: { newEmail: normalizedEmail },
    });
}

// ─── Email Change (Verify OTP) ───────────────────────────

export async function verifyEmailChange(
    userId: string,
    otp: string,
    context: RequestContext
) {
    const newEmail = await verifyEmailChangeOtp(userId, otp);

    if (!newEmail) {
        throw new Error("INVALID_OTP");
    }

    // Double-check that email is still available
    const existing = await prisma.user.findUnique({
        where: { email: newEmail },
        select: { id: true },
    });

    if (existing && existing.id !== userId) {
        throw new Error("EMAIL_ALREADY_USED");
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                email: newEmail,
                emailVerified: true,
            },
        });
    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
            throw new Error("EMAIL_ALREADY_USED");
        }
        throw error;
    }

    await createAuditLog({
        userId,
        event: "EMAIL_CHANGED",
        ...context,
        metadata: { newEmail },
    });
}

// ─── Active Sessions ─────────────────────────────────────

export async function getActiveSessions(
    userId: string,
    currentSessionId: string
) {
    const sessions = await prisma.session.findMany({
        where: {
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
        },
        select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            lastUsedAt: true,
            createdAt: true,
        },
        orderBy: { lastUsedAt: "desc" },
    });

    return sessions.map((session) => ({
        ...session,
        isCurrent: session.id === currentSessionId,
    }));
}

// ─── Revoke Session ──────────────────────────────────────

export async function revokeSession(
    userId: string,
    sessionId: string,
    context: RequestContext
) {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { userId: true, revokedAt: true },
    });

    if (!session || session.userId !== userId) {
        throw new Error("SESSION_NOT_FOUND");
    }

    if (session.revokedAt) {
        throw new Error("SESSION_ALREADY_REVOKED");
    }

    await prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
    });

    await createAuditLog({
        userId,
        event: "SESSION_REVOKED",
        ...context,
        metadata: { revokedSessionId: sessionId },
    });
}

// ─── Logout All Devices ──────────────────────────────────

export async function logoutAllDevices(
    userId: string,
    context: RequestContext
) {
    await prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });

    await createAuditLog({
        userId,
        event: "LOGOUT_ALL",
        ...context,
        metadata: { scope: "all_devices" },
    });
}

// ─── Account Deletion (Request OTP) ──────────────────────

export async function requestAccountDelete(
    userId: string,
    context: RequestContext
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true },
    });

    if (!user || !user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
    }

    const otp = await createAccountDeleteOtp(user.email);
    await sendAccountDeleteOtp(user.email, otp);

    await createAuditLog({
        userId,
        event: "ACCOUNT_DELETE_REQUESTED",
        ...context,
    });
}

// ─── Account Deletion (Verify OTP) ───────────────────────

export async function verifyAccountDelete(
    userId: string,
    otp: string,
    context: RequestContext
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, profilePhotoPublicId: true },
    });

    if (!user) {
        throw new Error("USER_NOT_FOUND");
    }

    const verified = await verifyAccountDeleteOtp(user.email, otp);

    if (!verified) {
        throw new Error("INVALID_OTP");
    }

    // Delete profile photo from Cloudinary
    if (user.profilePhotoPublicId) {
        await deleteFromCloud(user.profilePhotoPublicId);
    }

    // Cascade cleanup: delete social links, work, education, skills
    // then soft-delete user by marking as DELETED
    await prisma.$transaction([
        prisma.socialLink.deleteMany({ where: { userId } }),
        prisma.workExperience.deleteMany({ where: { userId } }),
        prisma.education.deleteMany({ where: { userId } }),
        prisma.userSkill.deleteMany({ where: { userId } }),
        prisma.session.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        }),
        prisma.user.update({
            where: { id: userId },
            data: {
                status: "DELETED",
                profilePhotoUrl: null,
                profilePhotoPublicId: null,
                gender: null,
                location: null,
                birthday: null,
            },
        }),
    ]);

    await createAuditLog({
        userId,
        event: "ACCOUNT_DELETED",
        ...context,
    });
}
