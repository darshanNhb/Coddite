---
title: Auth Endpoints
type: api
scope: Defines the REST endpoints for user authentication, session management, and password recovery.
related_files:
  - backend_of_login_signup/src/routes/auth.routes.ts
  - backend_of_login_signup/src/controllers/auth.controller.ts
related_okf:
  - ../domains/authentication.md
confidence: high
last_verified: 2026-08-23
---

## Overview

All endpoints in this group are prefixed with `/api/auth`. The router definition is located in `backend_of_login_signup/src/routes/auth.routes.ts`.

## Endpoints

### POST `/signup`
Initiates user registration by validating user input, temporarily storing it in Redis, and sending an OTP to the user's email.
- **Rate Limit**: 5 requests per 15 minutes.
- **Controller**: `signup` in `auth.controller.ts`

### POST `/verify-email`
Verifies the OTP sent during signup. If successful, creates the permanent User record in PostgreSQL.
- **Rate Limit**: 10 requests per 15 minutes.
- **Controller**: `verifyEmail` in `auth.controller.ts`

### POST `/login`
Authenticates a user via email and password. Issues a JWT access token in the response body and sets a refresh token in an HTTP-only cookie.
- **Rate Limit**: 10 requests per 15 minutes.
- **Controller**: `login` in `auth.controller.ts`

### POST `/refresh`
Exchanges a valid refresh token cookie for a new access token and a rotated refresh token.
- **Rate Limit**: None specifically defined.
- **Controller**: `refresh` in `auth.controller.ts`

### GET `/me`
Retrieves the profile of the currently authenticated user based on the JWT token.
- **Middleware**: `authenticate` (Requires valid Access Token).
- **Controller**: `getMe` in `auth.controller.ts`

### POST `/logout`
Revokes the current session represented by the access token. Clears the refresh token cookie.
- **Middleware**: `authenticate`
- **Controller**: `logout` in `auth.controller.ts`

### POST `/logout-all`
Revokes all active sessions for the currently authenticated user.
- **Middleware**: `authenticate`
- **Controller**: `logoutAll` in `auth.controller.ts`

### POST `/forgot-password`
Generates a password reset OTP and sends it via email. Returns success even if the email does not exist to prevent enumeration.
- **Rate Limit**: 5 requests per 15 minutes.
- **Controller**: `forgotPassword` in `auth.controller.ts`

### POST `/reset-password`
Verifies the password reset OTP and updates the user's password.
- **Rate Limit**: 10 requests per 15 minutes.
- **Controller**: `resetPassword` in `auth.controller.ts`

## Related OKF files
- [Authentication Domain](../domains/authentication.md)
