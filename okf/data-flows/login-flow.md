---
title: Login Flow
type: data-flow
scope: Traces the end-to-end data flow for user authentication, session creation, and token issuance.
related_files:
  - backend_of_login_signup/src/routes/auth.routes.ts
  - backend_of_login_signup/src/controllers/auth.controller.ts
  - backend_of_login_signup/src/services/session.service.ts
  - backend_of_login_signup/src/utils/jwt.ts
  - backend_of_login_signup/src/utils/password.ts
related_okf:
  - ../domains/authentication.md
confidence: high
last_verified: 2026-08-23
---

## 1. Login Request

When a user submits their login credentials, the data flows as follows:

HTTP Request (Client)
  → sends request to: POST `/api/auth/login`
  → handled by route: `backend_of_login_signup/src/routes/auth.routes.ts`
  → applies middleware: `loginLimiter`
  → dispatches to controller: `backend_of_login_signup/src/controllers/auth.controller.ts` (function: `login`)
  → validates payload via Zod `loginSchema`
  → queries table: `User` (looks up user by email)
  → calls util: `backend_of_login_signup/src/utils/password.ts` (function: `verifyPassword`)
  → calls service: `backend_of_login_signup/src/services/session.service.ts` (function: `createSession`)
  → writes to table: `Session` (creates active session record)
  → calls util: `backend_of_login_signup/src/utils/jwt.ts` (function: `createAccessToken`)
  → calls util: `backend_of_login_signup/src/utils/auth-cookie.ts` (function: `setRefreshTokenCookie`)
  → writes to table: `AuditLog` (events: `LOGIN_SUCCESS`, `SESSION_CREATED`)
  → returns response to client (access token in JSON, refresh token in `Set-Cookie` header)

## 2. Token Refresh

When the access token expires, the client uses the refresh token cookie:

HTTP Request (Client)
  → sends request to: POST `/api/auth/refresh`
  → handled by route: `backend_of_login_signup/src/routes/auth.routes.ts`
  → dispatches to controller: `backend_of_login_signup/src/controllers/auth.controller.ts` (function: `refresh`)
  → extracts token from cookie (`coddite-refresh`)
  → calls util: `backend_of_login_signup/src/utils/refresh-token.ts` (function: `extractSessionId`)
  → calls service: `backend_of_login_signup/src/services/session.service.ts` (function: `rotateSession`)
  → queries table: `Session` (verifies session is valid and not revoked)
  → writes to table: `Session` (invalidates old token, issues new refresh token hash, updates `lastUsedAt`)
  → calls util: `backend_of_login_signup/src/utils/jwt.ts` (function: `createAccessToken`)
  → calls util: `backend_of_login_signup/src/utils/auth-cookie.ts` (function: `setRefreshTokenCookie`)
  → returns response to client (new access token, new refresh token in cookie)

## Related OKF files
- [Authentication Domain](../domains/authentication.md)
