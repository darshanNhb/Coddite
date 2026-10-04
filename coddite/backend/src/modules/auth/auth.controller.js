import {
  SignupSchema,
  SignupVerifySchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangeEmailSchema,
  VerifyEmailChangeSchema,
  DeleteAccountSchema

} from '@coddite/shared/schemas/auth.schemas';

import { AppError } from '../../utils/errors.js';

import * as authService from './auth.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  domain: process.env.COOKIE_DOMAIN || undefined,
};

function getIpHash(req) {
  return 'ip-hash-placeholder';
}

function getUserAgentHash(req) {
  return 'ua-hash-placeholder';
}

function setTokenCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 }); // 15m
  res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30d
}

// ── Signup ──────────────────────────────────────────────────────────────────

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function signup(req, res, next) {
  try {
    const data = SignupSchema.parse(req.body);
    await authService.signup(data.email, data.handle, data.password);
    res.json({ data: { message: 'Verification code sent to your email.' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function signupVerify(req, res, next) {
  try {
    const { email, otp } = SignupVerifySchema.parse(req.body);
    const ipHash = getIpHash(req);
    const uaHash = getUserAgentHash(req);

    const { accessToken, refreshToken, profile } = await authService.signupVerify(
      email, otp, ipHash, uaHash,
    );

    setTokenCookies(res, accessToken, refreshToken);
    res.status(201).json({ data: { profile } });
  } catch (err) {
    next(err);
  }
}

// ── Login ───────────────────────────────────────────────────────────────────

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function login(req, res, next) {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    const ipHash = getIpHash(req);
    const uaHash = getUserAgentHash(req);

    const { accessToken, refreshToken, profile } = await authService.login(
      email, password, ipHash, uaHash,
    );

    setTokenCookies(res, accessToken, refreshToken);
    res.json({ data: { profile } });
  } catch (err) {
    next(err);
  }
}

// ── Password Reset ──────────────────────────────────────────────────────────

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always return success to avoid email enumeration
    res.json({ data: { message: 'If the email is registered, a reset code was sent.' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(email, otp, newPassword);
    res.json({ data: { message: 'Password has been reset. Please log in.' } });
  } catch (err) {
    next(err);
  }
}

// ── Token Refresh ───────────────────────────────────────────────────────────

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function refresh(req, res, next) {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      throw new AppError(401, 'No refresh token cookie found');
    }

    const ipHash = getIpHash(req);
    const uaHash = getUserAgentHash(req);

    const { accessToken, refreshToken, profile } = await authService.refreshTokens(
      oldRefreshToken, ipHash, uaHash,
    );

    setTokenCookies(res, accessToken, refreshToken);
    res.json({ data: { profile } });
  } catch (err) {
    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    next(err);
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function logout(req, res, next) {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    await authService.logout(oldRefreshToken);

    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    res.json({ data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
}

// ── Account Settings ────────────────────────────────────────────────────────

import { z } from 'zod';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(10, 'Password must be at least 10 characters').max(128),
});

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ data: { message: 'Password changed successfully' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function requestEmailChange(req, res, next) {
  try {
    const { newEmail } = ChangeEmailSchema.parse(req.body);
    await authService.requestEmailChange(req.user.id, newEmail);
    res.json({ data: { message: 'Verification code sent to new email address.' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function verifyEmailChange(req, res, next) {
  try {
    const { otp } = VerifyEmailChangeSchema.parse(req.body);
    const oldRefreshToken = req.cookies?.refreshToken;
    await authService.verifyEmailChange(req.user.id, otp, oldRefreshToken);
    res.json({ data: { message: 'Email address updated successfully.' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function deleteAccount(req, res, next) {
  try {
    const { password } = DeleteAccountSchema.parse(req.body);
    await authService.deleteAccount(req.user.id, password);
    
    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    
    res.json({ data: { message: 'Account deleted successfully.' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function getSessions(req, res, next) {
  try {
    const sessions = await authService.getSessions(req.user.id);
    res.json({ data: { sessions } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function revokeSessionFamily(req, res, next) {
  try {
    const { familyId } = req.params;
    await authService.revokeSessionFamily(req.user.id, familyId);
    res.json({ data: { message: 'Session revoked successfully' } });
  } catch (err) {
    next(err);
  }
}

/**
 *
 * @param req
 * @param res
 * @param next
 */
export async function revokeAllOtherSessions(req, res, next) {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      throw new AppError(401, 'No refresh token cookie found');
    }
    
    await authService.revokeAllOtherSessions(req.user.id, oldRefreshToken);
    res.json({ data: { message: 'All other sessions revoked successfully' } });
  } catch (err) {
    next(err);
  }
}
