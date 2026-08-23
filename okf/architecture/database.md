---
title: Database Architecture
type: architecture
scope: Details the PostgreSQL database schema, Prisma integration, and main entities.
related_files:
  - backend_of_login_signup/prisma/schema.prisma
  - backend_of_login_signup/src/config/prisma.ts
related_okf:
  - overview.md
confidence: high
last_verified: 2026-08-23
---

## Overview

The application uses PostgreSQL (hosted on Neon) as the primary data store. The database schema and migrations are managed using Prisma.

## Prisma Client

- The client is generated into `backend_of_login_signup/src/generated/prisma`.
- A singleton instance is exported from `backend_of_login_signup/src/config/prisma.ts`.

## Core Entities

The main entities mapped by Prisma in `prisma/schema.prisma` are:

### User
Stores permanent account and profile information.
- `id`: Primary key (cuid)
- `email`, `username`: Unique identifiers
- `passwordHash`: Hashed password
- Profile fields: `profilePhotoUrl`, `gender`, `location`, `birthday`
- Status and Role: `status` (ACTIVE/SUSPENDED/DELETED), `role` (USER/MODERATOR/ADMIN)

### Session
Stores active authentication sessions, managed via refresh tokens.
- `userId`: Foreign key to `User`
- `refreshTokenHash`: Hashed refresh token
- `expiresAt`, `revokedAt`: Session lifespans

### AuditLog
Records security and user activity events.
- `userId`: Foreign key to `User`
- `event`: String describing the action (e.g., `LOGIN_SUCCESS`, `OTP_REQUESTED`)

### Profile Relationships (1:N with User)
- `SocialLink`: Links to social platforms (e.g., GITHUB, LINKEDIN).
- `Education`: Educational background entries.
- `WorkExperience`: Work history entries.
- `UserSkill`: Unique skills added by the user.

## Constraints & Relationships

- All profile entities and `Session` cascade on `User` deletion.
- `AuditLog` sets `userId` to null if the associated user is deleted, retaining the audit trail.

## Related OKF files
- [Backend Architecture](backend.md)
