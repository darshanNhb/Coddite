import { Router } from "express";
import rateLimit from "express-rate-limit";

import { authenticate } from "../middleware/auth.middleware.js";
import { uploadPhoto } from "../middleware/upload.middleware.js";

import {
    getProfile,
    updateProfile,
    uploadProfilePhoto,
    removeProfilePhoto,
    addSocialLink,
    updateSocialLink,
    deleteSocialLink,
    addWork,
    updateWork,
    deleteWork,
    addEducation,
    updateEducation,
    deleteEducation,
    addSkill,
    deleteSkill,
    requestEmailChange,
    verifyEmailChange,
    changePassword,
    requestPasswordReset,
    verifyPasswordReset,
    getActiveSessions,
    revokeSession,
    logoutAllDevices,
    requestAccountDelete,
    verifyAccountDelete,
} from "../controllers/profile.controller.js";

const router = Router();

// ── Rate limiters for sensitive endpoints ─────────────────

const sensitiveActionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
    },
});

const otpRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many OTP requests. Please try again later.",
    },
});

// ── Profile ───────────────────────────────────────────────

router.get("/", authenticate, getProfile);

router.patch("/", authenticate, updateProfile);

// ── Photo ─────────────────────────────────────────────────

router.post("/photo", authenticate, uploadPhoto.single("photo"), uploadProfilePhoto);

router.delete("/photo", authenticate, removeProfilePhoto);

// ── Social Links ──────────────────────────────────────────

router.post("/social-links", authenticate, addSocialLink);

router.patch("/social-links/:id", authenticate, updateSocialLink);

router.delete("/social-links/:id", authenticate, deleteSocialLink);

// ── Work ──────────────────────────────────────────────────

router.post("/work", authenticate, addWork);

router.patch("/work/:id", authenticate, updateWork);

router.delete("/work/:id", authenticate, deleteWork);

// ── Education ─────────────────────────────────────────────

router.post("/education", authenticate, addEducation);

router.patch("/education/:id", authenticate, updateEducation);

router.delete("/education/:id", authenticate, deleteEducation);

// ── Skills ────────────────────────────────────────────────

router.post("/skills", authenticate, addSkill);

router.delete("/skills/:id", authenticate, deleteSkill);

// ── Email Change ──────────────────────────────────────────

router.post("/email/change/request", authenticate, otpRequestLimiter, requestEmailChange);

router.post("/email/change/verify", authenticate, sensitiveActionLimiter, verifyEmailChange);

// ── Password ──────────────────────────────────────────────

router.post("/password/change", authenticate, sensitiveActionLimiter, changePassword);

router.post("/password/reset/request", authenticate, otpRequestLimiter, requestPasswordReset);

router.post("/password/reset/verify", authenticate, sensitiveActionLimiter, verifyPasswordReset);

// ── Sessions ──────────────────────────────────────────────

router.get("/sessions", authenticate, getActiveSessions);

router.delete("/sessions/:id", authenticate, revokeSession);

router.post("/sessions/logout-all", authenticate, logoutAllDevices);

// ── Account Deletion ──────────────────────────────────────

router.post("/delete/request", authenticate, otpRequestLimiter, requestAccountDelete);

router.post("/delete/verify", authenticate, sensitiveActionLimiter, verifyAccountDelete);

export default router;