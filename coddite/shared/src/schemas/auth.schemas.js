import { z } from 'zod';

// ── Signup ──────────────────────────────────────────────────────────────────
export const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(30, 'Handle must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Handle may only contain letters, numbers, hyphens, and underscores'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const SignupVerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 characters'),
});

export const ChangeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
});

export const VerifyEmailChangeSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 characters'),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm deletion'),
});

// ── Login ───────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Password Reset ──────────────────────────────────────────────────────────
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 characters'),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .max(128, 'Password must be at most 128 characters'),
});

// ── Legacy (kept for internal OTP reuse) ────────────────────────────────────
export const RequestOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const VerifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 characters'),
});
