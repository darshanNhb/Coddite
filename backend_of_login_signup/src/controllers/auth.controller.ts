import type { Request, Response } from "express";
import { z } from "zod";

import prisma from "../config/prisma.js";

import {
    hashPassword,
    verifyPassword,
} from "../utils/password.js";

import {
    createSignupOtp,
    verifySignupOtp,
} from "../services/otp.service.js";

import {
    savePendingSignup,
    getPendingSignup,
    deletePendingSignup,
} from "../services/signup.service.js";

import {
    sendVerificationOtp,
    sendPasswordResetOtp,
} from "../services/email.service.js";

import {
    createPasswordResetOtp,
    verifyPasswordResetOtp,
} from "../services/password-reset.service.js";

import {
    createSession,
    rotateSession,
} from "../services/session.service.js";

import {
    createAccessToken,
} from "../utils/jwt.js";

import {
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
    REFRESH_COOKIE_NAME,
} from "../utils/auth-cookie.js";

import {
    extractSessionId,
} from "../utils/refresh-token.js";

import type {
    AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

import {
    createAuditLog,
} from "../services/audit.service.js";

import {
    getRequestContext,
} from "../utils/request-context.js";


// ---------------------------------------------------------
// Password schema
// ---------------------------------------------------------

const passwordSchema = z
    .string()
    .min(
        12,
        "Password must be at least 12 characters"
    )
    .max(
        128,
        "Password is too long"
    )
    .regex(
        /[A-Z]/,
        "Password must contain an uppercase letter"
    )
    .regex(
        /[a-z]/,
        "Password must contain a lowercase letter"
    )
    .regex(
        /[0-9]/,
        "Password must contain a number"
    )
    .regex(
        /[^A-Za-z0-9]/,
        "Password must contain a special character"
    );


// ---------------------------------------------------------
// Signup schema
// ---------------------------------------------------------

const signupSchema = z
    .object({
        fullName: z
            .string()
            .trim()
            .min(
                2,
                "Full name must be at least 2 characters"
            )
            .max(
                100,
                "Full name is too long"
            ),

        username: z
            .string()
            .trim()
            .min(
                3,
                "Username must be at least 3 characters"
            )
            .max(
                30,
                "Username is too long"
            )
            .regex(
                /^[a-zA-Z0-9_]+$/,
                "Username can contain only letters, numbers and underscores"
            ),

        email: z
            .string()
            .trim()
            .toLowerCase()
            .email("Invalid email address"),

        mobileNumber: z
            .string()
            .trim()
            .regex(
                /^\+?[1-9]\d{9,14}$/,
                "Invalid mobile number"
            )
            .optional(),

        password: passwordSchema,

        confirmPassword: z.string(),
    })
    .refine(
        (data) =>
            data.password === data.confirmPassword,
        {
            message: "Passwords do not match",
            path: ["confirmPassword"],
        }
    );


// ---------------------------------------------------------
// Email verification schema
// ---------------------------------------------------------

const verifyEmailSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),

    otp: z
        .string()
        .regex(
            /^\d{6}$/,
            "OTP must be 6 digits"
        ),
});


// ---------------------------------------------------------
// Login schema
// ---------------------------------------------------------

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),

    password: z
        .string()
        .min(
            1,
            "Password is required"
        )
        .max(
            128,
            "Password is too long"
        ),
});


// ---------------------------------------------------------
// Forgot password schema
// ---------------------------------------------------------

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email address"),
});


// ---------------------------------------------------------
// Reset password schema
// ---------------------------------------------------------

const resetPasswordSchema = z
    .object({
        email: z
            .string()
            .trim()
            .toLowerCase()
            .email("Invalid email address"),

        otp: z
            .string()
            .regex(
                /^\d{6}$/,
                "OTP must be 6 digits"
            ),

        newPassword: passwordSchema,

        confirmPassword: z.string(),
    })
    .refine(
        (data) =>
            data.newPassword ===
            data.confirmPassword,
        {
            message: "Passwords do not match",
            path: ["confirmPassword"],
        }
    );


// =========================================================
// SIGNUP
// =========================================================

export async function signup(
    req: Request,
    res: Response
): Promise<void> {
    const result =
        signupSchema.safeParse(req.body);

    if (!result.success) {
        res.status(400).json({
            success: false,
            message:
                "Invalid signup information",
            errors:
                result.error.flatten()
                    .fieldErrors,
        });

        return;
    }

    const {
        fullName,
        username,
        email,
        mobileNumber,
        password,
    } = result.data;

    try {
        const existingUser =
            await prisma.user.findFirst({
                where: {
                    OR: [
                        { email },
                        { username },
                    ],
                },
                select: {
                    email: true,
                    username: true,
                },
            });

        if (
            existingUser?.email === email
        ) {
            res.status(409).json({
                success: false,
                message:
                    "Email is already registered",
            });

            return;
        }

        if (
            existingUser?.username ===
            username
        ) {
            res.status(409).json({
                success: false,
                message:
                    "Username is already taken",
            });

            return;
        }

        const passwordHash =
            await hashPassword(password);

        await savePendingSignup({
            fullName,
            username,
            email,
            mobileNumber,
            passwordHash,
        });

        const otp =
            await createSignupOtp(email);

        await sendVerificationOtp(
            email,
            otp
        );

        await createAuditLog({
            event: "OTP_REQUESTED",
            ...getRequestContext(req),
            metadata: {
                type: "signup",
            },
        });

        res.status(200).json({
            success: true,
            message:
                "Verification OTP sent to your email",
        });
    } catch (error) {
        console.error(
            "Signup error:",
            error
        );

        if (
            error instanceof Error &&
            error.message ===
                "OTP_RESEND_COOLDOWN"
        ) {
            res.status(429).json({
                success: false,
                message:
                    "Please wait before requesting another OTP",
            });

            return;
        }

        res.status(500).json({
            success: false,
            message:
                "Unable to process signup",
        });
    }
}


// =========================================================
// VERIFY EMAIL
// =========================================================

export async function verifyEmail(
    req: Request,
    res: Response
): Promise<void> {
    const result =
        verifyEmailSchema.safeParse(
            req.body
        );

    if (!result.success) {
        res.status(400).json({
            success: false,
            message:
                "Invalid verification data",
            errors:
                result.error.flatten()
                    .fieldErrors,
        });

        return;
    }

    const {
        email,
        otp,
    } = result.data;

    try {
        const pendingSignup =
            await getPendingSignup(email);

        if (!pendingSignup) {
            res.status(400).json({
                success: false,
                message:
                    "Signup session expired. Please register again.",
            });

            return;
        }

        const verified =
            await verifySignupOtp(
                email,
                otp
            );

        if (!verified) {
            await createAuditLog({
                event:
                    "OTP_VERIFICATION_FAILED",
                ...getRequestContext(req),
                metadata: {
                    type: "signup",
                },
            });

            res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });

            return;
        }

        const existingUser =
            await prisma.user.findFirst({
                where: {
                    OR: [
                        {
                            email:
                                pendingSignup.email,
                        },
                        {
                            username:
                                pendingSignup.username,
                        },
                    ],
                },
                select: {
                    email: true,
                    username: true,
                },
            });

        if (existingUser) {
            await deletePendingSignup(
                email
            );

            res.status(409).json({
                success: false,
                message:
                    "Account information is no longer available",
            });

            return;
        }

        const user =
            await prisma.user.create({
                data: {
                    fullName:
                        pendingSignup.fullName,

                    username:
                        pendingSignup.username,

                    email:
                        pendingSignup.email,

                    mobileNumber:
                        pendingSignup.mobileNumber,

                    passwordHash:
                        pendingSignup.passwordHash,

                    emailVerified:
                        true,
                },

                select: {
                    id: true,
                    fullName: true,
                    username: true,
                    email: true,
                    emailVerified: true,
                    createdAt: true,
                },
            });

        await deletePendingSignup(
            email
        );

        res.status(201).json({
            success: true,
            message:
                "Account created successfully",
            user,
        });
    } catch (error) {
        console.error(
            "Email verification error:",
            error
        );

        if (
            error instanceof Error &&
            error.message ===
                "OTP_EXPIRED"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "OTP expired. Please request a new OTP.",
            });

            return;
        }

        if (
            error instanceof Error &&
            error.message ===
                "OTP_ATTEMPTS_EXCEEDED"
        ) {
            res.status(429).json({
                success: false,
                message:
                    "Too many incorrect OTP attempts.",
            });

            return;
        }

        res.status(500).json({
            success: false,
            message:
                "Unable to verify email",
        });
    }
}


// =========================================================
// LOGIN
// =========================================================

export async function login(
    req: Request,
    res: Response
): Promise<void> {
    const result =
        loginSchema.safeParse(req.body);

    if (!result.success) {
        res.status(400).json({
            success: false,
            message:
                "Invalid login information",
            errors:
                result.error.flatten()
                    .fieldErrors,
        });

        return;
    }

    const {
        email,
        password,
    } = result.data;

    try {
        const user =
            await prisma.user.findUnique({
                where: {
                    email,
                },
            });

        if (!user) {
            await createAuditLog({
                event: "LOGIN_FAILURE",
                ...getRequestContext(req),
                metadata: {
                    reason:
                        "invalid_credentials",
                },
            });

            res.status(401).json({
                success: false,
                message:
                    "Invalid email or password",
            });

            return;
        }

        if (user.status !== "ACTIVE") {
            res.status(403).json({
                success: false,
                message:
                    "Your account is not active",
            });

            return;
        }

        if (!user.emailVerified) {
            res.status(403).json({
                success: false,
                message:
                    "Please verify your email before logging in",
            });

            return;
        }

        const passwordValid =
            await verifyPassword(
                password,
                user.passwordHash
            );

        if (!passwordValid) {
            await createAuditLog({
                userId: user.id,
                event: "LOGIN_FAILURE",
                ...getRequestContext(req),
                metadata: {
                    reason:
                        "invalid_password",
                },
            });

            res.status(401).json({
                success: false,
                message:
                    "Invalid email or password",
            });

            return;
        }

        const userAgent =
            req.get("user-agent") ??
            undefined;

        const ipAddress =
            req.ip;

        const {
            session,
            refreshToken,
        } =
            await createSession({
                userId: user.id,
                userAgent,
                ipAddress,
            });

        const accessToken =
            await createAccessToken({
                userId: user.id,
                sessionId: session.id,
                role: user.role,
            });

        setRefreshTokenCookie(
            res,
            refreshToken,
            session.expiresAt
        );

        const context =
            getRequestContext(req);

        await createAuditLog({
            userId: user.id,
            event: "LOGIN_SUCCESS",
            ...context,
        });

        await createAuditLog({
            userId: user.id,
            event: "SESSION_CREATED",
            ...context,
        });

        res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            user: {
                id: user.id,
                fullName:
                    user.fullName,
                username:
                    user.username,
                email:
                    user.email,
                mobileNumber:
                    user.mobileNumber,
                emailVerified:
                    user.emailVerified,
                role: user.role,
            },
        });
    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to process login",
        });
    }
}


// =========================================================
// REFRESH TOKEN
// =========================================================

export async function refresh(
    req: Request,
    res: Response
): Promise<void> {
    const refreshToken =
        req.cookies?.[
            REFRESH_COOKIE_NAME
        ];

    if (!refreshToken) {
        res.status(401).json({
            success: false,
            message:
                "Refresh token is missing",
        });

        return;
    }

    const sessionId =
        extractSessionId(
            refreshToken
        );

    if (!sessionId) {
        clearRefreshTokenCookie(
            res
        );

        res.status(401).json({
            success: false,
            message:
                "Invalid refresh token",
        });

        return;
    }

    try {
        const result =
            await rotateSession(
                sessionId,
                refreshToken
            );

        if (
            result.user.status !==
            "ACTIVE"
        ) {
            clearRefreshTokenCookie(
                res
            );

            res.status(403).json({
                success: false,
                message:
                    "Your account is not active",
            });

            return;
        }

        const accessToken =
            await createAccessToken({
                userId:
                    result.user.id,
                sessionId:
                    result.session.id,
                role:
                    result.user.role,
            });

        setRefreshTokenCookie(
            res,
            result.refreshToken,
            result.session
                .expiresAt
        );

        res.status(200).json({
            success: true,
            accessToken,
        });
    } catch (error) {
        clearRefreshTokenCookie(
            res
        );

        if (
            error instanceof Error &&
            error.message ===
                "REFRESH_TOKEN_REUSE"
        ) {
            await createAuditLog({
                event:
                    "REFRESH_REUSE_DETECTED",
                ...getRequestContext(req),
                metadata: {
                    sessionId,
                },
            });

            res.status(401).json({
                success: false,
                message:
                    "Refresh token reuse detected. Please log in again.",
            });

            return;
        }

        if (
            error instanceof Error &&
            error.message ===
                "SESSION_EXPIRED"
        ) {
            res.status(401).json({
                success: false,
                message:
                    "Session has expired",
            });

            return;
        }

        if (
            error instanceof Error &&
            error.message ===
                "SESSION_REVOKED"
        ) {
            res.status(401).json({
                success: false,
                message:
                    "Session has been revoked",
            });

            return;
        }

        console.error(
            "Refresh token error:",
            error
        );

        res.status(401).json({
            success: false,
            message:
                "Invalid refresh token",
        });
    }
}


// =========================================================
// GET CURRENT USER
// =========================================================

export async function getMe(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });

        return;
    }

    const user =
        await prisma.user.findUnique({
            where: {
                id: req.user.id,
            },

            select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                mobileNumber: true,
                emailVerified: true,
                role: true,
                status: true,
                createdAt: true,
            },
        });

    if (!user) {
        res.status(404).json({
            success: false,
            message:
                "User not found",
        });

        return;
    }

    res.status(200).json({
        success: true,
        user,
    });
}


// =========================================================
// LOGOUT
// =========================================================

export async function logout(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    if (!req.user) {
        clearRefreshTokenCookie(
            res
        );

        res.status(200).json({
            success: true,
            message:
                "Logged out successfully",
        });

        return;
    }

    await prisma.session.update({
        where: {
            id: req.user.sessionId,
        },

        data: {
            revokedAt: new Date(),
        },
    });

    await createAuditLog({
        userId: req.user.id,
        event: "SESSION_REVOKED",
        ...getRequestContext(req),
    });

    await createAuditLog({
        userId: req.user.id,
        event: "LOGOUT",
        ...getRequestContext(req),
    });

    clearRefreshTokenCookie(
        res
    );

    res.status(200).json({
        success: true,
        message:
            "Logged out successfully",
    });
}


// =========================================================
// LOGOUT ALL DEVICES
// =========================================================

export async function logoutAll(
    req: AuthenticatedRequest,
    res: Response
): Promise<void> {
    if (!req.user) {
        clearRefreshTokenCookie(
            res
        );

        res.status(401).json({
            success: false,
            message:
                "Authentication required",
        });

        return;
    }

    await prisma.session.updateMany({
        where: {
            userId: req.user.id,
            revokedAt: null,
        },

        data: {
            revokedAt: new Date(),
        },
    });

    const context =
        getRequestContext(req);

    await createAuditLog({
        userId: req.user.id,
        event: "LOGOUT_ALL",
        ...context,
    });

    await createAuditLog({
        userId: req.user.id,
        event: "SESSION_REVOKED",
        ...context,
        metadata: {
            scope: "all_devices",
        },
    });

    clearRefreshTokenCookie(
        res
    );

    res.status(200).json({
        success: true,
        message:
            "Logged out from all devices",
    });
}


// =========================================================
// FORGOT PASSWORD
// =========================================================

export async function forgotPassword(
    req: Request,
    res: Response
): Promise<void> {
    const result =
        forgotPasswordSchema.safeParse(
            req.body
        );

    if (!result.success) {
        res.status(400).json({
            success: false,
            message:
                "Invalid email address",
        });

        return;
    }

    const { email } =
        result.data;

    try {
        const user =
            await prisma.user.findUnique({
                where: {
                    email,
                },

                select: {
                    id: true,
                    emailVerified:
                        true,
                    status: true,
                },
            });

        if (
            user &&
            user.emailVerified &&
            user.status === "ACTIVE"
        ) {
            const otp =
                await createPasswordResetOtp(
                    email
                );

            await sendPasswordResetOtp(
                email,
                otp
            );

            await createAuditLog({
                userId: user.id,
                event:
                    "OTP_REQUESTED",
                ...getRequestContext(
                    req
                ),
                metadata: {
                    type:
                        "password_reset",
                },
            });
        }
    } catch (error) {
        if (
            error instanceof Error &&
            error.message ===
                "OTP_RESEND_COOLDOWN"
        ) {
            // Intentionally do not reveal
            // whether the account exists.
        } else {
            console.error(
                "Forgot password error:",
                error
            );
        }
    }

    res.status(200).json({
        success: true,
        message:
            "If an account exists for this email, a password reset code has been sent.",
    });
}


// =========================================================
// RESET PASSWORD
// =========================================================

export async function resetPassword(
    req: Request,
    res: Response
): Promise<void> {
    const result =
        resetPasswordSchema.safeParse(
            req.body
        );

    if (!result.success) {
        res.status(400).json({
            success: false,
            message:
                "Invalid password reset information",
            errors:
                result.error.flatten()
                    .fieldErrors,
        });

        return;
    }

    const {
        email,
        otp,
        newPassword,
    } = result.data;

    try {
        const verified =
            await verifyPasswordResetOtp(
                email,
                otp
            );

        if (!verified) {
            await createAuditLog({
                event:
                    "OTP_VERIFICATION_FAILED",
                ...getRequestContext(
                    req
                ),
                metadata: {
                    type:
                        "password_reset",
                },
            });

            res.status(400).json({
                success: false,
                message:
                    "Invalid OTP",
            });

            return;
        }

        const user =
            await prisma.user.findUnique({
                where: {
                    email,
                },

                select: {
                    id: true,
                    status: true,
                },
            });

        if (
            !user ||
            user.status !== "ACTIVE"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Unable to reset password",
            });

            return;
        }

        const newPasswordHash =
            await hashPassword(
                newPassword
            );

        await prisma.$transaction([
            prisma.user.update({
                where: {
                    id: user.id,
                },

                data: {
                    passwordHash:
                        newPasswordHash,
                },
            }),

            prisma.session.updateMany({
                where: {
                    userId: user.id,
                    revokedAt: null,
                },

                data: {
                    revokedAt:
                        new Date(),
                },
            }),
        ]);

        const context =
            getRequestContext(req);

        await createAuditLog({
            userId: user.id,
            event:
                "PASSWORD_CHANGED",
            ...context,
            metadata: {
                reason:
                    "password_reset",
            },
        });

        await createAuditLog({
            userId: user.id,
            event:
                "SESSION_REVOKED",
            ...context,
            metadata: {
                reason:
                    "password_reset",
                scope:
                    "all_devices",
            },
        });

        clearRefreshTokenCookie(
            res
        );

        res.status(200).json({
            success: true,
            message:
                "Password reset successfully. Please log in again.",
        });
    } catch (error) {
        if (
            error instanceof Error &&
            error.message ===
                "OTP_EXPIRED"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "OTP expired. Please request a new code.",
            });

            return;
        }

        if (
            error instanceof Error &&
            error.message ===
                "OTP_ATTEMPTS_EXCEEDED"
        ) {
            res.status(429).json({
                success: false,
                message:
                    "Too many incorrect OTP attempts.",
            });

            return;
        }

        console.error(
            "Password reset error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to reset password",
        });
    }
}