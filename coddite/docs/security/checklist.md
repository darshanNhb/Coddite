# Security Checklist

## 1. HTTP Headers
- **Implementation**: Used `helmet` in `backend/src/app.js`.
- **Status**: PASSED. Sets standard secure headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.).

## 2. CORS
- **Implementation**: Used `cors` middleware with explicit origins allowed.
- **Status**: PASSED. Blocks unauthorized cross-origin requests while permitting credentials (cookies).

## 3. Input Validation
- **Implementation**: Used `zod` schemas for all incoming HTTP request bodies (`CreatePostSchema`, `CreateCommentSchema`, `CreateVoteSchema`, etc.).
- **Status**: PASSED. Validation occurs in controller layer. Invalid requests fail with 400 Bad Request.

## 4. Secrets Handling & PII
- **Implementation**: 
  - Emails are fully encrypted at rest using AES-256-GCM.
  - Refresh tokens are hashed before storing in Postgres.
  - Access tokens are stateless, short-lived JWTs.
  - No secrets or emails are logged via Pino.
- **Status**: PASSED.

## 5. Rate Limiting
- **Implementation**: Used `redis` backed custom rate limiter for OTP requests (5 limits per IP, OTP expires in 15m), Post creation, and Comment creation.
- **Status**: PASSED. Rate limiting middleware intercepts heavy traffic early.

## 6. Authentication Tests
- **Implementation**: The OTP exchange logic and token family revocation (reuse detection) is fully covered by automated testing (`auth.test.js`).
- **Status**: PASSED.

## 7. Structured Logging
- **Implementation**: Used `pino` and `pino-http` instead of raw `console.log`.
- **Status**: P
## 8. Latency Tradeoffs
- *None currently known for the auth flow.* The synchronous SMTP latency issue discovered during load testing was immediately resolved by offloading email delivery to a BullMQ background worker (see ADR `docs/decisions/0004-async-email-delivery.md`).
