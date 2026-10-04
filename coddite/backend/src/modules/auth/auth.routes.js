import { Router } from 'express';

import { otpRequestLimiter, otpVerifyLimiter, loginLimiter, signupLimiter } from '../../lib/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';

import * as authController from './auth.controller.js';

export const authRouter = Router();

// ── Signup ──────────────────────────────────────────────────────────────────
authRouter.post('/signup', signupLimiter, authController.signup);
authRouter.post('/signup/verify', otpVerifyLimiter, authController.signupVerify);

// ── Login ───────────────────────────────────────────────────────────────────
authRouter.post('/login', loginLimiter, authController.login);

// ── Password Reset ──────────────────────────────────────────────────────────
authRouter.post('/password/forgot', otpRequestLimiter, authController.forgotPassword);
authRouter.post('/password/reset', otpVerifyLimiter, authController.resetPassword);

// ── Token Management ────────────────────────────────────────────────────────
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);

// ── Current User & Sessions ───────────────────────────────────────────────────
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ data: { profile: req.profile } });
});

authRouter.patch('/password', requireAuth, authController.changePassword);

authRouter.post('/email/change', requireAuth, authController.requestEmailChange);
authRouter.post('/email/verify', requireAuth, authController.verifyEmailChange);

authRouter.post('/account/delete', requireAuth, authController.deleteAccount);

authRouter.get('/sessions', requireAuth, authController.getSessions);
authRouter.delete('/sessions/:familyId', requireAuth, authController.revokeSessionFamily);
authRouter.delete('/sessions', requireAuth, authController.revokeAllOtherSessions);
