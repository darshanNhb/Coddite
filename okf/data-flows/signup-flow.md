---
title: Signup Flow
type: data-flow
scope: Traces the end-to-end data flow for user registration, including OTP generation and email verification.
related_files:
  - backend_of_login_signup/src/routes/auth.routes.ts
  - backend_of_login_signup/src/controllers/auth.controller.ts
  - backend_of_login_signup/src/services/signup.service.ts
  - backend_of_login_signup/src/services/otp.service.ts
  - backend_of_login_signup/src/services/email.service.ts
related_okf:
  - ../domains/authentication.md
confidence: high
last_verified: 2026-08-23
---

## 1. Initial Signup Request

When a user submits the signup form, the data flows as follows:

HTTP Request (Client)
  → sends request to: POST `/api/auth/signup`
  → handled by route: `backend_of_login_signup/src/routes/auth.routes.ts`
  → applies middleware: `signupLimiter`
  → dispatches to controller: `backend_of_login_signup/src/controllers/auth.controller.ts` (function: `signup`)
  → validates payload via Zod `signupSchema`
  → queries table: `User` (checks if email or username exists)
  → calls util: `backend_of_login_signup/src/utils/password.js` (function: `hashPassword`)
  → calls service: `backend_of_login_signup/src/services/signup.service.ts` (function: `savePendingSignup`)
  → writes to Redis (temporary storage of user info)
  → calls service: `backend_of_login_signup/src/services/otp.service.ts` (function: `createSignupOtp`)
  → writes to Redis (OTP storage)
  → calls service: `backend_of_login_signup/src/services/email.service.ts` (function: `sendVerificationOtp`)
  → sends to external: Nodemailer / Gmail SMTP
  → writes to table: `AuditLog` (event: `OTP_REQUESTED`)
  → returns response to client (success message)

## 2. OTP Verification

When the user enters the OTP from their email:

HTTP Request (Client)
  → sends request to: POST `/api/auth/verify-email`
  → handled by route: `backend_of_login_signup/src/routes/auth.routes.ts`
  → applies middleware: `verifyLimiter`
  → dispatches to controller: `backend_of_login_signup/src/controllers/auth.controller.ts` (function: `verifyEmail`)
  → calls service: `backend_of_login_signup/src/services/signup.service.ts` (function: `getPendingSignup`)
  → reads from Redis
  → calls service: `backend_of_login_signup/src/services/otp.service.ts` (function: `verifySignupOtp`)
  → queries table: `User` (double-checks if user was created in the meantime)
  → writes to table: `User` (creates permanent user record)
  → calls service: `backend_of_login_signup/src/services/signup.service.ts` (function: `deletePendingSignup`)
  → deletes from Redis
  → returns response to client (success message and user object)

## Related OKF files
- [Authentication Domain](../domains/authentication.md)
