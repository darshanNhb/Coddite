---
title: Development & Operations
type: operations
scope: Provides instructions for setting up the local development environment, database migrations, and building the project.
related_files:
  - backend_of_login_signup/package.json
  - README.md
confidence: high
last_verified: 2026-08-23
---

## Overview

The Coddite backend uses standard Node.js scripts for development, build, and execution. The stack relies heavily on external managed services (Neon for PostgreSQL, Upstash for Redis) even in development, as there is no local `docker-compose.yml` for infrastructure provided in the repo.

## Requirements
- Node.js 18+ (24+ recommended)
- A Neon PostgreSQL instance
- An Upstash Redis instance
- A Gmail account with 2-Step Verification and an App Password enabled

## Environment Setup
Create a `.env` file in `backend_of_login_signup/` using `.env.example` as a template. See [Environment Variables](../configuration/environment-variables.md) for required values.

## NPM Scripts (package.json)

- **`npm run dev`**: Starts the development server using `tsx watch` against `src/server.ts`. Automatically restarts on file changes.
- **`npm run build`**: Compiles TypeScript using `tsc` to the `dist/` directory.
- **`npm start`**: Runs the compiled JavaScript from `dist/server.js`. Suitable for production execution.

## Database Migrations (Prisma)

Migrations are managed via the standard Prisma CLI.

- Initialize or sync schema: `npx prisma generate`
- Apply migrations to the development database: `npx prisma migrate dev`
- Create a named migration: `npx prisma migrate dev --name <migration_name>`
- Open database studio: `npx prisma studio`

Prisma uses `prisma.config.ts` for version 7 configuration specifics.

## Related OKF files
- [Environment Variables](../configuration/environment-variables.md)
