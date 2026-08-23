---
title: System Architecture Overview
type: architecture
scope: High-level overview of the Coddite backend system, its major components, and their relationships.
related_files:
  - backend_of_login_signup/src/server.ts
  - backend_of_login_signup/src/app.ts
  - backend_of_login_signup/package.json
confidence: high
last_verified: 2026-08-23
---

## Overview

The Coddite repository consists of a single primary backend service located in the `backend_of_login_signup/` directory. There is no frontend code in this repository.

The backend provides a RESTful API for user authentication, session management, and profile management.

## Tech Stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Framework:** Express
- **Database (Primary):** PostgreSQL (Neon)
- **Database (Temporary/Rate Limiting):** Upstash Redis
- **ORM:** Prisma
- **Validation:** Zod

## Major Units

- **Controllers (`src/controllers/`)**: Handle incoming HTTP requests, validate payloads via Zod, and return JSON responses.
- **Services (`src/services/`)**: Contain the core business logic. They are called by controllers and interact with the database, email provider, and Redis.
- **Routes (`src/routes/`)**: Map HTTP methods and URL paths to specific controller functions, applying middlewares (like authentication and rate-limiting) as needed.
- **Middlewares (`src/middleware/`)**: Perform request interception, such as verifying JWT tokens (`auth.middleware.ts`), global error handling, and rate-limiting.
- **Utils (`src/utils/`)**: Provide shared utilities for JWT generation, password hashing, and cookie management.

## Component Interactions

The primary flow of data inside the backend follows a layered architecture constraint:

- **Incoming Request** → `src/app.ts` (Express instance)
- **Routing** → `src/routes/*.routes.ts` (Maps path to controller, applies middleware)
- **Controller** → `src/controllers/*.controller.ts` (Validates with Zod, formats response)
- **Service** → `src/services/*.service.ts` (Executes business logic)
- **Data Access** → Prisma Client (`src/config/prisma.ts`) / Redis (`src/config/redis.ts`)

Controllers must not contain complex business logic or raw database queries. All database access goes through Prisma.

## Related OKF files
- [Backend Architecture](backend.md)
- [Database Architecture](database.md)
