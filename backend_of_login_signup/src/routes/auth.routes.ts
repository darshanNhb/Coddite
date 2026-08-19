import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
    signup,
    verifyEmail,
    login,
    refresh,
    getMe,
    logout,
    logoutAll,
    forgotPassword,
    resetPassword,
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many signup attempts. Please try again later.",
    },
});

const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many verification attempts. Please try again later.",
    },
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
    },
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many password reset requests. Please try again later.",
    },
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many password reset attempts. Please try again later.",
    },
});

router.post(
    "/forgot-password",
    forgotPasswordLimiter,
    forgotPassword
);

router.post(
    "/reset-password",
    resetPasswordLimiter,
    resetPassword
);

router.post("/signup", signupLimiter, signup);

router.post("/verify-email", verifyLimiter, verifyEmail);

router.post("/login", loginLimiter, login);

router.post("/refresh", refresh);

router.get("/me", authenticate, getMe);

router.post("/logout", authenticate, logout);

router.post("/logout-all", authenticate, logoutAll);

export default router;