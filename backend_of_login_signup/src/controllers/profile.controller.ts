import type { Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { getRequestContext } from "../utils/request-context.js";
import { clearRefreshTokenCookie } from "../utils/auth-cookie.js";

import * as profileService from "../services/profile.service.js";
import * as socialLinkService from "../services/social-link.service.js";
import * as workService from "../services/work.service.js";
import * as educationService from "../services/education.service.js";
import * as skillService from "../services/skill.service.js";

// ─── Zod Schemas ─────────────────────────────────────────

const updateProfileSchema = z.object({
    fullName: z
        .string()
        .trim()
        .min(2, "Display name must be at least 2 characters")
        .max(100, "Display name is too long")
        .optional(),

    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username is too long")
        .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can contain only letters, numbers and underscores"
        )
        .optional(),

    gender: z
        .enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
        .nullable()
        .optional(),

    location: z
        .string()
        .trim()
        .max(200, "Location must be at most 200 characters")
        .nullable()
        .optional(),

    birthday: z
        .string()
        .nullable()
        .optional()
        .transform((val) => {
            if (val === null || val === undefined || val === "") return null;
            const date = new Date(val);
            if (isNaN(date.getTime())) return "INVALID" as const;
            if (date > new Date()) return "FUTURE" as const;
            return date;
        }),
});

const httpUrlSchema = z
    .string()
    .url("Invalid URL")
    .refine(
        (url) => url.startsWith("http://") || url.startsWith("https://"),
        "Only HTTP and HTTPS URLs are allowed"
    );

const socialLinkSchema = z.object({
    platform: z.enum(["GITHUB", "LINKEDIN", "TWITTER", "PERSONAL_WEBSITE", "OTHER"]),
    url: httpUrlSchema,
    label: z.string().trim().max(100).optional(),
});

const updateSocialLinkSchema = z.object({
    platform: z.enum(["GITHUB", "LINKEDIN", "TWITTER", "PERSONAL_WEBSITE", "OTHER"]).optional(),
    url: httpUrlSchema.optional(),
    label: z.string().trim().max(100).nullable().optional(),
});

const workSchema = z.object({
    jobTitle: z.string().trim().min(1, "Job title is required").max(200),
    company: z.string().trim().min(1, "Company is required").max(200),
    employmentType: z.string().trim().max(100).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    startDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    endDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    current: z.boolean().optional(),
});

const updateWorkSchema = z.object({
    jobTitle: z.string().trim().min(1).max(200).optional(),
    company: z.string().trim().min(1).max(200).optional(),
    employmentType: z.string().trim().max(100).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    startDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    endDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    current: z.boolean().optional(),
});

const educationSchema = z.object({
    institution: z.string().trim().min(1, "Institution is required").max(200),
    degree: z.string().trim().max(200).nullable().optional(),
    fieldOfStudy: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    startDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    endDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    current: z.boolean().optional(),
});

const updateEducationSchema = z.object({
    institution: z.string().trim().min(1).max(200).optional(),
    degree: z.string().trim().max(200).nullable().optional(),
    fieldOfStudy: z.string().trim().max(200).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    startDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    endDate: z.string().nullable().optional().transform((v) => (v ? new Date(v) : null)),
    current: z.boolean().optional(),
});

const skillSchema = z.object({
    name: z.string().trim().min(1, "Skill name is required").max(50, "Skill name is too long"),
});

const emailChangeRequestSchema = z.object({
    newEmail: z.string().trim().toLowerCase().email("Invalid email address"),
});

const otpSchema = z.object({
    otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const passwordSchema = z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password is too long")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

const resetPasswordVerifySchema = z
    .object({
        otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
        newPassword: passwordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// ─── Helper: get user ID from auth ───────────────────────

function getUserAuth(req: AuthenticatedRequest) {
    if (!req.user) return null;
    return req.user;
}

function sendValidationError(res: Response, result: any) {
    res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten().fieldErrors,
    });
}

function handleServiceError(res: Response, error: unknown) {
    if (error instanceof Error) {
        const errorMap: Record<string, { status: number; message: string }> = {
            USER_NOT_FOUND: { status: 404, message: "User not found" },
            USERNAME_TAKEN: { status: 409, message: "Username is already taken" },
            NO_PROFILE_PHOTO: { status: 400, message: "No profile photo to remove" },
            INVALID_CURRENT_PASSWORD: { status: 401, message: "Current password is incorrect" },
            EMAIL_NOT_VERIFIED: { status: 400, message: "Email is not verified" },
            EMAIL_ALREADY_USED: { status: 409, message: "Email is already registered with another account" },
            EMAIL_SAME_AS_CURRENT: { status: 400, message: "New email must be different from your current email" },
            INVALID_OTP: { status: 400, message: "Invalid OTP" },
            OTP_EXPIRED: { status: 400, message: "OTP expired. Please request a new one" },
            OTP_ATTEMPTS_EXCEEDED: { status: 429, message: "Too many incorrect OTP attempts" },
            OTP_RESEND_COOLDOWN: { status: 429, message: "Please wait before requesting another OTP" },
            MAX_SOCIAL_LINKS_REACHED: { status: 400, message: "Maximum of 5 social links allowed" },
            SOCIAL_LINK_NOT_FOUND: { status: 404, message: "Social link not found" },
            MAX_WORK_ENTRIES_REACHED: { status: 400, message: "Maximum of 5 work entries allowed" },
            WORK_ENTRY_NOT_FOUND: { status: 404, message: "Work experience not found" },
            MAX_EDUCATION_ENTRIES_REACHED: { status: 400, message: "Maximum of 5 education entries allowed" },
            EDUCATION_ENTRY_NOT_FOUND: { status: 404, message: "Education entry not found" },
            MAX_SKILLS_REACHED: { status: 400, message: "Maximum of 7 skills allowed" },
            DUPLICATE_SKILL: { status: 409, message: "Skill already exists" },
            SKILL_NOT_FOUND: { status: 404, message: "Skill not found" },
            SESSION_NOT_FOUND: { status: 404, message: "Session not found" },
            SESSION_ALREADY_REVOKED: { status: 400, message: "Session is already revoked" },
            CLOUDINARY_NOT_CONFIGURED: { status: 500, message: "Photo upload is not configured" },
        };

        const mapped = errorMap[error.message];
        if (mapped) {
            res.status(mapped.status).json({
                success: false,
                message: mapped.message,
            });
            return;
        }
    }

    console.error("Profile controller error:", error);
    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}

// ═════════════════════════════════════════════════════════
// GET /api/profile
// ═════════════════════════════════════════════════════════

export async function getProfile(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        const profile = await profileService.getFullProfile(auth.id);
        res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: { profile },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// PATCH /api/profile
// ═════════════════════════════════════════════════════════

export async function updateProfile(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    const data = result.data;

    // Check birthday transform results
    if (data.birthday === ("INVALID" as unknown)) {
        res.status(400).json({ success: false, message: "Invalid birthday date" });
        return;
    }
    if (data.birthday === ("FUTURE" as unknown)) {
        res.status(400).json({ success: false, message: "Birthday cannot be in the future" });
        return;
    }

    try {
        const profile = await profileService.updateGeneralProfile(
            auth.id,
            {
                fullName: data.fullName,
                username: data.username,
                gender: data.gender,
                location: data.location,
                birthday: data.birthday as Date | null | undefined,
            },
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: { profile },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/photo
// ═════════════════════════════════════════════════════════

export async function uploadProfilePhoto(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    if (!req.file) {
        res.status(400).json({ success: false, message: "No image file provided" });
        return;
    }

    try {
        const result = await profileService.handleProfilePhotoUpload(
            auth.id,
            req.file.buffer,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Profile photo uploaded successfully",
            data: result,
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// DELETE /api/profile/photo
// ═════════════════════════════════════════════════════════

export async function removeProfilePhoto(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await profileService.handleProfilePhotoRemove(auth.id, getRequestContext(req));
        res.status(200).json({
            success: true,
            message: "Profile photo removed successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/social-links
// ═════════════════════════════════════════════════════════

export async function addSocialLink(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = socialLinkSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        const link = await socialLinkService.addSocialLink(
            auth.id,
            result.data,
            getRequestContext(req)
        );
        res.status(201).json({
            success: true,
            message: "Social link added successfully",
            data: { socialLink: link },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// PATCH /api/profile/social-links/:id
// ═════════════════════════════════════════════════════════

export async function updateSocialLink(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = updateSocialLinkSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        const link = await socialLinkService.updateSocialLink(
            auth.id,
            (req.params.id as string),
            result.data,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Social link updated successfully",
            data: { socialLink: link },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// DELETE /api/profile/social-links/:id
// ═════════════════════════════════════════════════════════

export async function deleteSocialLink(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await socialLinkService.deleteSocialLink(
            auth.id,
            (req.params.id as string),
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Social link deleted successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/work
// ═════════════════════════════════════════════════════════

export async function addWork(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = workSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        const entry = await workService.addWorkExperience(
            auth.id,
            result.data,
            getRequestContext(req)
        );
        res.status(201).json({
            success: true,
            message: "Work experience added successfully",
            data: { work: entry },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// PATCH /api/profile/work/:id
// ═════════════════════════════════════════════════════════

export async function updateWork(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = updateWorkSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        const entry = await workService.updateWorkExperience(
            auth.id,
            (req.params.id as string),
            result.data,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Work experience updated successfully",
            data: { work: entry },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// DELETE /api/profile/work/:id
// ═════════════════════════════════════════════════════════

export async function deleteWork(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await workService.deleteWorkExperience(
            auth.id,
            (req.params.id as string),
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Work experience deleted successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/education
// ═════════════════════════════════════════════════════════

export async function addEducation(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = educationSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        const entry = await educationService.addEducation(
            auth.id,
            result.data,
            getRequestContext(req)
        );
        res.status(201).json({
            success: true,
            message: "Education added successfully",
            data: { education: entry },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// PATCH /api/profile/education/:id
// ═════════════════════════════════════════════════════════

export async function updateEducation(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = updateEducationSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        const entry = await educationService.updateEducation(
            auth.id,
            (req.params.id as string),
            result.data,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Education updated successfully",
            data: { education: entry },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// DELETE /api/profile/education/:id
// ═════════════════════════════════════════════════════════

export async function deleteEducation(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await educationService.deleteEducation(
            auth.id,
            (req.params.id as string),
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Education deleted successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/skills
// ═════════════════════════════════════════════════════════

export async function addSkill(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = skillSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        const skill = await skillService.addSkill(
            auth.id,
            result.data.name,
            getRequestContext(req)
        );
        res.status(201).json({
            success: true,
            message: "Skill added successfully",
            data: { skill },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// DELETE /api/profile/skills/:id
// ═════════════════════════════════════════════════════════

export async function deleteSkill(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await skillService.deleteSkill(
            auth.id,
            (req.params.id as string),
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Skill deleted successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/email/change/request
// ═════════════════════════════════════════════════════════

export async function requestEmailChange(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = emailChangeRequestSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        await profileService.requestEmailChange(
            auth.id,
            result.data.newEmail,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Verification code sent to your new email",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/email/change/verify
// ═════════════════════════════════════════════════════════

export async function verifyEmailChange(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = otpSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        await profileService.verifyEmailChange(
            auth.id,
            result.data.otp,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Email changed successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/password/change
// ═════════════════════════════════════════════════════════

export async function changePassword(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        await profileService.changePasswordWithCurrent(
            auth.id,
            result.data.currentPassword,
            result.data.newPassword,
            auth.sessionId,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/password/reset/request
// ═════════════════════════════════════════════════════════

export async function requestPasswordReset(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await profileService.requestForgotPasswordFromProfile(
            auth.id,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Password reset code sent to your email",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/password/reset/verify
// ═════════════════════════════════════════════════════════

export async function verifyPasswordReset(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = resetPasswordVerifySchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        await profileService.resetPasswordFromProfile(
            auth.id,
            result.data.otp,
            result.data.newPassword,
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Password reset successfully. Please log in again.",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// GET /api/profile/sessions
// ═════════════════════════════════════════════════════════

export async function getActiveSessions(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        const sessions = await profileService.getActiveSessions(
            auth.id,
            auth.sessionId
        );
        res.status(200).json({
            success: true,
            message: "Active sessions fetched successfully",
            data: { sessions },
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// DELETE /api/profile/sessions/:id
// ═════════════════════════════════════════════════════════

export async function revokeSession(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await profileService.revokeSession(
            auth.id,
            (req.params.id as string),
            getRequestContext(req)
        );
        res.status(200).json({
            success: true,
            message: "Session revoked successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/sessions/logout-all
// ═════════════════════════════════════════════════════════

export async function logoutAllDevices(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await profileService.logoutAllDevices(auth.id, getRequestContext(req));
        clearRefreshTokenCookie(res);
        res.status(200).json({
            success: true,
            message: "Logged out from all devices",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/delete/request
// ═════════════════════════════════════════════════════════

export async function requestAccountDelete(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    try {
        await profileService.requestAccountDelete(auth.id, getRequestContext(req));
        res.status(200).json({
            success: true,
            message: "Account deletion code sent to your email",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}

// ═════════════════════════════════════════════════════════
// POST /api/profile/delete/verify
// ═════════════════════════════════════════════════════════

export async function verifyAccountDelete(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    const auth = getUserAuth(req);
    if (!auth) {
        res.status(401).json({ success: false, message: "Authentication required" });
        return;
    }

    const result = otpSchema.safeParse(req.body);
    if (!result.success) {
        sendValidationError(res, result);
        return;
    }

    try {
        await profileService.verifyAccountDelete(
            auth.id,
            result.data.otp,
            getRequestContext(req)
        );
        clearRefreshTokenCookie(res);
        res.status(200).json({
            success: true,
            message: "Account deleted successfully",
        });
    } catch (error) {
        handleServiceError(res, error);
    }
}
