---
title: Environment Variables
type: configuration
scope: Documents all environment variables used by the backend and their purpose.
related_files:
  - backend_of_login_signup/src/config/env.ts
  - backend_of_login_signup/.env.example
confidence: high
last_verified: 2026-08-23
---

## Overview

Configuration is heavily validated using Zod in `backend_of_login_signup/src/config/env.ts`. If any required variable is missing or malformed, the application will refuse to start.

## Variables

### Core Server
- `NODE_ENV`: E.g., `development` or `production`.
- `PORT`: Port the Express server listens on (default 5000).
- `FRONTEND_URL`: URL of the frontend application, used to configure CORS.

### Database
- `DATABASE_URL`: Connection string for PostgreSQL (Neon). Used by Prisma.

### Redis (Upstash)
- `UPSTASH_REDIS_REST_URL`: The REST API URL for the Upstash Redis instance.
- `UPSTASH_REDIS_REST_TOKEN`: The authentication token for Upstash.

### Email (Nodemailer / Gmail)
- `GMAIL_USER`: The Gmail address used to send emails (e.g., OTPs).
- `GMAIL_APP_PASSWORD`: The 16-character App Password generated in Google Account settings.

### Authentication / JWT
- `ACCESS_TOKEN_SECRET`: A long, randomly generated secret used to sign JWT access tokens.
- `ACCESS_TOKEN_ISSUER`: Identifies the token issuer (e.g., `coddite-api`).
- `ACCESS_TOKEN_AUDIENCE`: Identifies the intended audience (e.g., `coddite-client`).
- `ACCESS_TOKEN_EXPIRES_IN`: Lifespan of the access token (e.g., `15m`).

### File Uploads
- `CLOUDINARY_URL` / `CLOUDINARY_API_KEY`: Referenced by the photo upload services for profile photos.
<!-- UNVERIFIED: Explicit variables for Cloudinary could not be comprehensively verified without seeing the full config implementation, but the feature is present. -->

## Related OKF files
- [Overview](../architecture/overview.md)
