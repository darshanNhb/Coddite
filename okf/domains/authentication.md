---
title: Authentication Domain
type: domain
scope: Overview of authentication, including JWT access tokens, refresh tokens, OTP delivery, and session management.
related_files:
  - backend_of_login_signup/src/controllers/auth.controller.ts
  - backend_of_login_signup/src/services/session.service.ts
  - backend_of_login_signup/src/services/otp.service.ts
  - backend_of_login_signup/src/utils/jwt.ts
related_okf:
  - ../apis/auth-endpoints.md
  - ../data-flows/signup-flow.md
  - ../data-flows/login-flow.md
confidence: high
last_verified: 2026-08-23
---

## Overview

The Authentication domain handles user registration (signup), login, email verification via OTP, session management, and password recovery.

## Authentication Mechanism

Coddite uses a dual-token system for authentication:

1. **Access Token (JWT):**
   - Short-lived token returned in the JSON body upon login.
   - Sent by the client in the `Authorization: Bearer <token>` header for protected routes.
   - Verified statelessly via `backend_of_login_signup/src/utils/jwt.ts`.

2. **Refresh Token (Opaque String):**
   - Long-lived token stored in an HTTP-only secure cookie (`coddite-refresh`).
   - Represents an active session in the database.
   - Used to issue new access tokens when they expire via the `/api/auth/refresh` endpoint.

## Session Management

- Sessions are recorded in the PostgreSQL `Session` table, linked to the `User`.
- `backend_of_login_signup/src/services/session.service.ts` provides functions to create, rotate, and revoke sessions.
- When an access token expires, the client calls the `/refresh` endpoint, which validates the refresh token cookie, rotates it in the database (invalidating the old one), and issues a new pair.

## One-Time Passwords (OTPs)

- OTPs are utilized for Email Verification and Password Reset.
- OTPs are stored temporarily in Upstash Redis, mapped to the user's email.
- They are delivered using Nodemailer via Gmail SMTP (`backend_of_login_signup/src/services/email.service.ts`).

## Security Measures

- **Passwords:** Hashed using `argon2` before storage.
- **Rate Limiting:** Distinct rate limiters for signup, login, OTP requests, and password resets (`backend_of_login_signup/src/routes/auth.routes.ts`).
- **Audit Logging:** Core security events (login success/failure, OTP request, session creation) are written to the `AuditLog` table.

## Related OKF files
- [Auth Endpoints](../apis/auth-endpoints.md)
- [Signup Flow](../data-flows/signup-flow.md)
- [Login Flow](../data-flows/login-flow.md)
