---
title: Redis Integration
type: integration
scope: Details the integration with Upstash Redis for temporary storage and rate limiting.
related_files:
  - backend_of_login_signup/src/config/redis.ts
  - backend_of_login_signup/src/services/otp.service.ts
  - backend_of_login_signup/src/services/signup.service.ts
confidence: high
last_verified: 2026-08-23
---

## Overview

Coddite uses **Upstash Redis** (serverless Redis) for temporary state storage and rate limiting.

## Redis Client

- The Upstash client is initialized in `backend_of_login_signup/src/config/redis.ts` using `@upstash/redis`.
- It uses the REST API (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) instead of a traditional TCP connection, which avoids connection pooling issues in serverless environments.

## Primary Uses

### Temporary Signup Data
When a user begins the signup flow, their validated profile information and hashed password are serialized and stored in Redis under a prefix (e.g., `signup:user:<email>`) with an expiration time. This avoids creating incomplete/unverified user records in PostgreSQL.

### One-Time Passwords (OTPs)
OTPs are stored as hashes in Redis under a prefix (e.g., `otp:<email>`). Redis `EXPIRE` is used to automatically enforce OTP validity periods (e.g., 10 minutes). Separate counters track the number of failed OTP attempts and enforce resend cooldowns.

### Rate Limiting
The Express rate limiters defined in routes (e.g., `signupLimiter`, `loginLimiter` in `auth.routes.ts`) store request counts in Redis to prevent abuse (brute-forcing passwords or spamming emails).

## Related OKF files
- [Auth Endpoints](../apis/auth-endpoints.md)
