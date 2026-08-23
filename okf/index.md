---
title: OKF Index — Coddite
type: index
generated: 2026-08-23
okf_schema_version: "1.0"
---

Coddite is a backend service for user authentication and profile management. It is built using Node.js, Express, TypeScript, and Prisma, utilizing PostgreSQL as the primary database and Upstash Redis for temporary storage and rate limiting. The repository contains a single main unit under `backend_of_login_signup/`.

## Architecture
- [Overview](architecture/overview.md) — System-wide shape and major units
- [Backend](architecture/backend.md) — Controllers, services, and middlewares
- [Database](architecture/database.md) — Schema, models, and data access

## Domains
- [Authentication](domains/authentication.md) — Signup, login, JWT issuance, and session management
- [Profile](domains/profile.md) — User profiles, skills, education, work experience, and profile photo

## APIs
- [Auth Endpoints](apis/auth-endpoints.md) — Signup, login, email verification, and password reset routes
- [Profile Endpoints](apis/profile-endpoints.md) — Profile updates, photo upload, and account deletion routes

## Data Flows
- [Signup Flow](data-flows/signup-flow.md) — Account creation, OTP generation, and email verification
- [Login Flow](data-flows/login-flow.md) — Credential verification, JWT creation, and session rotation

## Integrations
- [Email](integrations/email.md) — OTP email delivery using Nodemailer and Gmail SMTP
- [Redis](integrations/redis.md) — Temporary data storage, OTPs, and rate limiting using Upstash Redis

## Configuration & Operations
- [Environment Variables](configuration/environment-variables.md) — Required configuration
- [Development](operations/development.md) — Setup, execution, and database migration instructions

## Start here for common tasks
- **Adding a new authentication route?** → Check [Auth Endpoints](apis/auth-endpoints.md) and [Backend Architecture](architecture/backend.md).
- **Understanding how login works?** → Read [Login Flow](data-flows/login-flow.md).
- **Updating the database schema?** → See [Database Architecture](architecture/database.md).
