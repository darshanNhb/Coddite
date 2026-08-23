---
title: Backend Architecture
type: architecture
scope: Detailed description of the Express application setup, middlewares, and server entry points.
related_files:
  - backend_of_login_signup/src/server.ts
  - backend_of_login_signup/src/app.ts
  - backend_of_login_signup/src/middleware/auth.middleware.ts
  - backend_of_login_signup/src/middleware/error.middleware.ts
related_okf:
  - overview.md
confidence: high
last_verified: 2026-08-23
---

## Entry Points

The backend uses `backend_of_login_signup/src/server.ts` as the primary entry point which imports the Express application from `backend_of_login_signup/src/app.ts`.

- `backend_of_login_signup/src/server.ts` handles:
  - Starting the HTTP server on the configured `PORT`.
  - Triggering the background session cleanup job (`startSessionCleanupJob()`).
  - Handling graceful shutdowns (`SIGTERM`, `SIGINT`).
- `backend_of_login_signup/src/app.ts` handles:
  - Global middleware registration (Helmet, CORS, JSON parsing, Cookie parser).
  - Registering the main route groups (`/api/auth`, `/api/profile`).
  - Registering the global error handler as the last middleware.

## Middleware Chain

Requests passing through the application hit the following global middleware chain:

1. `helmet()` — Security headers.
2. `requestId` — Assigns a unique ID to every request.
3. `cors()` — Configured dynamically via `env.FRONTEND_URL`.
4. `express.json()` — Parses JSON bodies (10kb limit).
5. `cookieParser()` — Parses HTTP-only cookies.
6. **Routes** — Dispatched to specific route handlers.
7. `errorHandler` — Catches uncaught errors and formats them into JSON responses.

### Authentication Middleware

`backend_of_login_signup/src/middleware/auth.middleware.ts` exports `authenticate`:

- Expects an `Authorization: Bearer <token>` header.
- Verifies the JWT using `verifyAccessToken`.
- Reads the User from Prisma.
- Attaches the user object to `req.user`.
- Rejects missing, invalid, or expired tokens with `401 Unauthorized`.

## Related OKF files
- [Overview](overview.md)
- [Auth Endpoints](../apis/auth-endpoints.md)
