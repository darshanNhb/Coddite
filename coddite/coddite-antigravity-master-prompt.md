# CODDITE — MASTER BUILD PROMPT FOR ANTIGRAVITY (v2)

> **Audience:** Antigravity, acting as a senior staff-level full-stack engineer, security engineer, DevOps engineer and technical writer, all in one.
> **Goal:** Build, test, document and deploy **Coddite**, an anonymous, Reddit-style community platform for students and developers, to a genuinely production-grade standard.
> **Version 2:** the whole project is written in **plain JavaScript (`.js`) on Node.js** with a conventional **`frontend/`, `backend/`, `ml/`** layout (plus `shared/`, `docs/`, `infra/`). There is no TypeScript source and no Next.js anywhere.
> **Read this entire document before writing any code.** It is the single source of truth. When something here conflicts with your habits or defaults, this document wins. When something here is ambiguous, ask the user instead of guessing.

---

## PART 0 — HOW TO USE THIS DOCUMENT

This prompt is long on purpose. It is organized so that you can work through it in order, and so that you can come back to any part when a decision needs to be checked.

**Reading order.**

1. Parts 1 to 3 explain what is being built, how you must behave while building it, and what technology is locked in.
2. Parts 4 and 5 define the repository layout and the **environment-variable protocol**, including the mandatory point where you stop and ask the user for the contents of the environment files.
3. Parts 6 to 12 define the backend: data model, authentication and anonymity, API, caching, queues, AI/ML and real-time.
4. Parts 13 to 18 define the frontend, security, performance, observability, testing and CI/CD.
5. Parts 19 to 23 define deployment, the software-engineering documentation deliverables, community governance and content policy, the phase-by-phase execution plan with acceptance criteria, and the definition of done with closing instructions.

**Conventions used in this document.**

- **MUST / MUST NOT** are hard requirements. If you cannot satisfy one, stop and tell the user why.
- **SHOULD / SHOULD NOT** are strong defaults. Deviate only with a written justification in `docs/decisions/`.
- **STOP-AND-ASK** marks a point where you must pause and get input from the user before continuing.
- **ARTIFACT** marks something you must produce and leave in the repository for the user to review.
- Code blocks are illustrative unless labeled *"canonical"*. Canonical blocks should be followed closely.

**A note on the user.** The user is a university student building this for a Software Engineering course, and intends to deploy it as a real application. That means two things at once: the project will be **graded on process and documentation** as much as on the running product, and it will be **exposed to real internet traffic**. You must therefore produce both a rigorous engineering record and a genuinely hardened system. Neither may be sacrificed for the other.

---

## PART 1 — PRODUCT VISION AND SCOPE

### 1.1 What Coddite is

Coddite is a coding-focused community platform where students and developers share posts, ask questions, discuss coding topics, share solutions and help each other. It is designed to be an open space where people can interact, exchange knowledge and learn from other developers.

The defining characteristics are:

1. **Anonymous by design.** Every user appears only under a generated handle. Real identity (the email address) is never shown to other users, never returned by any public API, never written to logs, and is stored separately from the public profile.
2. **Open registration.** Anyone with any working email address can join. There is **no** college-email restriction. Because open registration plus anonymity invites abuse, the platform compensates with strong abuse controls rather than identity verification.
3. **Reddit-like structure.** Communities (topic spaces), posts, threaded comments, voting, karma, sorting by Hot/New/Top, moderators per community and platform-level admins.
4. **Doubt-solving focus.** Posts can be marked as questions; answers can be accepted; the platform helps users find existing answers before asking duplicates.
5. **AI-assisted, human-governed.** AI flags, suggests and ranks. Humans decide. No AI system may take a punitive action (ban, permanent removal) without human review.

### 1.2 Users and roles

| Role | Description | Key permissions |
|---|---|---|
| **Guest** | Not logged in | Read public posts, search, view communities |
| **User** | Registered, anonymous handle | Post, comment, vote, report, bookmark, join communities, receive notifications |
| **Moderator** | Appointed per community | Remove/lock/pin posts and comments in their community, review reports, mute users in that community |
| **Admin** | Platform staff | Everything, plus global bans, audit-log access, system settings, AI threshold tuning, user role management |

Role checks MUST be enforced on the server. The frontend hides controls for usability only; it is never a security boundary.

### 1.3 Full feature scope

The user has decided to build the **complete scope**, not a reduced MVP. You MUST still build in layers (Part 22) so that a working, demonstrable system exists at every stage.

**Core platform**

- Signup and login with email plus one-time password (OTP); optional Google sign-in (behind a feature flag)
- Anonymous auto-generated handles, re-rollable, with optional custom handle if available
- Communities: create, join, leave, rules, moderators, community-specific settings
- Posts: markdown with fenced code blocks and syntax highlighting, tags, optional images, "question" type, "solved" state, accepted answer
- Threaded (nested) comments with collapse/expand, depth limits and "load more replies"
- Upvote/downvote on posts and comments with duplicate-vote prevention
- Sorting: Hot, New, Top (with time windows), Controversial (optional), Unanswered
- Full-text search and tag filtering
- Profiles: handle, avatar, karma, badges, own posts/comments, bookmarks
- Karma and trust levels that gate privileges for new accounts
- Reporting, moderator queue, admin dashboard, audit log, bans (account and email-hash)
- Notifications (in-app, real-time, optionally email digests)
- Bookmarks and following of posts/communities

**Performance and scale features**

- Redis caching, counters, rate limiting, OTP storage
- BullMQ background processing
- PostgreSQL indexing, full-text search, `pgvector` similarity search
- Cursor-based pagination everywhere
- Image optimization and CDN delivery
- Response compression, connection pooling, denormalized counters

**Real-time**

- Socket.IO with the Redis adapter for notifications and live comment updates

**Security**

- Input validation, output sanitization, argon2 password hashing (if passwords are enabled), refresh-token rotation with reuse detection, CSRF defense, security headers, CAPTCHA, audit log

**AI/ML**

- Toxicity and spam detection (moderation pipeline)
- Duplicate/similar-question detection with embeddings
- Auto-tagging suggestions

**Engineering quality**

- Plain JavaScript (ES modules) on Node.js everywhere, a clear frontend/backend/ml repository layout, Docker, GitHub Actions CI/CD, Vitest and Supertest tests, Playwright end-to-end tests, OpenAPI docs, structured logging, error monitoring, k6 load tests, database migrations, seed data

### 1.4 Explicit non-goals

To protect scope, the following are **out of scope** unless the user later asks:

- Native mobile apps (the web app MUST be fully responsive, though)
- Direct messaging between users (listed as future scope, with the reasoning that DMs between anonymous accounts need heavy block/report tooling)
- Monetization, ads, payments
- College-email verification (documented as future scope)
- Server-side rendering / Next.js (explicitly forbidden, see Part 3)

### 1.5 Decisions already made by the project owner (do NOT re-ask)

These were settled before you started. Treat them as requirements, not as ambiguities.

1. **Language:** plain JavaScript (ES modules) on Node.js, in `.js` files (React components use `.jsx`). No TypeScript source files anywhere (Part 3.1).
2. **Repository layout:** `frontend/`, `backend/`, `ml/`, `shared/`, `docs/`, `infra/` (Part 4.1). The project owner explicitly wants a proper frontend, backend and ml separation that anyone can read at a glance.
3. **Worker placement:** the BullMQ worker lives inside `backend/` as its own entry point (`src/worker.js`), next to the API entry point (`src/server.js`). They are separate processes in production. To support a very small budget, provide an environment flag `RUN_WORKER_IN_API` (default `false`) that starts the processors inside the API process. Keep both entry points either way so they can be split later without code changes.
4. **Testing:** **Vitest** in every package (frontend, backend, ml, shared), **Supertest** for API integration tests against the Express app, **Playwright** for end-to-end tests, **k6** for load tests. Do not introduce Jest.
5. **Styling:** **Tailwind CSS** is explicitly requested by the project owner for the frontend. This overrides any default preference you may have for vanilla CSS.
6. **IDs:** UUID v7 (time-ordered) for all primary keys, generated in application code (or with Prisma's `uuid(7)` default if the installed version supports it; verify in current documentation). Record the choice in an ADR.
7. **Markdown storage:** store **raw markdown only**. There is no `bodyHtml` column. Sanitize at render time so a sanitizer fix also protects old content. Cache rendered output in Redis only if profiling shows a need.
8. **Data model additions** (already reflected in Part 6): `upvotes` and `downvotes` on Post and Comment (with `voteScore = upvotes - downvotes`, reconciled by a job), `editedAt` on Post and Comment, `handleChangedAt`, `postCount` and `commentCount` on Profile, and `language` on Post (detected from the info string of fenced code blocks; informational only). The maintenance job deletes attachments that were never linked to a post after 24 hours, **including the stored file at the provider**.
9. **Local first:** run everything locally with Docker (Postgres with `pgvector`, Redis, a mail catcher) until Phase 6. Hosting decisions must not block development.
10. **Still open (ask in your first message):** whether the owner has a domain, and which hosting providers and budget they will use (Part 23.4).

---

## PART 2 — YOUR OPERATING PROTOCOL

You are not a code-generation vending machine. You are the engineer responsible for this system. Follow this protocol at all times.

### 2.1 Plan first, then build

Before writing code for any phase:

1. Restate the phase goal in your own words.
2. List the files and modules you will create or change.
3. List the acceptance criteria you will verify (taken from Part 22).
4. Then build.

After finishing a phase:

1. Run the linter, the JSDoc type check and the tests. All MUST pass.
2. Summarize what was built, what was deliberately not built, and any risks.
3. Produce the phase's ARTIFACTS.
4. Ask the user whether to proceed to the next phase, unless the user has said to proceed autonomously.

### 2.2 Never fake success

- MUST NOT claim a test passes, a service is reachable, or a deployment succeeded unless you actually ran it and saw the result.
- MUST NOT stub out a feature and describe it as complete. If something is mocked, labeled `TODO`, or partially implemented, say so plainly in the phase summary and in `docs/KNOWN_LIMITATIONS.md`.
- MUST NOT silence a failing test or lint rule to get a green build. Fix the cause, or explain why the test itself is wrong.

### 2.3 Secrets discipline (critical)

- MUST NOT commit secrets, tokens, keys, passwords, connection strings or `.env` files.
- MUST NOT print secret values back to the user in chat, logs, terminal output, test output, screenshots or documentation. When confirming that a value was received, say only that it was received and passed validation.
- MUST NOT hardcode any credential in source, Dockerfiles, CI files or docs. Use placeholders such as `<set-in-env>`.
- MUST NOT include real user data in seed files, fixtures or logs.
- If you ever notice a secret has leaked into a file or into git history, stop immediately, tell the user, and recommend rotating that secret.

### 2.4 Ask, don't guess

Use STOP-AND-ASK for:

- The environment-variable collection (Part 5), which is mandatory.
- Any choice between two materially different approaches where the user's preference is unknown and the choice is expensive to reverse.
- Anything involving spending money, creating paid resources or changing DNS.
- Any credential, account or domain you do not have.
- Deployment (Part 19), which requires the user's accounts.

For small decisions, decide, record the decision in `docs/decisions/`, and keep moving.

### 2.5 Small, reviewable, well-named commits

- Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `perf:`, `ci:`, `build:`).
- One logical change per commit.
- Commit messages explain **why**, not just what.
- The Git history is graded evidence of process. Do not squash the whole project into one commit.
- Create feature branches (`feat/auth-otp`, `feat/comments-threading`) and merge via pull requests where the user's setup permits. If you cannot open pull requests, use clearly named branches and merge commits.

### 2.6 Definition of a "finished" task

A task is finished only when: the code is written, typed, linted, tested, documented where public, reachable through the intended interface, and does not leak secrets or private data. "It compiles" is not finished.

### 2.7 Communication style

- Be concise and factual in progress updates.
- Report failures honestly, with the actual error and your proposed fix.
- When you make a trade-off, state it in one or two sentences.
- Avoid marketing language in documentation. Write like an engineer talking to another engineer.

---

## PART 3 — LOCKED TECHNOLOGY DECISIONS

These are settled. Do not substitute alternatives without the user's explicit approval.

### 3.1 Hard constraints

1. **The backend is Node.js with Express, written in JavaScript (ES modules).** Node.js strictly.
2. **Next.js MUST NOT be used.** Not for the frontend, not for API routes, not for anything. The frontend is a client-rendered single-page application built with Vite.
3. **No Python service is required.** All AI/ML code lives in the `ml/` package, written in JavaScript, and runs from Node.js workers, using hosted model APIs and/or locally run ONNX models from Node.js. The design MUST keep the AI layer behind interfaces (Part 11) so a separate ML service could be added later without rewriting callers.
4. **PostgreSQL is the primary datastore.** MongoDB MUST NOT be used.
5. **Plain JavaScript everywhere. No `.ts` or `.tsx` source files anywhere in the repository.** All source files use the `.js` extension. React components use `.jsx` (Vite's toolchain needs the JSX extension for files that contain JSX; this is the only exception). Set `"type": "module"` in every `package.json` so `.js` files are ES modules, use explicit file extensions in relative imports, and do **not** create `.mjs` or `.cjs` files unless a third-party tool cannot load its configuration otherwise (record any such exception in an ADR).
6. **Type safety without TypeScript.** Use JSDoc (`@typedef`, `@param`, `@returns`) on every exported function, Zod schemas as the runtime source of truth for data shapes, and a `jsconfig.json` per package with `checkJs: true` and `strict: true`. The TypeScript compiler MAY be installed as a **dev-only checker** (`tsc --noEmit -p jsconfig.json`), never to compile source or produce build output.

### 3.2 Locked stack

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js LTS (use the current Active LTS at project start) | Pin via `.nvmrc` and `engines` in `package.json` |
| Package manager | pnpm with workspaces | Packages: `frontend`, `backend`, `ml`, `shared` |
| Language | JavaScript (modern ES, ES modules), `.js` (`.jsx` for React) | JSDoc types checked with `checkJs`; shared `jsconfig.base.json` |
| Frontend | React + Vite (JavaScript, JSX) | SPA |
| Styling | Tailwind CSS | Explicitly requested by the project owner; design tokens, dark mode |
| Client data | TanStack Query | Caching, pagination, optimistic updates |
| Routing | React Router | Code-split routes |
| Client state | Zustand | Small global state only |
| Forms/validation | React Hook Form + Zod | Shared schemas |
| Backend framework | Express | Layered architecture |
| Realtime | Socket.IO + Redis adapter | |
| Database | PostgreSQL (Neon in production, Docker locally) | |
| ORM | Prisma | With raw SQL for `pgvector` and full-text search |
| Vector search | `pgvector` extension | Inside the same Postgres |
| Cache / limits / OTP | Redis (Upstash in production, Docker locally) | |
| Queue | BullMQ | Needs a standard TCP Redis connection |
| Validation | Zod | `shared/` package used by frontend and backend |
| Auth | Short-lived JWT access token + rotating refresh token in httpOnly cookie | |
| Password hashing | argon2 (argon2id) | Only if password login is enabled |
| Email | Resend (provider abstracted) | Nodemailer/SMTP for local dev with a mail catcher |
| Images | Cloudinary (provider abstracted) | Strip EXIF, resize, WebP/AVIF |
| Bot protection | Cloudflare Turnstile | CAPTCHA alternative |
| Logging | Pino | Structured JSON, redaction |
| Errors | Sentry | Frontend and backend |
| API docs | OpenAPI 3 (Swagger UI) | Generated from Zod schemas where possible |
| Unit/integration tests | Vitest in every package, plus Supertest for the Express API | Supertest runs against the Express app built in `backend/src/app.js` |
| E2E tests | Playwright | |
| Load tests | k6 | |
| Containers | Docker, docker-compose | Multi-stage builds |
| CI/CD | GitHub Actions | |
| Frontend hosting | Vercel or Netlify (static SPA) | |
| API/worker hosting | Render, Railway or Fly.io (long-running processes) | |

### 3.3 A critical architectural consequence

Because there is **no server-side rendering**, the frontend and backend are **separate deployments**. Two consequences you MUST handle carefully:

1. **Cookies across origins.** The refresh token lives in an httpOnly cookie. If the web app and API are on different registrable domains, browsers increasingly block or partition third-party cookies, and cookie-based auth becomes fragile. The robust solution is to deploy both under the **same parent domain** (for example `app.example.com` for the web and `api.example.com` for the API), and set the cookie `Domain` to the parent. This requires the user to own a domain. **STOP-AND-ASK** early (Part 5) whether the user has a domain. If they do not, document the limitation and design the auth flow so it degrades safely (see Part 7.9).
2. **CORS must be exact.** Never use `*` with credentials. Allow only explicit origins from configuration.

### 3.4 Long-running processes

Socket.IO and BullMQ workers need **persistent processes**. They MUST NOT be deployed as serverless functions. The API (with Socket.IO, entry point `backend/src/server.js`) and the worker (`backend/src/worker.js`) run as separate long-lived services on Render/Railway/Fly.io, from the same backend image with different start commands. The static frontend is the only piece that goes to Vercel/Netlify.

### 3.5 BullMQ and Redis: a known cost trap

BullMQ requires a TCP Redis connection using `ioredis` with `maxRetriesPerRequest: null`, and it polls Redis. On a per-request-priced serverless Redis, that polling can burn through a quota quickly. Therefore:

- Keep **two logical Redis roles**: (a) *cache, rate limits, OTPs* and (b) *BullMQ queues and Socket.IO adapter*.
- In development, one local Redis serves both.
- In production, prefer a **standard, fixed-price Redis** for BullMQ and Socket.IO. The serverless Redis (Upstash REST) may serve cache and rate limiting.
- Make both connection strings separately configurable (`REDIS_URL` for queues/adapter, and Upstash REST variables for cache/limits), and let the app fall back to a single Redis when only one is provided.
- **STOP-AND-ASK** which Redis provider(s) the user will use, and remind them to check current pricing and free-tier limits, since those change.


---

## PART 4 — REPOSITORY STRUCTURE AND TOOLING

### 4.1 Repository layout (canonical)

One repository, four packages managed by pnpm workspaces. The top-level folders are named for what they are, so a reader can understand the project at a glance.

```
coddite/
├── frontend/                    # React + Vite single-page app (JavaScript, JSX)
│   ├── src/
│   │   ├── app/                 # router, providers, layouts
│   │   ├── features/            # feature-sliced: auth, posts, comments, communities, search, notifications, moderation, admin, profile
│   │   ├── components/          # shared UI primitives
│   │   ├── hooks/
│   │   ├── lib/                 # api client, socket client, env.js, utils
│   │   ├── styles/
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   ├── jsconfig.json
│   ├── .env.example             # public VITE_* values only
│   └── package.json
├── backend/                     # Node.js + Express + Socket.IO + BullMQ (JavaScript, ES modules)
│   ├── src/
│   │   ├── config/              # env.js (the only file that reads process.env), constants
│   │   ├── modules/             # auth, users, communities, posts, comments, votes, search, reports, moderation, admin, notifications, uploads, health
│   │   │   └── <module>/        # <module>.routes.js, .controller.js, .service.js, .repository.js, .schemas.js, .test.js
│   │   ├── middleware/          # auth, rbac, rate-limit, validate, error-handler, request-id, security headers
│   │   ├── realtime/            # socket server, rooms, auth handshake
│   │   ├── infra/               # prisma client, redis clients, queue producers, mailer, storage
│   │   ├── queues/              # queue names, options, job payload schemas
│   │   ├── processors/          # email, moderation, embeddings, tagging, ranking, karma, cleanup, images
│   │   ├── schedulers/          # repeatable jobs
│   │   ├── utils/
│   │   ├── app.js               # builds the Express app (no listen)
│   │   ├── server.js            # API + Socket.IO entry point (listen, graceful shutdown)
│   │   └── worker.js            # BullMQ worker entry point (separate process in production)
│   ├── prisma/                  # schema.prisma, migrations, seed.js
│   ├── jsconfig.json
│   ├── .env.example             # every backend variable (used by API and worker)
│   └── package.json
├── ml/                          # all AI/ML code (JavaScript, runs on Node.js)
│   ├── src/
│   │   ├── interfaces/          # JSDoc contracts: ToxicityClassifier, Embedder, TagSuggester
│   │   ├── providers/           # hosted API providers, local ONNX providers, heuristic fallbacks, deterministic fakes for tests
│   │   ├── policy/              # thresholds, decision policy (ALLOW / REVIEW / HIDE), configuration objects
│   │   └── index.js
│   ├── evaluation/              # scripts that compute precision, recall, F1 and threshold sweeps
│   ├── datasets/                # small labeled samples with licenses noted (never real user data)
│   ├── reports/                 # generated evaluation reports
│   ├── jsconfig.json
│   └── package.json
├── shared/                      # Zod schemas, DTO shapes, constants, error codes, permission matrix (JavaScript)
│   ├── src/
│   └── package.json
├── docs/
│   ├── SRS.md
│   ├── architecture/            # diagrams (Mermaid), C4 views
│   ├── uml/                     # use case, class, sequence, activity, ER (Mermaid or PlantUML)
│   ├── api/                     # OpenAPI export
│   ├── decisions/               # ADRs
│   ├── testing/                 # test plan, cases, reports, bug log
│   ├── security/                # threat model, checklist
│   ├── operations/              # runbooks, deployment, backup/restore
│   ├── project-management/      # sprint plan, risk register, timeline
│   └── KNOWN_LIMITATIONS.md
├── infra/
│   ├── docker/                  # Dockerfiles
│   ├── k6/                      # load test scripts
│   └── scripts/                 # helper scripts (env check, secret generation), all .js
├── .github/
│   ├── workflows/               # ci.yml, deploy-*.yml, codeql.yml, dependency-review.yml
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example                 # committed; only the variables docker-compose itself needs
├── .nvmrc
├── .editorconfig
├── .gitignore
├── .gitattributes
├── pnpm-workspace.yaml          # frontend, backend, ml, shared
├── package.json                 # root scripts
├── jsconfig.base.json
├── eslint.config.js
├── prettier.config.js
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── LICENSE
└── README.md
```

**Dependency direction (MUST be enforced by an ESLint import rule and checked in CI):**

- `frontend` may import `shared`. It MUST NOT import `backend` or `ml`.
- `backend` may import `shared` and `ml`. It MUST NOT import `frontend`.
- `ml` MUST NOT import `backend` or `frontend`. It is pure library code: it receives configuration as arguments, returns plain data, and never reads `process.env`, Express, Prisma or Redis.
- `shared` imports nothing from the other packages.

Workspace package names are `@coddite/frontend`, `@coddite/backend`, `@coddite/ml` and `@coddite/shared`.

### 4.2 Architectural rules for the backend

Use a strict layered architecture inside each module:

- **Routes** declare paths, attach middleware (auth, RBAC, rate limit, validation) and delegate to controllers.
- **Controllers** translate HTTP to service calls and back. They contain no business logic and no database access.
- **Services** hold business rules, orchestrate repositories, queues and caches, and are the unit of testing.
- **Repositories** are the only layer that touches Prisma or raw SQL.
- **Schemas** (Zod, in `shared/` when shared with the frontend) define request and response shapes and are the basis of OpenAPI documentation.

Rules:

- Controllers MUST NOT import Prisma. Services MUST NOT import Express types.
- Every request body, query string, path parameter and header you read MUST be parsed through a Zod schema. Reading `req.body.x` directly is forbidden.
- Every response MUST be built from an explicit **response DTO**, never by returning a raw database row. This is how you guarantee private fields (email, IP, internal flags) never leak.
- `app.js` builds the Express app without calling `listen`, so tests can import it. `server.js` is the only file that starts listening for HTTP. `worker.js` is the only file that starts the BullMQ workers (or `server.js` does so when `RUN_WORKER_IN_API=true`, by calling the same start function).
- Wrap async handlers so rejections reach the central error handler. Use a single error class hierarchy (`AppError` with `code`, `httpStatus`, `isOperational`) and one error-handling middleware that produces a consistent error envelope.

### 4.3 Consistent response envelope

Success:

```json
{ "data": { }, "meta": { "nextCursor": "opaque-string-or-null" } }
```

Error:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again later.",
    "requestId": "b3f1c2...",
    "details": [ { "path": "title", "message": "Required" } ]
  }
}
```

Error codes are defined once in `shared/` and used by both backend and frontend. Error messages returned to clients MUST NOT contain stack traces, SQL, file paths, or anything that helps an attacker. Log the detail server-side with the `requestId`.

### 4.4 Code quality tooling

- **ESLint** (flat config in `eslint.config.js`) with `eslint-plugin-n`, `eslint-plugin-import` (import ordering and the dependency-direction rule from Part 4.1), `eslint-plugin-promise` (or type-aware `no-floating-promises` and `no-misused-promises` rules if you enable them on JavaScript through a `jsconfig`-based project), `eslint-plugin-jsdoc` and `eslint-plugin-security`; **Prettier**; **EditorConfig**.
- **Husky + lint-staged**: lint and format staged files on commit; **commitlint** for Conventional Commits.
- **JSDoc type checking** per package via `jsconfig.json` (`checkJs`, `strict`) run with `tsc --noEmit`, plus workspace package imports (`@coddite/shared`, `@coddite/ml`). No `.ts` files.
- **`pnpm -r` scripts** at the root: `dev` (starts frontend, backend and, unless disabled, the worker), `build`, `lint`, `typecheck` (the JSDoc check), `test`, `test:e2e`, `db:migrate`, `db:seed`, `env:check`, `docs:build`, `ml:evaluate`.
- **Dependency hygiene:** enable Dependabot, run `pnpm audit` in CI, pin exact versions in lockfile, review new dependencies for maintenance status and license before adding.

### 4.5 First actions after reading this document

Do these in order, and stop at the STOP-AND-ASK:

1. Create the repository skeleton above (empty modules are fine at this point).
2. Configure pnpm workspaces (`frontend`, `backend`, `ml`, `shared`), ESLint, Prettier, Husky, commitlint and the JSDoc type-check setup.
3. Create `docker-compose.yml` for local Postgres (with `pgvector`), Redis, and a mail catcher.
4. Create `.env.example` files (see Part 5) containing **every** variable with placeholders and comments.
5. Implement the **typed environment loader** and the `env:check` script (Part 5.5).
6. **STOP-AND-ASK: collect the environment values from the user (Part 5.3).**
7. Only after the environment validates, continue with the database and Phase 1 work.

---

## PART 5 — ENVIRONMENT VARIABLES AND THE MANDATORY ENV PROTOCOL

### 5.1 Principles

1. **Configuration lives in the environment.** Nothing environment-specific is hardcoded.
2. **Fail fast.** On startup, the backend (API and worker) and the frontend build validate their environment with Zod (Part 5.5). If a required variable is missing or malformed, the process prints *which variable* is wrong (never its value) and exits non-zero.
3. **Separate files per package.** `backend/.env` (read by both the API and the worker), `frontend/.env` (public values only) and a root `.env` used only by `docker-compose.yml`. `ml/` and `shared/` have no `.env` file. All are git-ignored. Only `.env.example` files are committed.
4. **Least privilege.** The web app receives only public, non-secret values. Anything prefixed `VITE_` is embedded in the public JavaScript bundle and is visible to every visitor. **A secret MUST NEVER have a `VITE_` prefix.**
5. **Different secrets per environment.** Development, staging and production use different secrets, databases and API keys. Never reuse a production secret locally.
6. **Generate what you can.** Cryptographic secrets (JWT secrets, HMAC peppers, encryption keys) are generated locally by a script the user runs, not requested from the user or invented by you and pasted into chat.

### 5.2 Complete variable catalogue

Create `.env.example` files containing all of these, grouped and commented. For each variable, the comment MUST explain what it is, the expected format, and where to obtain it.

**A. Core application (backend: API and worker)**

| Variable | Purpose | Example / format |
|---|---|---|
| `NODE_ENV` | `development`, `test`, `production` | `development` |
| `APP_NAME` | Display name in emails | `Coddite` |
| `PORT` | API listen port | `4000` |
| `LOG_LEVEL` | Pino level | `info` |
| `API_BASE_URL` | Public URL of API | `http://localhost:4000` |
| `WEB_BASE_URL` | Public URL of web app | `http://localhost:5173` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated exact origins | `http://localhost:5173` |
| `TRUST_PROXY` | Number of proxy hops for correct client IP | `1` in production behind a load balancer |
| `RUN_WORKER_IN_API` | When `true`, the API process also starts the BullMQ processors (low-budget deployments only) | `false` by default and in production if a separate worker service exists |

**B. Database**

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Runtime connection string | On Neon, use the **pooled** connection string |
| `DIRECT_URL` | Direct (non-pooled) string for Prisma migrations | Required for migrations on pooled providers |
| `DATABASE_POOL_MAX` | Max pool size | Tune per instance count |

**C. Redis**

| Variable | Purpose | Notes |
|---|---|---|
| `REDIS_URL` | TCP Redis for BullMQ and Socket.IO adapter | `redis://` or `rediss://` |
| `CACHE_REDIS_URL` | Optional separate TCP Redis for cache | Falls back to `REDIS_URL` |
| `UPSTASH_REDIS_REST_URL` | Optional REST endpoint for cache/rate limits | |
| `UPSTASH_REDIS_REST_TOKEN` | Optional REST token | **Secret** |

**D. Authentication and cryptography (generated, not requested)**

| Variable | Purpose | Generation |
|---|---|---|
| `JWT_ACCESS_SECRET` | Signs access tokens | 64 random bytes, base64 |
| `JWT_REFRESH_SECRET` | Signs/derives refresh tokens | 64 random bytes, base64, different from access |
| `ACCESS_TOKEN_TTL` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_TTL` | Refresh token lifetime | `30d` |
| `COOKIE_DOMAIN` | Cookie domain | Empty locally; parent domain in production |
| `COOKIE_SECURE` | `true` in production | |
| `COOKIE_SAMESITE` | `lax` (same-site deployment) or `none` (cross-site fallback) | |
| `EMAIL_HASH_PEPPER` | Secret pepper for HMAC of normalized email | 32+ random bytes, base64 |
| `EMAIL_ENCRYPTION_KEY` | AES-256-GCM key for stored email | Exactly 32 bytes, base64 |
| `EMAIL_ENCRYPTION_KEY_ID` | Key identifier for rotation | `v1` |
| `OTP_HMAC_SECRET` | Secret for HMAC of OTP codes | 32+ random bytes |
| `IP_HASH_SALT` | Salt for hashing IPs used in abuse control | 32+ random bytes |

**E. Email**

| Variable | Purpose |
|---|---|
| `EMAIL_PROVIDER` | `resend` or `smtp` |
| `RESEND_API_KEY` | **Secret**, from the Resend dashboard |
| `EMAIL_FROM` | Verified sender, for example `Coddite <no-reply@yourdomain>` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | For local mail catcher or SMTP fallback |

**F. Image storage**

| Variable | Purpose |
|---|---|
| `STORAGE_PROVIDER` | `cloudinary` (or `s3`/`r2` if abstracted) |
| `CLOUDINARY_CLOUD_NAME` | Public identifier |
| `CLOUDINARY_API_KEY` | Key |
| `CLOUDINARY_API_SECRET` | **Secret** |
| `UPLOAD_MAX_BYTES` | Max upload size |
| `UPLOAD_ALLOWED_MIME` | Comma-separated allowlist |

**G. Bot protection**

| Variable | Purpose |
|---|---|
| `TURNSTILE_SECRET_KEY` | **Secret**, server-side verification |
| `TURNSTILE_ENABLED` | `true`/`false` (`false` allowed only in dev/test) |

**H. AI/ML**

| Variable | Purpose |
|---|---|
| `AI_ENABLED` | Master switch |
| `TOXICITY_PROVIDER` | Which implementation to use |
| `EMBEDDING_PROVIDER` | Which implementation to use |
| `TAGGING_PROVIDER` | Which implementation to use |
| `LLM_PROVIDER` | Provider for LLM-backed tasks |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` / other | **Secret**, whichever providers the user chooses |
| `EMBEDDING_MODEL` | Model identifier |
| `EMBEDDING_DIMENSIONS` | Integer; MUST match the `vector(n)` column |
| `TOXICITY_AUTO_HIDE_THRESHOLD` | Score at or above which content is hidden pending review |
| `TOXICITY_REVIEW_THRESHOLD` | Score at or above which content is queued for moderators |
| `SIMILARITY_THRESHOLD` | Cosine similarity threshold for "similar question" |
| `AI_DAILY_BUDGET_CALLS` | Hard cap on paid API calls per day |

**I. Observability**

| Variable | Purpose |
|---|---|
| `SENTRY_DSN` | Backend DSN |
| `SENTRY_ENVIRONMENT` | Environment tag |
| `SENTRY_TRACES_SAMPLE_RATE` | Sampling |

**J. Rate limiting and abuse controls**

| Variable | Purpose |
|---|---|
| `RL_GLOBAL_PER_MIN` | Requests per IP per minute |
| `RL_AUTH_PER_15MIN` | Auth attempts per IP per 15 minutes |
| `RL_SIGNUP_PER_DAY_PER_IP` | Signup cap |
| `RL_POST_PER_HOUR_NEW_USER` | Post cap for new accounts |
| `RL_VOTE_PER_MIN` | Vote cap |
| `NEW_ACCOUNT_KARMA_LINK_THRESHOLD` | Karma needed to post links/images |

**K. Bootstrap**

| Variable | Purpose |
|---|---|
| `ADMIN_BOOTSTRAP_EMAIL` | Email that receives the admin role on first login (one-time; documented and removable) |

**L. Optional social login (feature-flagged)**

| Variable | Purpose |
|---|---|
| `GOOGLE_OAUTH_ENABLED` | Feature flag |
| `GOOGLE_CLIENT_ID` | Public client id |
| `GOOGLE_CLIENT_SECRET` | **Secret** |

**M. Frontend (`frontend/.env`) — public values only**

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API URL |
| `VITE_WS_URL` | Socket.IO URL |
| `VITE_TURNSTILE_SITE_KEY` | Public site key |
| `VITE_SENTRY_DSN` | Public frontend DSN |
| `VITE_GOOGLE_CLIENT_ID` | Public client id, if Google login is on |
| `VITE_APP_ENV` | Environment label |

### 5.3 STOP-AND-ASK: the mandatory environment collection protocol

**When to run it:** immediately after the repository skeleton, the `.env.example` files, the typed env loader and the `env:check` script exist (Part 4.5, step 6), and **before** you write any code that needs a database, Redis, email, storage, AI provider or CAPTCHA.

**How to run it.** Do not dump the whole list on the user at once. Work through it in short, clearly labeled rounds. In every round:

1. Name the group (for example "Round 2 of 7: Database").
2. For each variable, say **what it is, where to get it, and the exact format**.
3. State which values you will **generate locally** so the user does not have to supply them.
4. Tell the user how to give you the value safely: either by pasting the values into a local `.env` file themselves, or by pasting them to you so you can write the file. Recommend the first option for anything secret, and never repeat pasted secrets back.
5. Wait for the answer before moving to the next round.

**Suggested rounds.**

1. **Deployment shape.** Ask: Does the user own a domain? If yes, what is it and what subdomains do they want (`app.` and `api.`)? Which hosting will they use for the frontend (Vercel/Netlify) and for API and worker (Render/Railway/Fly.io)? This decides cookie configuration.
2. **Database.** Ask for the Neon (or other) `DATABASE_URL` (pooled) and `DIRECT_URL`. Remind them to enable the `vector` extension. For local development, offer the Docker Postgres defaults instead.
3. **Redis.** Ask which Redis provider(s) they will use. Collect `REDIS_URL` (TCP) and, if used, the Upstash REST URL and token. Explain the BullMQ polling cost caveat (Part 3.5) and let them choose.
4. **Email.** Ask for the Resend API key and the verified sender address, or offer the local mail-catcher SMTP defaults for development.
5. **Images and CAPTCHA.** Ask for Cloudinary credentials and Cloudflare Turnstile site and secret keys, or offer to disable them in development with the dev-only flags.
6. **AI providers.** Ask which provider(s) the user wants for toxicity, embeddings and LLM tasks, and collect the corresponding API keys. Confirm the embedding model and its **dimension**, because it fixes the `vector(n)` column size. Ask for a sensible daily call budget.
7. **Observability and admin.** Ask for the Sentry DSNs (optional at first), and for the email address that should become the first admin.

**Generation step.** Provide `infra/scripts/generate-secrets.js` that prints, for the user to copy into their own `.env`, freshly generated values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `EMAIL_HASH_PEPPER`, `EMAIL_ENCRYPTION_KEY`, `OTP_HMAC_SECRET` and `IP_HASH_SALT` using Node's `crypto.randomBytes`. It MUST be documented that these values must be different for every environment and must be stored in a password manager or the hosting provider's secret store.

**After collection.**

1. Write the values only into git-ignored `.env` files.
2. Run `pnpm env:check`. It prints a pass/fail table by variable name, **never values**.
3. Confirm `git status` shows no `.env` file staged, and that `.gitignore` covers `.env`, `.env.*` (except `.env.example`), and any key files.
4. Report to the user which groups are complete and which are deferred (for example "Sentry: deferred, app runs without it").

**Deferred values.** If the user does not have a value yet, the corresponding feature MUST degrade gracefully behind a flag in development (for example `AI_ENABLED=false`, `TURNSTILE_ENABLED=false`, local mail catcher), and the production validator MUST refuse to start if a security-critical variable is missing while `NODE_ENV=production`. You MUST NOT silently disable security controls in production.

### 5.4 Environment file hygiene

- `.gitignore` MUST ignore `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`, and provider credential files.
- Add a **pre-commit secret scan** (for example `gitleaks` or `secretlint`) and a CI secret scan.
- In hosting dashboards, secrets are set as **secret environment variables**, not in build logs. Do not echo variables in CI steps.
- Document rotation in `docs/operations/secret-rotation.md`: how to rotate JWT secrets (support two active keys during rollover), email encryption keys (via `EMAIL_ENCRYPTION_KEY_ID` and re-encryption job), API keys and database passwords.

### 5.5 Typed environment loader (canonical pattern)

Implement one env module per runtime: `backend/src/config/env.js` (shared by the API and the worker) and `frontend/src/lib/env.js` (validating `import.meta.env`). Each one:

- Parses `process.env` with a Zod schema.
- Coerces numbers and booleans explicitly (a string `"false"` must not become truthy).
- Applies **production-only refinements**: `COOKIE_SECURE` must be `true`, `TURNSTILE_ENABLED` must be `true`, secrets must meet minimum length, `CORS_ALLOWED_ORIGINS` must not contain `*` or `http://` origins (except localhost in non-production), `DATABASE_URL` must use TLS.
- Exports a single frozen `env` object, documented with JSDoc types. No other file reads `process.env` (the `ml` and `shared` packages receive configuration as arguments).
- On failure, prints only variable names and human-readable reasons, then exits with code 1.

```js
// canonical shape (abbreviated) — plain JavaScript, validated at runtime by Zod
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(64),
    JWT_REFRESH_SECRET: z.string().min(64),
    COOKIE_SECURE: z.enum(['true', 'false']).transform((v) => v === 'true'),
    RUN_WORKER_IN_API: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    // ... every variable from the catalogue
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV === 'production' && !cfg.COOKIE_SECURE) {
      ctx.addIssue({ code: 'custom', path: ['COOKIE_SECURE'], message: 'must be true in production' });
    }
    // ... more production guards
  });

/** @typedef {z.infer<typeof schema>} Env */
export const env = Object.freeze(schema.parse(process.env));
```

The `env:check` script imports the same schema for the backend (API and worker) and a separate, smaller schema for the frontend's public variables, and prints a table of variable name and status only.

---

## PART 6 — DATA MODEL

### 6.1 Design principles

1. **Identity is separated from activity.** The table that holds the real email (`User`) is not joined by any public query. All public content references `Profile` (the anonymous persona) only.
2. **Integrity in the database, not just the app.** Foreign keys, unique constraints, check constraints and `NOT NULL` wherever true. Do not rely on application code alone to prevent duplicates or orphans.
3. **Soft delete where moderation needs history; hard delete where privacy requires it.** Posts and comments are soft-deleted (`deletedAt`, `removedReason`) so moderators and audits retain context. Account deletion follows the privacy rules in Part 7.8.
4. **Denormalized counters** (`upvotes`, `downvotes`, `voteScore`, `commentCount`, `postCount`, `karma`) are kept in the database for fast reads and are updated transactionally or by reconciling jobs. `voteScore` always equals `upvotes - downvotes`. A nightly reconciliation job MUST recompute counters from source rows and log any drift.
5. **Every hot query has an index.** Indexes are listed per table below and justified. Do not add indexes without a query that uses them, and do not omit an index that a hot query needs. Verify with `EXPLAIN (ANALYZE, BUFFERS)` and save results in `docs/performance/`.
6. **IDs.** Use **UUID v7** for all primary keys (time-ordered, index-friendly, non-enumerable), generated in application code inside repositories (or with Prisma's `uuid(7)` default if the installed version supports it; verify in current documentation). Do not depend on database-side functions that vary with the Postgres version. Record the decision in an ADR. Never expose sequential integer IDs for users, posts or comments.
7. **Timestamps.** `createdAt`, `updatedAt` on all mutable tables, stored in UTC.

### 6.2 Entities

**Identity and sessions**

- **User**: `id`, `emailHash` (HMAC-SHA256 of the normalized email using the pepper; unique; used for lookup and ban checks), `emailCiphertext` (AES-256-GCM of the email, with IV and auth tag), `emailKeyId`, `passwordHash` (nullable; only if password login is enabled), `role` (`USER`, `ADMIN`), `status` (`ACTIVE`, `SUSPENDED`, `BANNED`, `DELETED`), `emailVerifiedAt`, `lastLoginAt`, `createdAt`, `updatedAt`.
- **Profile**: `id`, `userId` (unique FK), `handle` (unique, case-insensitive), `handleChangedAt`, `avatarUrl`, `avatarSeed`, `bio` (optional, short), `karma`, `trustLevel` (0 to 4), `postCount`, `commentCount`, `createdAt`.
- **RefreshToken**: `id`, `userId`, `familyId`, `tokenHash` (hash of the opaque token; never store the raw token), `expiresAt`, `revokedAt`, `replacedById`, `userAgentHash`, `ipHash`, `createdAt`. Supports rotation and reuse detection (Part 7.4).
- **BannedIdentity**: `id`, `emailHash` (unique), `reason`, `createdById`, `createdAt`. Blocks re-registration.

**Community**

- **Community**: `id`, `slug` (unique, lowercase, URL-safe), `name`, `description`, `rulesMarkdown`, `iconUrl`, `bannerUrl`, `isPrivate` (reserved), `isNsfw`, `postingPolicy` (`ANYONE`, `MEMBERS`, `MODS_ONLY`), `memberCount`, `createdById` (Profile), `createdAt`.
- **CommunityMember**: `communityId`, `profileId`, `role` (`MEMBER`, `MODERATOR`, `OWNER`), `mutedUntil`, `joinedAt`. Composite primary key `(communityId, profileId)`.

**Content**

- **Post**: `id`, `communityId`, `authorId` (Profile), `type` (`DISCUSSION`, `QUESTION`), `title`, `bodyMarkdown` (raw markdown only; there is **no** `bodyHtml` column and content is sanitized at render time), `status` (`VISIBLE`, `PENDING_REVIEW`, `REMOVED`, `LOCKED`), `isSolved`, `acceptedCommentId` (nullable), `isPinned`, `voteScore`, `upvotes`, `downvotes`, `commentCount`, `hotScore` (float, maintained by a job), `searchVector` (`tsvector`, generated), `language` (optional; the dominant language detected from the info strings of fenced code blocks when the post is created; informational only, used for display and filtering), `deletedAt`, `removedReason`, `createdAt`, `updatedAt`, `editedAt`.
- **Tag**: `id`, `slug` (unique), `name`, `usageCount`.
- **PostTag**: `postId`, `tagId`. Composite primary key. Limit tags per post (for example 5) in the service layer.
- **Comment**: `id`, `postId`, `authorId`, `parentId` (nullable self-FK), `depth` (int), `path` (text materialized path such as `0001.0007.0003`, for ordering and subtree queries), `bodyMarkdown`, `status`, `voteScore`, `upvotes`, `downvotes`, `replyCount`, `isAccepted`, `deletedAt`, `createdAt`, `updatedAt`, `editedAt`.
- **Attachment**: `id`, `postId` (nullable), `ownerId`, `provider`, `publicId`, `url`, `width`, `height`, `bytes`, `mime`, `status` (`PROCESSING`, `READY`, `REJECTED`), `createdAt`. Attachments are created before their post exists, so `postId` is nullable. A repeatable `maintenance` job deletes attachments with no `postId` older than 24 hours, **including the stored file at the provider**, and logs how many were removed.
- **Bookmark**: `profileId`, `postId`, `createdAt`. Composite key.

**Voting**

- **PostVote**: `profileId`, `postId`, `value` (`+1` or `-1`), `createdAt`, `updatedAt`. Composite primary key `(profileId, postId)`. This key **is** the duplicate-vote prevention.
- **CommentVote**: same shape for comments.

Use two tables rather than one polymorphic table so that foreign keys stay real.

**Moderation and safety**

- **Report**: `id`, `reporterId`, `targetType` (`POST`, `COMMENT`, `PROFILE`), `targetId`, `reason` (enum), `details`, `status` (`OPEN`, `ACTIONED`, `DISMISSED`), `resolvedById`, `resolvedAt`, `createdAt`. Unique on `(reporterId, targetType, targetId)` to prevent report spam.
- **ModerationResult**: `id`, `targetType`, `targetId`, `provider`, `model`, `toxicityScore`, `spamScore`, `labels` (JSON), `decision` (`ALLOW`, `REVIEW`, `HIDE`), `createdAt`. Stores what the AI said and why, for auditability and threshold tuning.
- **ModerationAction**: `id`, `actorId`, `communityId` (nullable), `action` (enum: `REMOVE`, `RESTORE`, `LOCK`, `PIN`, `MUTE`, `BAN`, ...), `targetType`, `targetId`, `reason`, `createdAt`.
- **AuditLog**: `id`, `actorId` (nullable for system), `actorRole`, `action`, `entityType`, `entityId`, `metadata` (JSON, scrubbed of PII), `ipHash`, `requestId`, `createdAt`. Append-only. Application role MUST NOT be able to update or delete rows (enforce with DB permissions if the host allows, otherwise by convention plus tests).

**Engagement**

- **Notification**: `id`, `recipientId`, `type`, `actorId` (nullable), `postId`, `commentId`, `payload` (JSON), `readAt`, `createdAt`.
- **KarmaEvent**: `id`, `profileId`, `delta`, `reason`, `sourceType`, `sourceId`, `createdAt`. Karma is the sum of events, cached on `Profile.karma`.

**Embeddings (raw SQL)**

- **PostEmbedding**: `postId` (PK, FK), `model`, `dimensions`, `embedding vector(N)`, `createdAt`. Prisma does not natively model `vector`; declare it as `Unsupported("vector(N)")` and access it with `$queryRaw`/`$executeRaw`, or manage this table entirely through hand-written SQL in a migration. Record the choice in an ADR.

### 6.3 Canonical Prisma sketch

The following is a **canonical sketch**. Complete it, name things consistently, and adjust types after checking Prisma's current syntax and the chosen provider. The sketch shows `@default(uuid())` for readability; replace it with the UUID v7 approach from Part 6.1 (application-generated ids, or `uuid(7)` if supported). Apply the same field additions (`upvotes`, `downvotes`, `editedAt`, `handleChangedAt`, `postCount`, `commentCount`, `language`) to `Comment` and `Profile` when you complete the remaining models, and do not add `bodyHtml`.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearchPostgres"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [vector]
}

enum Role { USER ADMIN }
enum UserStatus { ACTIVE SUSPENDED BANNED DELETED }
enum PostType { DISCUSSION QUESTION }
enum ContentStatus { VISIBLE PENDING_REVIEW REMOVED LOCKED }
enum MemberRole { MEMBER MODERATOR OWNER }

model User {
  id              String     @id @default(uuid()) @db.Uuid
  emailHash       String     @unique
  emailCiphertext Bytes
  emailKeyId      String
  passwordHash    String?
  role            Role       @default(USER)
  status          UserStatus @default(ACTIVE)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  profile         Profile?
  refreshTokens   RefreshToken[]
}

model Profile {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @unique @db.Uuid
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  handle        String   @unique          // enforce case-insensitivity via a lower(handle) unique index in SQL
  handleChangedAt DateTime?
  avatarSeed    String
  avatarUrl     String?
  bio           String?  @db.VarChar(280)
  karma         Int      @default(0)
  trustLevel    Int      @default(0)
  postCount     Int      @default(0)
  commentCount  Int      @default(0)
  createdAt     DateTime @default(now())
  posts         Post[]
  comments      Comment[]
}

model Post {
  id               String        @id @default(uuid()) @db.Uuid
  communityId      String        @db.Uuid
  authorId         String        @db.Uuid
  type             PostType      @default(DISCUSSION)
  title            String        @db.VarChar(300)
  bodyMarkdown     String
  language         String?
  status           ContentStatus @default(VISIBLE)
  isSolved         Boolean       @default(false)
  acceptedCommentId String?      @db.Uuid
  isPinned         Boolean       @default(false)
  voteScore        Int           @default(0)
  upvotes          Int           @default(0)
  downvotes        Int           @default(0)
  commentCount     Int           @default(0)
  hotScore         Float         @default(0)
  deletedAt        DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  editedAt         DateTime?

  @@index([communityId, createdAt(sort: Desc), id])
  @@index([communityId, hotScore(sort: Desc), id])
  @@index([communityId, voteScore(sort: Desc), createdAt(sort: Desc)])
  @@index([authorId, createdAt(sort: Desc)])
  @@index([type, isSolved, createdAt(sort: Desc)])
}

model PostVote {
  profileId String   @db.Uuid
  postId    String   @db.Uuid
  value     Int      // constrained to -1 or 1 with a CHECK in the migration
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@id([profileId, postId])
  @@index([postId])
}
```

Complete the remaining models in the same style.

### 6.4 Migrations that Prisma cannot express

Create hand-written SQL migrations (kept in `prisma/migrations`) for:

1. `CREATE EXTENSION IF NOT EXISTS vector;` and `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
2. `CHECK (value IN (-1, 1))` on vote tables.
3. Case-insensitive unique index: `CREATE UNIQUE INDEX profile_handle_lower_key ON "Profile" (lower(handle));`
4. `searchVector` as a generated column and its GIN index:
   ```sql
   ALTER TABLE "Post" ADD COLUMN "searchVector" tsvector
     GENERATED ALWAYS AS (
       setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
       setweight(to_tsvector('english', coalesce("bodyMarkdown", '')), 'B')
     ) STORED;
   CREATE INDEX post_search_vector_gin ON "Post" USING GIN ("searchVector");
   ```
5. Trigram index on `Tag.name` and `Profile.handle` for prefix and fuzzy lookup.
6. `PostEmbedding` table with `embedding vector(N)` and an approximate-nearest-neighbor index (HNSW or IVFFlat, whichever the installed `pgvector` version supports; choose parameters by measuring on seed data and record results in `docs/performance/`). The dimension `N` comes from `EMBEDDING_DIMENSIONS`. Changing the embedding model later requires a re-embedding migration; document that procedure.
7. Partial indexes for the moderator queue (for example open reports, pending-review posts).
8. Append-only enforcement for `AuditLog` if the hosting provider permits role-level grants.

### 6.5 Comment threading strategy

Nested comments are the classic hard problem. Use **parent pointer + materialized path + depth**:

- `parentId` gives the tree.
- `path` gives a sortable string so that a whole thread can be fetched in display order with one indexed query (`WHERE postId = $1 ORDER BY path`), and a subtree with `path LIKE 'prefix%'`.
- `depth` lets you cap nesting (recommend a maximum of 8 in the data model and a "continue this thread" link in the UI beyond a lower visual depth such as 5).
- Fetch strategy: load top-level comments by sort mode with cursor pagination, then load the first N replies per top-level comment, then "load more replies" on demand. Never fetch an unbounded thread in one request.
- Vote-based sorting of siblings ("Top") is done by `(voteScore DESC, createdAt ASC)` among comments sharing a `parentId`, so pagination is per parent.

Document the chosen approach and the alternatives you rejected (adjacency list with recursive CTE, nested sets, closure table) in an ADR.

### 6.6 Hot ranking

Maintain `Post.hotScore` with a documented formula, for example a log-scaled vote score plus a time-decay term based on post age. The exact formula is yours to choose but MUST be documented in `docs/decisions/hot-ranking.md`, deterministic, and unit tested. A BullMQ repeatable job recomputes `hotScore` for recently active posts, and vote handlers may also update it eagerly for the affected post. Avoid recomputing the entire table.

### 6.7 Seed data and fixtures

`prisma/seed.js` MUST create deterministic, obviously fake data: a handful of users with generated handles, an admin, several communities, tagged posts (including solved questions with accepted answers), nested comments, votes, and a few open reports. **No real emails or personal data.** Use reserved example domains such as `example.test`. Provide a larger optional seed (thousands of rows) for load testing and index verification, behind a flag.

---

## PART 7 — AUTHENTICATION, AUTHORIZATION AND ANONYMITY

### 7.1 Threat model summary

The platform must resist: credential stuffing, OTP brute-forcing, account enumeration, token theft and replay, CSRF, XSS-driven token theft, spam and sockpuppet floods, de-anonymization through API leakage, timing side channels, and abuse by banned users re-registering. Write the full threat model in `docs/security/threat-model.md` using STRIDE.

### 7.2 Login method

Primary method: **email + OTP** (passwordless). Optional: password login and Google sign-in behind feature flags. If password login is enabled, use **argon2id** with parameters tuned to the hosting hardware, enforce a length-based policy (minimum 10 characters, check against a breached-password list if feasible), and never truncate or restrict character sets.

### 7.3 OTP flow (canonical)

1. Client submits an email plus a Turnstile token to `POST /auth/otp/request`.
2. Server verifies the Turnstile token, normalizes the email, checks `BannedIdentity` and disposable-email blocklist, applies rate limits (per IP, per email hash and globally), and **always returns the same generic response** whether or not the email is known. This prevents account enumeration.
3. Server generates a 6-digit code using a cryptographically secure RNG, stores **only an HMAC of the code** in Redis under a key derived from the email hash, with a 5-minute TTL, an attempt counter, and a resend cooldown.
4. A BullMQ job sends the email. The API does not wait for delivery.
5. Client submits the code to `POST /auth/otp/verify`. Server compares in **constant time**, increments the attempt counter, and after 5 failures invalidates the code and imposes a cooldown.
6. On success: create the `User` and `Profile` if new (generating a handle), record `emailVerifiedAt`, create a session (Part 7.4), and delete the OTP key. A code MUST be single-use.

Never log OTP codes, never include them in URLs, and never return them in API responses, including in development. In development, the mail catcher shows the email; that is the only place a code appears.

### 7.4 Sessions and tokens

- **Access token:** short-lived JWT (about 15 minutes), sent in the `Authorization: Bearer` header, held in **memory only** in the SPA (never `localStorage` or `sessionStorage`). Claims: `sub` (user id), `pid` (profile id), `role`, `iat`, `exp`, `jti`. Do **not** include the email or handle-to-identity mappings.
- **Refresh token:** a long, random, opaque value (not a JWT) stored **hashed** in the database, delivered as an **httpOnly, Secure, SameSite** cookie scoped to the auth path (for example `Path=/auth`).
- **Rotation:** every refresh issues a new refresh token and revokes the old one, linking them via `familyId` and `replacedById`.
- **Reuse detection:** if a revoked refresh token is presented, treat it as theft: revoke the **entire family**, force re-login, write an audit event. This is a standard defense against stolen refresh tokens.
- **Logout:** revoke the current family and clear the cookie. Provide "log out of all devices" that revokes all families for the user.
- **Silent refresh:** the SPA refreshes on 401 or shortly before expiry, with a single in-flight refresh promise to avoid stampedes.
- **Signing algorithm:** pick one algorithm (HS256 with a strong secret is acceptable; asymmetric RS256/EdDSA is preferred if you plan more services). Explicitly specify the allowed algorithm when verifying, and reject `none`.
- **Key rotation:** support two active signing keys via a `kid` header to allow rotation without logging everyone out.

### 7.5 CSRF and cookie defense

Because the refresh cookie is sent automatically, protect the endpoints that use it:

- Use `SameSite=Lax` (or `Strict` for the refresh path if UX allows) in the same-site deployment.
- Require a **custom header** (for example `X-Requested-With: coddite-web`) on refresh and logout; browsers will not add it cross-site without a CORS preflight, which your CORS policy rejects.
- Validate the `Origin` (and `Referer` fallback) against the allowlist on state-changing cookie-authenticated requests.
- All other endpoints authenticate with the bearer access token, which is not an ambient credential and is therefore not CSRF-prone.

### 7.6 Authorization (RBAC + resource ownership)

- Encode a **permission matrix** in `shared/` (role × action) and enforce it in middleware and services.
- Distinguish **global roles** (`USER`, `ADMIN`) from **community roles** (`MEMBER`, `MODERATOR`, `OWNER`). Moderator powers apply only inside their community.
- Enforce **ownership** in services: a user can edit or delete only their own content, within an edit window if you set one.
- Every service method that mutates data receives an explicit `actor` object; do not read identity from globals.
- Test authorization exhaustively: for each endpoint, write tests for anonymous, wrong-role, wrong-owner and correct-actor cases. Broken access control is the top web vulnerability; treat it that way.

### 7.7 Anonymity guarantees (each must have a test)

1. No public endpoint response contains `email`, `emailHash`, `emailCiphertext`, `ipHash`, `userId` (use `profileId` or handle only), or internal flags. Write a **response-schema test** that walks every route's response and fails if a forbidden key appears anywhere in the JSON.
2. Logs never contain emails, OTPs, tokens, or raw IPs. Configure Pino **redaction** paths and add a test that logs a sample request and asserts redaction.
3. The email is stored encrypted (AES-256-GCM, unique IV per record, key ID recorded). It is decrypted only in the narrow code paths that must send mail, never in list queries.
4. Handles are generated from a curated wordlist plus a random suffix, checked against a blocklist (profanity, impersonation of "admin", "moderator", "coddite", "staff"), and must not embed any part of the email.
5. Image uploads have EXIF and geolocation metadata stripped server-side before storage.
6. Timing and error behavior on auth endpoints does not reveal whether an email is registered.
7. A user changing their handle does not expose the old handle in public data; historical content shows the current handle because content references `profileId`.
8. Admin and moderator tools show handles, not emails. Access to the decrypted email by an admin, if ever required (for legal reasons), MUST be a separate, explicitly logged action, and the design decision to include or exclude that capability is documented in an ADR. The recommended default is that **no UI exposes it**.

### 7.8 Account deletion and data rights

Provide `DELETE /me` with a re-authentication step. Behavior: revoke all sessions, delete the `User` row and the stored email ciphertext, keep `emailHash` only if needed to enforce a ban, anonymize the `Profile` to a "deleted" placeholder while keeping content structure (or delete content, at the user's choice), and record an audit event. Provide `GET /me/export` returning the user's own data as JSON. Document retention periods in `docs/security/data-retention.md`. Provide a privacy policy and terms of service page in the web app; draft them as reasonable starting text and tell the user to have them reviewed if the app will serve the public, since you are not a lawyer.

### 7.9 Fallback if the user has no shared parent domain

If the web app and API cannot share a parent domain, cookie-based refresh may be blocked by browsers that restrict third-party cookies. In that case:

1. Prefer to put the API behind the same origin using a **reverse-proxy rewrite** on the frontend host (for example, a Vercel or Netlify rewrite from `/api/*` to the API service), which makes cookies first-party. Document the added latency and hosting limits.
2. If that is not possible, use `SameSite=None; Secure` cookies, and document the browser-compatibility risk in `docs/KNOWN_LIMITATIONS.md`.
3. Do **not** fall back to storing refresh tokens in `localStorage`.

Ask the user which option they can support (Part 5.3, round 1).

### 7.10 Abuse controls tied to identity

- **Trust levels** (0 to 4) derived from account age, karma and behavior. Level 0 accounts: low posting caps, no links or images, votes carry less weight for ranking, and are rate limited more tightly. Higher levels unlock privileges. The thresholds live in configuration and are documented.
- **Disposable email blocking** using a maintained blocklist refreshed by a scheduled job, plus a manual admin override list.
- **IP and device signals** are used only in hashed form (salted hash), for rate limiting and abuse correlation, and expire after a defined retention period.
- **Bans:** account ban (status), email-hash ban (`BannedIdentity`), community mute, and shadow-limits for suspected spam (content accepted but held for review). Every ban records reason and actor in the audit log, and offers an appeal path (a simple form that creates a moderator-queue item).

---

## PART 8 — API DESIGN

### 8.1 General rules

- **Versioned base path:** `/api/v1`. Breaking changes require `/api/v2`.
- **REST, resource-oriented,** JSON only, UTF-8. Plural nouns, no verbs in paths except for well-defined actions (`/votes`, `/accept`).
- **Idempotency:** `PUT` and `DELETE` are idempotent. For non-idempotent creates that clients may retry (post creation, report creation), support an optional `Idempotency-Key` header stored in Redis for a short window.
- **Cursor pagination only** for feeds, comments, notifications and search. Query params: `limit` (default 20, max 50) and `cursor` (opaque, base64url of a signed or validated payload). Cursor contents are **not trusted**: parse and validate them. Never expose `OFFSET` pagination on large tables.
- **Sorting and filtering** parameters are allowlisted through Zod enums. Never interpolate client-provided column names into SQL.
- **Standard headers:** `X-Request-Id` on every response, `RateLimit-*` headers on limited routes, `Cache-Control` set deliberately (see Part 9).
- **HTTP status usage:** 200/201/204 success; 400 validation; 401 unauthenticated; 403 forbidden; 404 not found (also used to avoid revealing existence of restricted resources); 409 conflict; 413 payload too large; 422 semantic errors if you distinguish them from 400; 429 rate limited; 5xx only for genuine server faults.
- **Request size limits:** JSON body limit (for example 100 KB, larger only on specific routes), multipart file size limit, and a maximum number of fields.
- **Content negotiation:** reject unsupported `Content-Type` on write routes.
- **OpenAPI:** generate the spec from the Zod schemas (for example with `zod-to-openapi`) and serve Swagger UI at `/api/docs` in non-production, or behind admin authentication in production. Commit the exported spec to `docs/api/openapi.json` and fail CI if it drifts.

### 8.2 Endpoint catalogue

Implement at least the following. Names may be refined, but coverage must not shrink.

**Auth**

- `POST /auth/otp/request` — request an OTP (Turnstile, rate limited)
- `POST /auth/otp/verify` — verify OTP, start session
- `POST /auth/refresh` — rotate refresh token, return new access token
- `POST /auth/logout` — revoke current session
- `POST /auth/logout-all` — revoke all sessions
- `POST /auth/password/login`, `POST /auth/password/set` — only if password login flag is on
- `GET /auth/google`, `GET /auth/google/callback` — only if Google flag is on

**Me / profile**

- `GET /me` — own profile and permissions
- `PATCH /me` — bio, avatar seed
- `POST /me/handle/reroll` — new generated handle (rate limited, cooldown)
- `PUT /me/handle` — custom handle (availability check, cooldown, blocklist)
- `GET /me/bookmarks`, `GET /me/notifications`, `POST /me/notifications/read`
- `GET /me/export`, `DELETE /me`
- `GET /profiles/:handle` — public profile (handle, karma, badges, counts, public activity)
- `GET /profiles/:handle/posts`, `GET /profiles/:handle/comments`

**Communities**

- `GET /communities` (list, search, trending), `POST /communities` (rate limited, karma gated)
- `GET /communities/:slug`, `PATCH /communities/:slug` (owner/mod)
- `POST /communities/:slug/join`, `POST /communities/:slug/leave`
- `GET /communities/:slug/moderators`, `POST/DELETE /communities/:slug/moderators/:handle`

**Posts**

- `GET /posts` (global feed: `sort=hot|new|top`, `t=day|week|month|year|all`, `type`, `tag`, `solved`)
- `GET /communities/:slug/posts` (same params)
- `POST /communities/:slug/posts` (validation, sanitization, moderation pipeline, rate limits)
- `GET /posts/:id`, `PATCH /posts/:id`, `DELETE /posts/:id`
- `POST /posts/:id/vote` (`value` = 1, -1 or 0 to clear)
- `POST /posts/:id/bookmark`, `DELETE /posts/:id/bookmark`
- `POST /posts/:id/lock`, `POST /posts/:id/pin` (moderators)
- `POST /posts/:id/accept/:commentId` (post author or moderator)
- `GET /posts/:id/similar` — similar posts (embedding search)
- `POST /posts/suggest-similar` — while typing a title, return similar existing posts (rate limited, cached)
- `POST /posts/suggest-tags` — tag suggestions for a draft (rate limited)

**Comments**

- `GET /posts/:id/comments` (cursor, sort, per-parent pagination)
- `GET /comments/:id/replies` (load more replies)
- `POST /posts/:id/comments`, `POST /comments/:id/replies`
- `PATCH /comments/:id`, `DELETE /comments/:id`
- `POST /comments/:id/vote`

**Search**

- `GET /search` (`q`, `type=posts|communities|profiles|tags`, filters, cursor)
- `GET /search/suggest` (autocomplete for tags, communities, handles; heavily cached)

**Uploads**

- `POST /uploads/sign` or `POST /uploads` (depending on the provider approach): validate MIME by **content sniffing**, not just extension; enforce size limits; scan or re-encode images; strip metadata

**Reports and moderation**

- `POST /reports`
- `GET /mod/queue` (community moderators: reports and pending-review content for their communities)
- `POST /mod/actions` (remove, restore, lock, mute, with reason)
- `GET /mod/log` (community moderation log)

**Admin**

- `GET /admin/stats`
- `GET /admin/reports`, `POST /admin/bans`, `DELETE /admin/bans/:id`
- `GET /admin/audit-log` (filters, cursor)
- `GET/PUT /admin/settings` (AI thresholds, feature flags, limits)
- `GET /admin/ai/review-queue`, `GET /admin/ai/metrics` (precision proxies, decision counts)
- `PUT /admin/users/:profileId/role`

**Operations**

- `GET /health/live` — process is up (no dependencies)
- `GET /health/ready` — database and Redis reachable, migrations applied
- `GET /metrics` — Prometheus format, **not public** (protect by network rules or token)

### 8.3 Voting semantics

Voting must be correct under concurrency:

- Upsert the vote row in a **transaction** and adjust the denormalized `voteScore`, `upvotes` and `downvotes` by the **delta** between the old and new value. Never read-modify-write the counter in application memory.
- Casting the same vote again is a no-op; casting `0` removes the vote.
- Users cannot vote on their own content (or votes on own content do not affect karma), decide and document.
- Rate-limit votes per user and per IP. Detect vote rings by monitoring bursts of votes between the same account pairs, and log anomalies for admin review.
- Karma changes are recorded as `KarmaEvent` rows through a queue job so the vote request stays fast. Karma gains are capped per day per source to reduce farming.
- Reads may show counters from Redis for hot content (Part 9), but the database remains the source of truth.

### 8.4 Content creation pipeline

When a user creates a post or comment, the request path is:

1. Authenticate, authorize (community posting policy, mute status, trust-level limits).
2. Rate-limit (per profile and per IP, stricter for low trust).
3. Validate with Zod (length limits, tag count, allowed markdown features).
4. **Sanitize** markdown output (Part 14.3). Store the raw markdown; render and sanitize HTML deterministically.
5. Run **cheap synchronous checks**: banned-word/regex filters, link count limits, duplicate-content hash check within a time window.
6. Insert the row with `status = VISIBLE` **or** `PENDING_REVIEW` for accounts or content that the synchronous checks or trust level require to be held.
7. Enqueue background jobs: toxicity/spam scoring, embedding generation, auto-tag suggestion, notification fan-out, search/feed cache invalidation.
8. Return the created resource immediately. The AI result may later change `status`; when it does, emit a real-time event and a notification to the author explaining the outcome (for example, "held for review").

The user must never wait on an AI API call during the request. If the queue is unavailable, the API degrades safely (content is accepted into `PENDING_REVIEW` for low-trust accounts rather than silently skipping moderation).

### 8.5 Error handling and resilience in the API

- Every external call (database, Redis, email, storage, AI) has a **timeout**. No unbounded waits.
- Use **retries with exponential backoff and jitter** for idempotent external calls, and **circuit breakers** for flaky third parties (AI, email) so that failures do not cascade.
- **Graceful shutdown:** on `SIGTERM`, stop accepting new connections, finish in-flight requests, close Socket.IO, stop workers from taking new jobs and let active jobs finish (with a timeout), close Prisma and Redis connections, then exit. This matters on every platform that redeploys with rolling restarts.
- **Backpressure:** cap concurrent expensive operations (search, AI-triggering endpoints) with per-route concurrency limits.
- **Unhandled rejections and uncaught exceptions** are logged, reported to Sentry, and cause a controlled process exit so the platform restarts a clean instance.

---

## PART 9 — REDIS: CACHING, COUNTERS, RATE LIMITING

### 9.1 Roles of Redis in Coddite

1. **Rate limiting** (fixed or sliding window, token bucket for bursty routes).
2. **OTP and short-lived challenge storage** with TTL.
3. **Response and object caching** for hot reads.
4. **Counters and leaderboards** (vote deltas, view counts, trending sorted sets).
5. **BullMQ** job queues.
6. **Socket.IO adapter** for multi-instance real-time fan-out.
7. **Idempotency keys** and short-lived locks.

### 9.2 Key design (canonical conventions)

- Namespaced keys with a version prefix: `coddite:v1:<domain>:<entity>:<id>[:<facet>]`.
- Examples: `coddite:v1:rl:auth:ip:<hash>`, `coddite:v1:otp:<emailHash>`, `coddite:v1:cache:feed:hot:c:<slug>:p1`, `coddite:v1:post:<id>:score`, `coddite:v1:idem:<key>`.
- **Every key has a TTL** unless it is an intentionally persistent structure, which must be documented. No unbounded keyspace growth.
- **Never store PII** (emails, raw IPs) in keys or values. Use hashes.
- Document the key catalogue in `docs/architecture/redis-keys.md`, including TTLs and owners.

### 9.3 Caching strategy

Use **cache-aside** with careful invalidation:

- **What to cache:** public feed pages for guests (short TTL such as 30 to 60 seconds), community metadata, tag and community suggestion lists, similar-post results (keyed by content hash), public profile summaries, OpenAPI/health data as appropriate.
- **What NOT to cache:** anything user-specific without including the user in the key, anything permission-dependent, notification lists, or content whose staleness would be a safety issue (a removed post must stop being served promptly).
- **Invalidation:** on post creation, edit, removal, lock, pin, or vote-threshold changes, invalidate or version the affected keys. Prefer **short TTLs plus targeted invalidation** over long TTLs.
- **Stampede protection:** when a hot key expires, use a short lock or "stale-while-revalidate" so many requests do not hit the database simultaneously.
- **Negative caching:** cache "not found" briefly to protect the database from probing.
- **HTTP caching:** send appropriate `Cache-Control` and `ETag` for public read endpoints. Authenticated responses use `private, no-store` unless explicitly safe.
- **Fail open with limits:** if Redis is down, reads fall back to the database with protective rate limits, and the system reports degraded status. The database must never be the casualty of a cache outage, so keep concurrency limits on fallback paths.

### 9.4 Counters and the write-behind pattern

For very hot content, votes and view counts may be accumulated in Redis and flushed to Postgres periodically by a worker job. If you implement this:

- Use atomic operations (`INCRBY`, Lua scripts where needed).
- Make the flush idempotent, and record the last-flushed value.
- Accept that displayed counts may lag by seconds, and document the consistency model.
- The nightly reconciliation job compares Redis, denormalized columns and source rows.

If this adds too much risk relative to benefit, the acceptable simpler design is transactional database counters with row-level locking, plus Redis caching of read results. Choose deliberately and record the decision in an ADR, along with load-test evidence (Part 17).

### 9.5 Rate limiting design

Implement a reusable rate-limit middleware backed by Redis with **atomic** operations (Lua script or a well-maintained library). Provide these tiers:

| Tier | Key | Example policy |
|---|---|---|
| Global | IP | 300 requests per minute |
| Auth | IP + email hash | 5 OTP requests per 15 minutes per email; 20 per 15 minutes per IP |
| OTP verify | email hash | 5 attempts per code |
| Signup | IP | Low daily cap |
| Content creation | profile | Depends on trust level (for example level 0: 3 posts per hour, 10 comments per hour) |
| Voting | profile | 60 per minute |
| Search / suggest | IP or profile | 30 per minute |
| AI-triggering endpoints | profile | Strict, plus a global daily budget |
| Reporting | profile | Prevent report spam |

Return `429` with `Retry-After` and the standard `RateLimit-*` headers. Limits come from configuration and from admin settings. Behind a proxy, `TRUST_PROXY` MUST be set correctly or every user will look like the proxy's IP; write a test that verifies client IP extraction with `X-Forwarded-For`.

---

## PART 10 — BULLMQ: BACKGROUND PROCESSING

### 10.1 Queue catalogue

Define queues in `backend/src/queues` with payload schemas (Zod, in `shared/`) shared between the API producers and the processors. The processors live in `backend/src/processors` and are started by `backend/src/worker.js`.

| Queue | Purpose | Concurrency (starting point) | Retries |
|---|---|---|---|
| `email` | OTP, notification, digest emails | 5 | 5, exponential backoff |
| `moderation` | Toxicity/spam scoring, auto-hide decisions | 5 | 3 |
| `embeddings` | Generate and store post embeddings | 3 | 3 |
| `tagging` | Tag suggestions | 3 | 2 |
| `notifications` | Fan-out in-app notifications and real-time events | 10 | 3 |
| `karma` | Karma events, trust-level recalculation | 5 | 3 |
| `ranking` | Hot score recomputation | 2 | 1 |
| `images` | Post-upload processing, cleanup of orphans | 3 | 3 |
| `maintenance` | Repeatable jobs: cleanup, reconciliation, blocklist refresh, expired token purge | 1 | 1 |

### 10.2 Job design rules

- Payloads contain **IDs and small parameters**, never large blobs or secrets. Workers load fresh state from the database.
- Jobs are **idempotent**. Running the same job twice must not produce duplicate emails, duplicate notifications, or double karma. Use deterministic `jobId`s (for example `embed:<postId>:<contentHash>`) to deduplicate.
- Set **attempts, backoff, timeouts,** and **`removeOnComplete` / `removeOnFail`** retention (keep failed jobs long enough to debug, but bounded).
- Failed jobs after all retries go to a **dead-letter path**: record in a `FailedJob`-style log or keep in BullMQ's failed set with alerting. Provide an admin-only way (script or endpoint) to inspect and retry them.
- Every processor logs with the job id and a correlation id (the originating request id), and never logs sensitive payload fields.
- Respect **rate limits of third parties** with the queue's limiter option (for example calls per second to the AI provider), and track daily spend against `AI_DAILY_BUDGET_CALLS`. When the budget is exhausted, jobs are **delayed or skipped by policy**, and the fallback behavior (Part 11.6) applies.
- Use **repeatable jobs** for schedules (hot-score refresh, nightly reconciliation, token purge, disposable-domain list refresh, digest emails), defined in code and registered idempotently at worker start.
- Use **flows/parent-child jobs** only where a real dependency exists.

### 10.3 Worker process requirements

- Runs as its own long-lived service, deployed independently of the API.
- Health signal: a lightweight HTTP endpoint or a heartbeat key in Redis, so the hosting platform and monitoring can detect a dead worker.
- Graceful shutdown drains active jobs.
- Structured logging with the same conventions as the API.
- **Connection settings:** BullMQ connections use `maxRetriesPerRequest: null` and `enableReadyCheck` as recommended by the library. Use separate connections for producers and workers where the library requires it.
- Provide an optional **Bull Board** (or equivalent) admin UI, mounted behind admin authentication or run only locally and in a private admin deployment. It MUST NOT be publicly reachable.

---

## PART 11 — AI/ML FEATURES

### 11.1 Guiding principles

1. **AI assists; humans decide.** Models produce scores and suggestions. Anything punitive beyond a temporary hold requires a human moderator.
2. **Provider-agnostic.** All AI calls go through interfaces in the `ml/` package. Providers are swappable by configuration. No provider SDK is imported outside that package.
3. **Never on the request path.** AI calls run in BullMQ workers (Part 10). The one exception is the "similar questions while typing" endpoint, which uses a cached embedding lookup with a tight timeout and a graceful fallback to keyword search.
4. **Budgeted and observable.** Every call is counted against a daily budget, timed, and logged (without content), so cost and latency are visible.
5. **Privacy-aware.** Content sent to a third-party model is public post text only. Never send emails, IPs, tokens or private data. Document what leaves the system in `docs/security/ai-data-flow.md`.
6. **Honest evaluation.** Every AI feature ships with an evaluation script and a written report (Part 11.7). The user's course will value measured results and stated limitations.
7. **Verify provider details yourself.** Model names, dimensions, quotas, pricing and even the availability of specific moderation APIs change over time. Check the provider's current documentation before wiring a provider, and prefer configuration over hardcoded model identifiers. If a provider you planned to use is deprecated or unavailable, choose another behind the same interface and record it in an ADR.

### 11.2 Interfaces (canonical shape)

```js
/**
 * @typedef {Object} ToxicityResult
 * @property {number} toxicity  0..1
 * @property {number} spam      0..1
 * @property {Record<string, number>} labels
 * @property {string} provider
 * @property {string} model
 */

/**
 * @typedef {Object} ToxicityClassifier
 * @property {(text: string, ctx: { lang?: string }) => Promise<ToxicityResult>} classify
 */

/**
 * @typedef {Object} EmbeddingProvider
 * @property {string} model
 * @property {number} dimensions
 * @property {(texts: string[]) => Promise<number[][]>} embed
 */

/**
 * @typedef {Object} TagSuggestion
 * @property {string} tag
 * @property {number} confidence
 */

/**
 * @typedef {Object} TagSuggester
 * @property {(input: { title: string, body: string, candidates: string[] }) => Promise<TagSuggestion[]>} suggest
 */
```

These JSDoc typedefs are the contract. A provider module "implements" one by exporting an object whose shape matches the typedef; there is no interface keyword to enforce this in plain JavaScript, so a Vitest contract test in `ml/src/providers/*.test.js` MUST assert that every provider exposes the required methods and that they return values matching the shape (checked with the corresponding Zod schema, not just the JSDoc comment).

Implementations live in `ml/src/providers/*`. Include at least: one hosted-API implementation per capability, a **local heuristic fallback** (for example regex and keyword scoring for toxicity/spam, keyword overlap for tagging), and a **fake implementation** for tests that returns deterministic output. Tests MUST NOT call real AI APIs.

**The `ml/` package.** It contains four things: `src/interfaces` (the JSDoc contracts), `src/providers` (hosted, local, heuristic and fake implementations), `src/policy` (thresholds and the ALLOW/REVIEW/HIDE decision policy) and `evaluation/` with `datasets/` and `reports/` (scripts run with `pnpm ml:evaluate` that compute precision, recall, F1 and threshold sweeps, and write the results to `ml/reports/`). Where a locally run model is used (for example an ONNX embedding model executed in Node.js through a library such as Transformers.js; verify the current API and licenses first), load it once per worker process, respect the container memory limit, cache model files between deploys, and document model size and cold-start cost in `docs/operations/`. Hosted and local providers MUST be interchangeable behind the same interface.

### 11.3 Feature A: toxicity and spam detection

**Purpose:** protect an anonymous, open-registration platform from abuse without waiting for a human to notice.

**Pipeline:**

1. **Synchronous pre-checks** (cheap): blocked-terms list, link count, repeated-character and repetition heuristics, duplicate content hash, all-caps ratio, known spam patterns.
2. **Asynchronous model scoring** in the `moderation` queue after the content is created.
3. **Decision policy** using configurable thresholds:
   - Score below the review threshold: `ALLOW`, no action.
   - Between review and auto-hide thresholds: `REVIEW`, content stays visible but is added to the moderator queue with the scores.
   - At or above the auto-hide threshold: `HIDE`, status becomes `PENDING_REVIEW`, the author is notified with a neutral explanation and an appeal link, and moderators are alerted.
4. **Trust-aware policy:** thresholds are stricter for level 0 accounts, more lenient for established accounts. Document the table.
5. **Humans resolve:** a moderator confirms (remove) or overrides (restore). Every override is stored as **labeled feedback** that feeds threshold tuning and the evaluation dataset.
6. **Store everything:** persist the `ModerationResult` with provider, model, scores, decision. Never delete these silently.

**Language notes:** the user base likely writes English mixed with Hinglish and other languages. Test with mixed-language samples, report the weaknesses honestly, and make the blocked-terms list configurable.

**Coding context:** text often contains code, stack traces and words like "kill", "execute", "attack" or "dump" in benign technical senses. The pipeline MUST avoid false positives on code. Strip fenced code blocks and inline code before scoring prose, and score code blocks only for spam signals (for example embedded links or obfuscated payloads).

### 11.4 Feature B: duplicate and similar-question detection

**Purpose:** help students find existing answers, and reduce repeated questions.

**Pipeline:**

1. When a post is created or edited, enqueue an `embeddings` job with a **content hash** in the job id so unchanged content is not re-embedded.
2. The worker builds the embedding input from a normalized combination of title, tags and the first part of the body (strip code blocks or cap their length; document the choice), calls the `EmbeddingProvider`, and upserts into `PostEmbedding`.
3. **Similarity search** uses cosine distance with `pgvector`, restricted by `status = VISIBLE`, optionally by community, with `LIMIT` and a similarity threshold from configuration.
4. **While typing:** `POST /posts/suggest-similar` embeds the draft title (debounced client-side, rate limited, cached by content hash) and returns up to 5 similar posts with titles, community, solved state and a similarity indicator. If the embedding call times out or the budget is exhausted, fall back to PostgreSQL full-text search with `ts_rank` and trigram similarity.
5. **After posting:** a background check compares the new post against existing ones. If similarity is very high, show the author a non-blocking "this looks like an existing question" prompt and link the potential duplicate for moderator review. **Never auto-delete a post as a duplicate.**
6. **Related posts** widget on the post page uses the same index.

**Vector column discipline:** the column dimension is fixed by `EMBEDDING_DIMENSIONS`. The `PostEmbedding` row stores the `model` and `dimensions`. If the model changes, the system MUST re-embed everything through a migration job and keep the old index available until the new one is complete. Document the procedure in `docs/operations/re-embedding.md`.

### 11.5 Feature C: auto-tagging

**Purpose:** consistent tagging that improves search and filtering.

**Approach (choose the simplest that meets the evaluation bar, and document alternatives):**

1. **Embedding nearest-neighbor tagging:** embed each canonical tag (name plus a short description) once; embed the post; suggest tags whose similarity exceeds a threshold. Cheap and explainable.
2. **LLM-assisted tagging** with a constrained output: give the model a closed list of allowed tags and require JSON output validated by Zod. Any tag outside the list is discarded. Cap the number of suggestions.
3. **Heuristic prior:** detect language keywords and framework names to boost or seed candidates.

Tags are **suggestions**. The author confirms or edits them in the composer. The system may auto-apply only high-confidence tags when the author left tags empty, and must label them as auto-applied so the author can remove them. Maintain a **curated tag taxonomy** with synonyms (for example "js" maps to "javascript") and moderator-approved creation of new tags to prevent tag sprawl.

### 11.6 Failure modes and fallback behavior

Define and test each of these:

| Situation | Behavior |
|---|---|
| AI provider down or timing out | Retry with backoff; circuit breaker opens; heuristics-only scoring; content from level 0 accounts is held for review rather than trusted blindly |
| Daily budget exhausted | Switch to heuristics; alert admin; suggest endpoints return keyword-search results |
| Malformed model output | Zod validation fails; log; treat as "no result", never as "safe" for moderation |
| Queue unavailable | API accepts content as `PENDING_REVIEW` for low-trust accounts |
| Score disagreement between providers/heuristics | Take the more conservative outcome for routing to human review, never for punitive action |
| Prompt injection inside user content | Content is always passed as **data** in a delimited field. The system prompt states that the content may contain instructions that must be ignored. Outputs are schema-validated. Model output can never trigger an action without passing the decision policy |

### 11.7 Evaluation deliverables (ARTIFACT)

Create `docs/ml/` containing:

- **Dataset description:** how test samples were gathered or written (synthetic, public datasets, manually labeled), the size, the class balance, and the limitations. Do not include real users' data.
- **Evaluation script** (`pnpm ml:eval`) that runs each classifier over the labeled set and reports **precision, recall, F1, false-positive rate** at the configured thresholds, and a threshold sweep (precision/recall curve) for toxicity and similarity.
- **Duplicate detection evaluation:** a hand-built set of paraphrased and unrelated question pairs, with top-k retrieval accuracy.
- **Tagging evaluation:** exact-match and top-k tag accuracy on a labeled sample.
- **Latency and cost table** per feature.
- **Bias and limitations section:** language coverage, code-context false positives, dialect effects, and why human review remains in the loop.
- **Model card style summary** per feature: intended use, inputs, outputs, known failure modes.

### 11.8 Optional AI extensions (only after the core is done)

- **Post summarization** (TL;DR of long threads), clearly labeled as AI-generated.
- **"Explain this code" helper**, rate limited, clearly labeled, never posted as if it were a human answer.
- **Answer quality hints** for moderators.
- **Supportive-resource banner** for distress signals: if implemented, keep it non-intrusive, never auto-report anyone, and have the user's explicit approval of the design first, because it involves sensitive judgments.

---

## PART 12 — REAL-TIME (SOCKET.IO)

### 12.1 Purpose and scope

Real-time delivery covers: new notifications, new comments on the post the user is viewing, vote count changes for the viewed post (throttled), moderation outcomes affecting the user's content, and optional presence counts. It does **not** replace REST; state changes still happen through REST, and real-time is a notification channel.

### 12.2 Architecture

- Socket.IO server attached to the API's HTTP server.
- **Redis adapter** so multiple API instances share events.
- Namespaces or rooms: `user:<profileId>` (private notifications), `post:<postId>` (live comments), `community:<slug>` (optional live feed hints).
- Events are **emitted by services** (or by workers via the adapter/publisher), never invented by the client.

### 12.3 Security requirements

- **Authenticate the handshake** with the access token. Reject unauthenticated connections to private rooms. Guests may connect only to public rooms if you allow it.
- **Authorize room joins** on the server. A client asking to join `user:<someone else>` is refused.
- **Validate every inbound event** with Zod. Limit payload size (`maxHttpBufferSize`), apply **per-socket event rate limits**, and disconnect abusers.
- **Origin checking** in the Socket.IO CORS configuration, using the same allowlist as the REST API.
- **Token expiry:** handle the access token expiring during a long connection by requiring the client to re-authenticate on a fresh token, or by disconnecting when the token expires.
- Never emit private data (emails, hashes, internal ids) in any event.
- Limit connections per user and per IP to prevent socket exhaustion.

### 12.4 Reliability

- Clients reconnect with backoff, and **re-sync missed state through REST** after reconnecting (fetch notifications since the last known id). Real-time is best-effort; REST is authoritative.
- Coalesce or throttle noisy events (vote counts) to avoid flooding clients.
- Graceful shutdown closes sockets with a reconnect hint.
- Provide a REST-polling **fallback** for notifications if WebSockets are blocked.
- Sticky sessions: Socket.IO with the Redis adapter needs either WebSocket-only transport or sticky sessions if HTTP long-polling is enabled. Configure according to the chosen host's capabilities, and document it in `docs/operations/realtime.md`.

### 12.5 Testing

Use integration tests with two or more socket clients to verify: authenticated join, refused unauthorized join, event delivery to the right room only, rate-limit disconnect, and multi-instance delivery through the adapter.

---

## PART 13 — FRONTEND (REACT + VITE SPA)

### 13.1 Principles

1. **Client-rendered SPA** with Vite. No SSR, no Next.js.
2. **Feature-sliced structure** (`features/<name>` with components, hooks, api, types).
3. **Accessible and responsive first.** Target WCAG 2.1 AA. Mobile-first layouts; the primary audience uses phones.
4. **Fast by default.** Route-level code splitting, lazy-loaded heavy components (editor, syntax highlighter), optimized images, minimal bundle.
5. **The frontend is untrusted.** Every rule is enforced on the server; client-side validation is UX only.

### 13.2 Application shell and routing

Routes (lazy-loaded):

- `/` home feed (Hot/New/Top tabs, filters)
- `/c/:slug` community page (rules, moderators, posts, join button)
- `/c` communities directory and search
- `/post/:id` post detail (markdown render, code blocks, accept-answer control, threaded comments, similar posts)
- `/submit` and `/c/:slug/submit` composer
- `/search`
- `/u/:handle` public profile (posts, comments, karma, badges)
- `/me/bookmarks`, `/me/notifications`, `/me/settings` (handle, avatar, sessions, export, delete account)
- `/login` (email + OTP flow, Turnstile)
- `/mod/*` moderator queue and log
- `/admin/*` dashboard, reports, bans, audit log, AI thresholds and metrics (admin only)
- `/about`, `/rules`, `/privacy`, `/terms`
- Not-found and error pages

Route guards depend on server-provided permissions from `GET /me`, and the UI hides unauthorized controls, while the server remains the enforcer.

### 13.3 State and data

- **TanStack Query** for all server state: query keys per resource, sensible `staleTime`, background refetch, **infinite queries** with cursor pagination, **optimistic updates** for votes and bookmarks with rollback on error.
- A thin **API client** with: base URL from env, bearer token injection from in-memory state, a single-flight refresh on 401, request-id capture for error reports, typed responses validated with the shared Zod schemas, and consistent error mapping.
- **Zustand** only for small global UI state (theme, composer draft metadata, current session summary).
- **Draft autosave** in memory and optionally `localStorage` **for draft text only** (no tokens, no personal data), cleared on logout.
- **Socket client** with reconnect, subscription lifecycle tied to route, and cache updates through TanStack Query's cache APIs.

### 13.4 Key screens and UX requirements

**Feed and post cards**

- Skeleton loaders, infinite scroll with a "load more" fallback, stable layout (avoid shift), vote controls with keyboard support, solved badge, tag chips, community and handle links, relative timestamps with accessible absolute time.
- Empty states and error states with retry.

**Composer**

- Markdown editor with live preview, toolbar, fenced code blocks with language selection, image upload with progress and client-side size check, tag input with suggestions (calls suggest-tags), question/discussion toggle.
- **Similar-question panel** appears while typing a title (debounced ~400 ms), showing up to five matches with solved state, with a clear message such as "Similar questions already exist" and a link to open in a new tab. It never blocks posting.
- Character counters, validation messages, disabled submit while pending, and safe handling of rate-limit (429) responses with a friendly countdown.

**Comment thread**

- Nested display with indentation limits, collapse/expand, "load more replies", inline reply composer, edit/delete for own comments, accept-answer button for the post author, vote buttons, moderator actions menu, and deep-link anchors.
- Newly arrived real-time comments appear with a non-jarring "N new comments" pill instead of shifting the page.

**Anonymity UX**

- The first-login experience shows the generated handle and explains what is and is not public ("Your email is never shown to other users"). Provide a **re-roll** button, and a warning about not posting personal identifying information in content.
- A gentle reminder in the composer about not sharing personal data, phone numbers or secrets, plus a client-side **secret detector** that warns if a post looks like it contains an API key or password (for example, common key patterns), because students frequently paste `.env` contents by mistake. The check is advisory, and the server may also run it.

**Moderation and admin UIs**

- Queue with filters, bulk actions, reason templates, keyboard shortcuts, and inline content preview with AI scores and labels shown as information, not verdicts.
- Admin dashboard with counts, charts (Recharts or a lightweight alternative), audit-log viewer, threshold editor with a preview of the effect on the recent sample, and feature-flag toggles.

### 13.5 Rendering user content safely

- Render markdown with a **safe pipeline** (for example `remark`/`rehype` with `rehype-sanitize` and a strict allowlist). **Never** use `dangerouslySetInnerHTML` with unsanitized content; if you must use it, it must be the output of the sanitizer with a test proving script and event-handler payloads are stripped.
- Links in user content get `rel="noopener noreferrer nofollow ugc"` and open in a new tab; consider showing the destination domain and warning on external links.
- Images from user content load only from the allowed image domains (matches the CSP).
- Syntax highlighting is lazy-loaded, supports the common languages for this audience (C, C++, Java, Python, JavaScript/TypeScript, SQL, HTML/CSS, Bash, Go, Rust, and others), and never executes code.

### 13.6 Design system and theming

- Tailwind with design tokens (color, spacing, radius, typography) defined once. A restrained, readable visual identity suitable for a developer community. Light and dark themes with `prefers-color-scheme` default and a manual toggle, persisted locally.
- A small internal component library: Button, Input, Textarea, Select, Tag, Avatar (generated from `avatarSeed`, no external tracking), Modal, Dropdown, Tabs, Toast, Skeleton, Tooltip, Pagination controls, EmptyState, ErrorBoundary.
- **Icons:** one icon set, tree-shaken.
- **Fonts:** self-host or use a privacy-respecting approach; avoid render-blocking font loads; provide fallbacks.

### 13.7 Accessibility checklist (must pass)

Semantic landmarks and headings; every interactive element keyboard reachable with a visible focus ring; correct ARIA for menus, dialogs, tabs, live regions (for toasts and new-comment announcements); color contrast at AA; form labels and error association; reduced-motion respect; screen-reader-friendly vote buttons (announce current state and score); skip-to-content link. Run **axe** in Playwright tests and treat critical violations as build failures.

### 13.8 Frontend performance budget

- Initial JS for the home route under a documented budget (for example under about 200 KB gzipped, adjust after measuring), enforced in CI with a bundle-size check.
- Lighthouse scores tracked for Performance, Accessibility, Best Practices and SEO on key pages, and recorded in `docs/performance/`.
- Images: responsive `srcset`, WebP/AVIF, `loading="lazy"`, explicit dimensions.
- Prefetch on hover for post links; cache API responses via TanStack Query; avoid waterfalls by parallelizing queries.
- Minimize third-party scripts. The only expected third-party scripts are Turnstile and Sentry.

### 13.9 SEO within a SPA

Without SSR, search-engine visibility is limited. Provide the basics: correct `<title>` and meta tags per route (`react-helmet-async` or equivalent), Open Graph tags, a `robots.txt`, and a sitemap generated by the API for public posts. Record "pre-rendering of public post pages" as **future scope** in `docs/KNOWN_LIMITATIONS.md`, and do not adopt Next.js to solve it.

### 13.10 Frontend security

- **No secrets in the bundle.** Only `VITE_`-prefixed public values.
- Access token in memory only. No tokens in `localStorage`, `sessionStorage`, URLs or logs.
- **Content Security Policy** compatible with Vite output (Part 14.2), with **Subresource Integrity** where scripts are loaded from a CDN.
- Sentry configured to **scrub** URLs, headers and breadcrumbs of tokens and personal data, with `sendDefaultPii` off.
- Dependency audit in CI, and lockfile committed.

---

## PART 14 — SECURITY (INDUSTRY-LEVEL REQUIREMENTS)

This part is a checklist you will be held to. Map every item to code or configuration, to a test where testable, and to a row in `docs/security/security-checklist.md` with its status. The reference frameworks are the **OWASP Top 10**, the **OWASP ASVS** (target Level 2 for the parts relevant to this app), and the **OWASP API Security Top 10**.

### 14.1 Transport and platform hardening

- **HTTPS everywhere.** Redirect HTTP to HTTPS at the edge. Send **HSTS** (`max-age` of at least one year, `includeSubDomains`; add `preload` only after the user confirms every subdomain is HTTPS-only and they understand preload is hard to undo).
- **TLS to dependencies:** database (`sslmode=require` or stricter), Redis (`rediss://`), and every third-party API.
- **Helmet** with an explicit configuration, not just defaults. Set `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling unneeded features (camera, microphone, geolocation, and so on), `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` and remove `X-Powered-By`.
- **CORS** with an exact allowlist from configuration, `credentials: true` only for allowed origins, explicit methods and headers, and a short preflight cache. Test that a disallowed origin is rejected.
- **Trust proxy** configured correctly so IP-based controls work (Part 9.5).
- **Run as non-root** in containers, with a read-only root filesystem where possible, minimal base images and no build tools in the final image (Part 19.3).

### 14.2 Content Security Policy and browser protections

Serve the SPA with a strict CSP from the frontend host (via headers config on Vercel/Netlify). Start from:

- `default-src 'self'`
- `script-src 'self'` plus the Turnstile and Sentry origins you actually use (no `'unsafe-inline'`, no `'unsafe-eval'`); use nonces or hashes if an inline script is unavoidable
- `style-src 'self'` (and `'unsafe-inline'` only if Tailwind/Vite output truly requires it; measure first and document the exception)
- `img-src 'self' data: https://res.cloudinary.com` (only your image CDN)
- `connect-src 'self'` plus the API origin and WebSocket origin
- `frame-src` limited to Turnstile
- `frame-ancestors 'none'` (clickjacking defense; also send `X-Frame-Options: DENY`)
- `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`
- `upgrade-insecure-requests`
- A `report-to`/`report-uri` endpoint feeding your logs, run in **report-only mode first**, then enforce after fixing violations.

Also set `Cross-Origin-Embedder-Policy` only if you need it; do not enable headers you have not tested.

### 14.3 Input validation and output sanitization

- **Validate everything** at the boundary with Zod, with strict object schemas (`.strict()`) that **reject unknown keys**, maximum lengths on every string, bounded arrays, and enum allowlists.
- **Normalize** Unicode (NFC) and strip control characters and zero-width characters from handles, titles and tags. Guard against homoglyph impersonation in handles (for example restrict handles to ASCII letters, digits and underscores, and reject look-alikes of reserved names).
- **Markdown to HTML:** render with a pipeline that produces HTML only from an **allowlist** of elements and attributes (headings, paragraphs, lists, emphasis, links, code, blockquotes, tables, images). Strip `script`, `style`, `iframe`, `object`, `embed`, `form`, event-handler attributes and `javascript:`/`data:` URLs (except allowed image data types, if any). Do the sanitization **server-side before storage or on output**, and again on the client. Write a **payload test suite** (a list of known XSS vectors) that runs in CI.
- **SQL injection:** use Prisma's parameterized API. For `$queryRaw`, use the tagged-template form with bound parameters; never use `$queryRawUnsafe` with interpolated user input. Add an ESLint rule or CI grep that fails on `queryRawUnsafe` without an explicit allowlist comment.
- **NoSQL/JSON injection in Redis keys:** never build keys from raw user input; hash or validate first.
- **SSRF:** if you ever fetch a user-supplied URL (link previews, image import), block private and link-local ranges, resolve DNS and re-check the IP, limit redirects, set timeouts and size caps. The default recommendation is to **not implement server-side link previews**.
- **Path traversal and file handling:** never use user-provided names in file paths. Upload handling validates MIME by inspecting bytes, enforces size limits, re-encodes images (which also removes metadata and many embedded payloads), and stores files under generated names.
- **Prototype pollution and mass assignment:** never spread request bodies into database calls. Map explicit fields from validated DTOs.
- **ReDoS:** avoid catastrophic regexes on user input; test regexes against long adversarial strings, and prefer linear-time checks or `re2`-style libraries for user-supplied patterns.

### 14.4 Authentication and session security checklist

- OTP hashed at rest (HMAC), single-use, short TTL, attempt-limited, constant-time comparison (Part 7.3).
- Refresh-token rotation with family revocation and reuse detection (Part 7.4).
- JWT verification pins the algorithm, checks `exp`, `iss` and `aud`, and supports key rotation.
- Cookies: `HttpOnly`, `Secure`, `SameSite`, scoped `Path`, appropriate `Domain`, and the `__Host-`/`__Secure-` prefix where the deployment allows it.
- Generic responses and equalized timing on auth endpoints to prevent enumeration.
- Session listing and revocation UI in settings.
- Step-up re-authentication for sensitive actions (delete account, export data, admin role changes).
- Admin accounts SHOULD require a second factor if the user is willing (TOTP), or at minimum IP-independent rate limiting plus an alerting rule on admin logins.

### 14.5 Authorization checklist

- Deny by default. Every route has an explicit policy.
- **IDOR protection:** every fetch or mutate of an object checks that the actor may act on that object, not only that the object exists. Tests cover cross-user access on every write route.
- Community-scoped moderator checks verify membership and role for that specific community.
- Bulk and admin endpoints re-check permissions server-side even if the UI hid the control.
- Function-level authorization for admin routes is enforced by a dedicated middleware and covered by a route-inventory test that fails when a new route lacks an explicit policy.

### 14.6 Abuse, spam and denial-of-service resistance

- Layered rate limits (Part 9.5), Turnstile on signup/login and on high-risk actions when the trust level is 0.
- **Request cost control:** cap search complexity (query length, number of terms, filter combinations), page sizes, comment depth, upload sizes, and number of tags.
- **Slow-request defenses:** server timeouts (`headersTimeout`, `requestTimeout`, keep-alive tuning), body-size limits, and connection limits.
- **Expensive endpoints** (search, similarity, AI-triggering) get stricter limits and concurrency caps.
- **Amplification control:** notification fan-out caps and batching.
- **Regex/JSON/depth bombs:** limit JSON nesting depth and array lengths.
- Use the hosting/CDN layer's DDoS protection and WAF if available (for example Cloudflare in front of the API), and document the setup.

### 14.7 Secrets, keys and configuration security

- Secrets only in the host's secret store and local git-ignored `.env` files (Part 5).
- Different secrets per environment. Rotation procedure documented and rehearsed once.
- **Encryption at rest:** the email column uses application-level AES-256-GCM. The database provider's disk encryption is assumed but should be verified and mentioned in the docs.
- **Backups** are encrypted and access-controlled. Restore is tested (Part 19.7).
- Principle of least privilege for database users: the runtime user cannot drop tables or alter schema; migrations use a separate credential (`DIRECT_URL` user) only during deploy.

### 14.8 Dependency and supply-chain security

- Lockfile committed, installs use `--frozen-lockfile` in CI.
- `pnpm audit` (or an equivalent scanner) in CI with a policy for failing on high and critical findings, and documented exceptions.
- Dependabot for npm, GitHub Actions and Docker base images.
- **CodeQL** static analysis workflow.
- **Secret scanning** (gitleaks) in pre-commit and CI.
- **Container scanning** (Trivy or Grype) in CI on built images.
- **SBOM** generation (for example CycloneDX) attached to releases.
- Pin GitHub Actions to commit SHAs for third-party actions, and use least-privilege `permissions:` in workflows. Never expose secrets to pull requests from forks.
- Minimize dependencies. For each new package, check maintenance, download volume, license and install scripts.

### 14.9 Logging, audit and privacy

- Structured logs (Pino) with **redaction** of authorization headers, cookies, tokens, emails, OTPs and request bodies on auth routes.
- Log **security events**: failed logins, OTP lockouts, refresh reuse detection, permission denials, admin actions, bans, rate-limit trips at high volume. These feed alerts.
- The `AuditLog` table captures privileged actions and moderation, with a retention policy.
- Log retention is bounded and documented. IP-derived values are hashed and expire.
- Provide a **security.txt** (`/.well-known/security.txt`) and a `SECURITY.md` with a vulnerability disclosure process.

### 14.10 Security testing (must be automated where possible)

- Unit and integration tests for every control above (auth flows, RBAC matrix, IDOR, rate limits, sanitization payloads, CORS, header presence, anonymity response-scan, log-redaction).
- A **route inventory test** that enumerates all routes and asserts each has an auth policy and a rate-limit policy.
- **OWASP ZAP baseline scan** against the deployed staging environment (script in `infra/scripts` and documented results in `docs/security/`).
- A written **penetration-test-style checklist** exercised manually once before launch, with results recorded.
- Fuzz the main parsers (markdown renderer, cursor decoder) with random and hostile inputs.

---

## PART 15 — PERFORMANCE AND SCALABILITY

### 15.1 Targets (state them, then measure against them)

Define service level objectives in `docs/performance/slo.md`. Starting proposals, to be adjusted after measurement:

| Metric | Target |
|---|---|
| API p95 latency, cached read (feed, post) | under 150 ms at the server |
| API p95 latency, uncached read | under 400 ms |
| API p95 latency, write (post, comment, vote) | under 300 ms |
| Availability of API | 99.5% or better for the project's stated horizon |
| Real-time notification delivery p95 | under 2 seconds |
| Error rate (5xx) | under 0.5% |
| Web Largest Contentful Paint on 4G mobile for the home page | under 2.5 s |

### 15.2 Database performance

- **Index audit:** for each hot query in the catalogue (feeds by community, by hot/new/top, post detail with comments, profile pages, search, moderator queue, notification list), record the SQL, the index it uses, and `EXPLAIN (ANALYZE, BUFFERS)` output on the large seed dataset. Save before-and-after numbers when you add an index.
- **Keyset (cursor) pagination** with composite indexes matching the sort order and tiebreaker (for example `(createdAt DESC, id DESC)`).
- Avoid **N+1** queries. Use `include`/`select` deliberately, batch lookups (dataloader-style), and log query counts per request in development to catch regressions.
- Use **`select` with only needed columns** for list endpoints.
- **Connection management:** Prisma connection pool sized to instance count and the provider's limits, using the pooled URL at runtime. Avoid opening a new client per request.
- **Read-heavy paths** may use caching (Part 9) and, if the provider supports it, read replicas as future scope.
- **Vacuum/analyze awareness:** note the effect of high-churn tables (votes, notifications) and plan retention or archival for old notifications.
- Consider **partitioning** or archival for `AuditLog` and `Notification` in future scope, and document when it would become necessary.
- **Full-text search** uses the GIN index with `websearch_to_tsquery`, rank with `ts_rank_cd`, and combine with trigram similarity for typo tolerance on short queries. Set a maximum result window.

### 15.3 Application performance

- Use **compression** (gzip/Brotli) at the edge or in Express, skipping already-compressed responses.
- **Streaming** or pagination for large responses. No unbounded array responses.
- **Async everywhere**, no synchronous CPU-heavy work on the event loop. Markdown rendering of very large inputs, image processing and any hashing with heavy cost run in workers or with size caps. Use `argon2` in its native async form.
- **Keep-alive** and sensible timeouts for outbound HTTP.
- **Memory hygiene:** watch for leaks with a soak test, monitor heap usage, and set a container memory limit with restarts on breach.
- **Cluster or multiple instances:** the API is stateless (state in Postgres and Redis), so it scales horizontally. Never store sessions or caches in process memory that must be shared.

### 15.4 Horizontal scaling model

Describe and diagram in `docs/architecture/scaling.md`:

- **Stateless API replicas** behind the host's load balancer.
- **Socket.IO** scales through the Redis adapter, with sticky sessions or WebSocket-only transport.
- **Workers** scale by adding processes per queue, tuned by concurrency and provider rate limits.
- **Postgres** scales vertically first, then read replicas and connection pooling. Identify the likely first bottlenecks (hot feed queries, vote write contention, comment threads on viral posts) and the planned mitigations.
- **Redis** memory and eviction policy: keep cache and queue data on separate instances or at least monitor them separately, because an eviction policy suitable for cache is dangerous for queues. **BullMQ requires `maxmemory-policy noeviction`** on its Redis; another reason to keep queues on their own Redis instance in production.
- **CDN** for static assets and images.

### 15.5 Load and capacity testing (k6)

Under `infra/k6/`, write scenarios and run them against a **staging** environment, never against production without warning:

1. **Read-heavy browse:** guests hitting feed, post detail and search.
2. **Mixed authenticated traffic:** login (with a test-only auth path that bypasses email in the test environment), browse, vote, comment, post.
3. **Spike test:** sudden 10x traffic to the home feed.
4. **Soak test:** steady load for an extended period to expose leaks.
5. **Abuse test:** verify rate limits engage and the service stays healthy.

Record **before/after comparisons** with and without Redis caching and with and without the key indexes, and include the tables and graphs in `docs/performance/report.md`. Thresholds (k6 `thresholds`) should fail the run if p95 or error rate exceed the SLOs. This report is one of the strongest pieces of evidence the user can present.

---

## PART 16 — OBSERVABILITY AND OPERATIONS

### 16.1 The three pillars

- **Logs:** Pino JSON logs with `requestId`, `profileId` (never user id), route, status, latency, and error codes. Correlation ids propagate from API to queue jobs to workers.
- **Metrics:** expose Prometheus-format metrics (request rate, latency histograms, error rates, DB pool usage, queue depth and job durations, cache hit ratio, AI call counts and latency, WebSocket connections). Use `prom-client`. Protect `/metrics`.
- **Traces:** OpenTelemetry instrumentation if time allows, or Sentry performance tracing at a low sample rate.

### 16.2 Error monitoring

- Sentry for API, worker and web, with release tagging (Git SHA), source maps uploaded for the web build (and not publicly served if avoidable), environment tags, PII scrubbing and sampling.
- Alert rules for error spikes, new error types after deployment, and failed-job growth.

### 16.3 Health, readiness and uptime

- `/health/live` and `/health/ready` as defined in Part 8.2. Readiness checks the database and Redis with short timeouts. The platform uses these for restarts and rollouts.
- An external **uptime monitor** (for example a free-tier monitoring service) probes the API and the web app and alerts the user.
- A public or internal **status note** in the README explaining known maintenance behavior.

### 16.4 Dashboards and alerts

Provide a documented set of dashboards (Grafana or the host's built-ins) and alert definitions: high 5xx rate, high p95 latency, queue backlog growth, worker down, Redis memory pressure, database connections near limit, AI budget nearly exhausted, unusual login failure rates, refresh-token reuse events, and certificate expiry.

### 16.5 Runbooks (ARTIFACT)

Under `docs/operations/runbooks/`, write short runbooks with **symptoms, diagnosis steps, mitigation, and rollback** for: API down, database slow or unreachable, Redis down or full, queue backlog, email delivery failure, AI provider outage, suspected credential leak, abuse wave (spam flood), bad deployment rollback, and data-restore. Each runbook is actionable by a person who did not write the code.

---

## PART 17 — TESTING STRATEGY

### 17.1 The pyramid

| Level | Tools | Scope | Target |
|---|---|---|---|
| Unit | Vitest | Pure logic: ranking formula, cursor codec, permission matrix, sanitizer, handle generator, threshold policy, env schema | Coverage at least 85% on `shared`, `ml` and service layers |
| Integration | Vitest + Supertest + real Postgres and Redis (Docker) | Routes through middleware, services and database; queue producers; auth flows | Every endpoint has success, validation-failure, unauthenticated, forbidden and rate-limited cases |
| Contract | Zod schemas / OpenAPI | Response shapes match the spec; **anonymity response-scan** | Runs on every route |
| Worker | Vitest with test queues | Each processor: idempotency, retries, failure handling, fake AI providers | All processors |
| Real-time | Socket.IO clients in tests | Auth handshake, room authorization, delivery, multi-instance | Key flows |
| End-to-end | Playwright | Signup via OTP (mail catcher), post, comment, vote, search, moderation, admin, accessibility with axe | Critical user journeys, on Chromium plus one more browser |
| Security | Custom tests, ZAP baseline | Part 14.10 | Before release |
| Performance | k6 | Part 15.5 | Before release and after significant changes |

### 17.2 Rules

- Tests run against **real Postgres and Redis** in Docker (`docker-compose.test.yml`), with migrations applied and a clean schema per test file or per run (transaction rollback or truncation). Do not mock the database for integration tests.
- **No real third-party calls** in tests. Fake email, storage, Turnstile and AI providers are injected.
- Tests are **deterministic**: control time (fake timers or an injected clock) and randomness; no sleeps as synchronization.
- **Test data builders/factories** keep tests readable.
- **Flaky tests are bugs.** Fix or quarantine with a tracked issue within a day; never leave them silently retried forever.
- **Mutation testing** (for example Stryker) on the core permission and ranking logic is a stretch goal worth mentioning in the report.
- Every bug fixed gets a **regression test** and a line in the bug log.

### 17.3 Documentation of testing (ARTIFACT)

Under `docs/testing/`: the **test plan** (scope, approach, environments, entry and exit criteria, risks), a **test case catalogue** with IDs mapped to requirement IDs from the SRS (a traceability matrix), coverage reports, E2E run reports with screenshots, the load-test report, the security-test results, and the **bug log** (ID, description, severity, status, fix commit).

---

## PART 18 — CI/CD

### 18.1 Continuous integration (GitHub Actions)

On every pull request and push to the main branch:

1. Checkout, set up Node and pnpm with dependency caching, install with the frozen lockfile.
2. Lint, format check, and the JSDoc type check across all packages, plus the dependency-direction rule from Part 4.1.
3. Unit and integration tests with Postgres (`pgvector` image) and Redis service containers, coverage upload, and a coverage gate.
4. Build the frontend and the backend image. Check the frontend bundle-size budget.
5. Prisma checks: `prisma validate`, migrations apply cleanly to an empty database, and no schema drift.
6. OpenAPI export and drift check.
7. Security jobs: `pnpm audit`, gitleaks, CodeQL, dependency review on pull requests, container image build and Trivy scan.
8. Playwright E2E against the composed stack (on main and on pull requests that touch relevant paths).
9. Required status checks block merging. Protect the main branch: pull request required, reviews (or self-review documented), no force pushes, signed commits if the user can support them.

### 18.2 Continuous delivery

- **Environments:** `development` (local), `staging` (deployed from main automatically), `production` (deployed on a tagged release with a manual approval gate).
- **Build once, deploy the same artifact:** build container images in CI, tag with the Git SHA and version, push to a registry (GitHub Container Registry or the host's registry), and deploy those exact images.
- **Database migrations** run as an explicit, separate deploy step before the new application version takes traffic, using `prisma migrate deploy` with the direct connection. Follow **expand and contract**: additive migrations first, code that works with both schemas, destructive changes only in a later release. Never run `prisma migrate dev` or `db push` against staging or production.
- **Smoke tests** after each deploy: hit `/health/ready`, run a minimal authenticated flow against staging, and verify the version endpoint reports the new SHA.
- **Rollback:** documented and rehearsed. Redeploy the previous image; migrations are backward compatible so rollback does not require a schema revert.
- **Release notes** generated from Conventional Commits (for example `release-please` or `semantic-release`), and a `CHANGELOG.md`.
- **Secrets in CI** come from the repository's encrypted secrets and environment-scoped secrets, with production secrets only available to the production environment job.
- **Concurrency control** so two deploys do not run simultaneously, and **manual dispatch** for hotfixes.

---

## PART 19 — DEPLOYMENT

### 19.1 Deployment topology

| Component | Host (recommended) | Notes |
|---|---|---|
| Web SPA | Vercel or Netlify | Static build, security headers, SPA fallback rewrite |
| API + Socket.IO | Render, Railway or Fly.io | Long-running container, health checks, autoscaling if available |
| Worker | Same host, separate service | Long-running container from the same backend image (start command `node src/worker.js`) |
| PostgreSQL | Neon (with `pgvector`) | Pooled URL at runtime, direct URL for migrations, backups enabled |
| Redis (cache/limits) | Upstash (REST) or a standard Redis | |
| Redis (queues/adapter) | Standard fixed-price Redis with `noeviction` | See Part 3.5 and 15.4 |
| Images | Cloudinary | |
| Email | Resend with verified domain | SPF, DKIM, DMARC configured |
| DNS/CDN/WAF | Cloudflare (optional but recommended) | Also hosts Turnstile |
| Monitoring | Sentry + uptime monitor | |

**STOP-AND-ASK before deploying:** confirm the user's accounts, domain, budget and chosen providers. Do not create paid resources, change DNS or enter payment details on the user's behalf. Guide them through each step and verify each result.

### 19.2 Domain, DNS and email deliverability

- Use `app.<domain>` for the web and `api.<domain>` for the API so cookies are first-party (Part 3.3).
- Configure **SPF, DKIM and DMARC** for the sending domain so OTP emails reach the inbox. Verify with the email provider's checker and send test messages to more than one mailbox provider.
- Enable **HTTPS certificates** (managed by the host), and confirm HSTS.
- Add `security.txt`, `robots.txt` and a sitemap.

### 19.3 Containers (canonical requirements)

Provide multi-stage Dockerfiles in `infra/docker/`: one for the **backend image** (it runs as the API with `node src/server.js` and as the worker with `node src/worker.js`; the start command is set by the host) and an optional one for previewing the built frontend locally (production frontend is static on Vercel or Netlify):

- Use a pinned, minimal, maintained base image (Node LTS on a slim variant), pinned by digest where practical.
- Stage 1 installs dependencies (including generating the Prisma client); the final stage contains only production dependencies and the source. There is no compile step for the backend because it is plain JavaScript.
- Run as a **non-root user**, set `NODE_ENV=production`, use `tini` or Node's own signal handling correctly so `SIGTERM` reaches the process.
- Include a `HEALTHCHECK`, a `.dockerignore` that excludes `.env`, `.git`, tests and docs, and set sensible memory flags for the container limit.
- Do not bake secrets or `.env` files into images. Do not run `prisma migrate` on container start in production; run it as a separate release command.
- `docker-compose.yml` for local development runs Postgres with `pgvector`, Redis, and a mail catcher (for example Mailpit), with named volumes and health checks. `docker-compose.test.yml` provides ephemeral instances for tests and CI.

### 19.4 Production configuration checklist

- `NODE_ENV=production`, `LOG_LEVEL=info`, `TRUST_PROXY` set for the platform's hop count.
- `COOKIE_SECURE=true`, correct `COOKIE_DOMAIN`, and CORS origins set to the production web origin only.
- Turnstile enabled. AI budgets set. Rate limits set to production values.
- Database pool sizes fit the provider's connection limits across all instances.
- Redis `noeviction` for the queue instance, with memory alerts.
- Sentry release and environment configured. Source maps uploaded privately.
- Admin bootstrap performed once, then `ADMIN_BOOTSTRAP_EMAIL` removed or disabled.
- Swagger UI and Bull Board are **not** publicly exposed.
- Debug endpoints, verbose error output and development-only flags are off.

### 19.5 Release procedure (documented step by step)

1. Merge to main, CI green, staging deploy automatic.
2. Run smoke, E2E and a ZAP baseline against staging.
3. Tag a release. The production job waits for manual approval.
4. Run migrations (expand phase) against production.
5. Deploy the backend (API and worker), then the frontend. Watch health, error rate and latency for a defined observation window.
6. If any SLO breaks, roll back per the runbook.
7. Publish release notes.

### 19.6 Zero-downtime and safe rollouts

- Rolling restarts with readiness gating and graceful shutdown (Part 8.5).
- Backward-compatible API changes while old web bundles may still be cached in users' browsers. Include a `X-App-Version` check so the SPA prompts for a refresh when it is outdated.
- Feature flags for risky features (AI moderation actions, Google login, new ranking), so they can be turned off without a redeploy.

### 19.7 Backup, recovery and data lifecycle

- Enable and verify the database provider's **automated backups and point-in-time recovery**. Record retention limits of the chosen plan honestly.
- Run a **restore drill** once into a scratch database, verify row counts and application boot against it, and document the time it took (recovery time objective) and the maximum data loss window (recovery point objective).
- Redis is treated as **rebuildable** for cache, and as **operationally important** for queues. Document what happens to in-flight jobs on Redis loss and how they are recovered (re-enqueue from database state by a reconciliation job).
- Storage: image provider retention, orphan cleanup job, and account-deletion propagation.
- Log and audit retention windows enforced by scheduled jobs.

### 19.8 Cost and quota awareness

List, in `docs/operations/costs.md`, every external service with its current free-tier or plan limits **checked from the provider's pricing page at the time of writing** (limits change), the metric that will hit them first, and the alert or cap you configured (for example the AI daily budget, email sending limits, database compute-hours, Redis command quotas). Tell the user plainly which components are on free tiers and what that means for reliability, cold starts and sleep behavior. Free-tier hosting that sleeps when idle conflicts with WebSockets and workers; call this out explicitly and propose the cheapest configuration that avoids it.

---

## PART 20 — SOFTWARE ENGINEERING DELIVERABLES

Because this is a Software Engineering course project, the **documents** are graded evidence. Generate them as living files in `docs/`, keep them consistent with the code, and update them when the design changes. Use Mermaid (or PlantUML) so diagrams are text in Git and render on GitHub.

1. **Problem statement and scope** (`docs/00-problem-statement.md`): the problem, target users, goals, non-goals, assumptions, constraints, and success metrics.
2. **Software Requirements Specification** (`docs/SRS.md`), structured after IEEE 830 / ISO 29148: introduction, overall description, stakeholders and user classes, operating environment, **numbered functional requirements** (FR-001…), **numbered non-functional requirements** (NFR-001…) for security, performance, availability, usability, accessibility, privacy, maintainability, portability, and scalability, external interface requirements, data requirements, and a constraints and assumptions section. Every requirement is testable and has an ID used in the traceability matrix.
3. **Process model:** state the chosen approach (Agile/Scrum with time-boxed sprints is recommended), explain why, and show the sprint plan, the definition of ready and done, backlog, and burn-down or velocity notes. Use GitHub Projects issues linked to commits and pull requests.
4. **Feasibility and risk analysis** (`docs/project-management/risk-register.md`): technical, security, schedule, cost and dependency risks, each with likelihood, impact, mitigation and owner. Include the risks unique to this project: abuse on an anonymous platform, third-party API deprecation, free-tier limits, embedding-model changes, and scope size.
5. **UML and design diagrams** (`docs/uml/`): use case diagram (actors: Guest, User, Moderator, Admin, and system actors like the AI provider and email provider), **class diagram** of the domain, **sequence diagrams** (OTP login, create post with async moderation, vote, refresh-token rotation with reuse detection, similar-question suggestion, report handling), **activity diagram** (content moderation lifecycle), **state diagram** (post status transitions), **ER diagram** (from the Prisma schema), **component/deployment diagram**, and a **data-flow diagram** with trust boundaries.
6. **Architecture documentation** (`docs/architecture/`): C4-style context, container and component views; the layered API architecture; the caching, queue and real-time designs; the scaling model; and the anonymity architecture.
7. **Architecture Decision Records** (`docs/decisions/NNNN-title.md`): context, decision, alternatives, consequences. Include at least: repository layout (frontend, backend, ml, shared), plain JavaScript with JSDoc instead of TypeScript, Vitest everywhere, UUID v7, raw markdown only, no Next.js, PostgreSQL over MongoDB, Prisma plus raw SQL, comment threading approach, token strategy, cache invalidation approach, counter consistency model, BullMQ Redis separation, AI provider abstraction, embedding dimension choice and hot-ranking formula.
8. **API documentation:** OpenAPI spec and rendered docs, with examples and error codes.
9. **Testing documentation:** Part 17.3.
10. **Security documentation:** threat model, checklist, data-flow with trust boundaries, retention policy, and AI data-flow.
11. **Operations documentation:** deployment guide, runbooks, backup/restore drill report, secret-rotation procedure, cost sheet.
12. **Maintenance plan** (`docs/operations/maintenance-plan.md`): dependency update cadence, security patch SLAs, backup verification schedule, model and embedding upgrade procedure, capacity review triggers, deprecation policy for the API.
13. **Project management evidence:** Git history with Conventional Commits, branch and pull request records, task board export or screenshots, a timeline or Gantt chart, and weekly progress notes.
14. **User documentation:** a user guide (how to sign up, choose a handle, ask a good question, mark solved, report content), community guidelines, and moderator handbook.
15. **Final presentation support:** a demo script and seed dataset that reliably showcase the main journeys, plus a one-page architecture summary, ready for a viva. Include a **"likely viva questions"** document listing questions an examiner might ask about each major design decision, with concise, honest answers.
16. **`README.md`:** what Coddite is, screenshots, architecture overview, quick start (one command with Docker), environment setup pointer (without secrets), scripts, testing, deployment, contributing and license.

Generate each document **when its phase completes**, not all at the end. A traceability matrix (`docs/testing/traceability.md`) links each SRS requirement to the design element, the code module and the test IDs that cover it. Unmapped requirements are flagged.

---

## PART 21 — COMMUNITY GOVERNANCE AND CONTENT POLICY

A moderated anonymous platform needs written rules, not only code. Produce, as starting drafts for the user to review:

- **Community guidelines:** respectful conduct, no harassment or hate, no doxxing or sharing personal data, no cheating on graded assessments or sharing of leaked exam material, academic-integrity guidance for homework help (explain concepts, do not hand over full graded solutions), no malware or exploit distribution, no spam or self-promotion floods, no sexual content involving minors and no adult content in general (say what the platform allows), and how AI-generated content must be labeled.
- **Moderation policy:** what moderators may do, escalation to admins, the appeal process, expected response times, and how AI scores are used (as signals only).
- **Privacy policy and terms of service:** honest, plain-language drafts describing the data collected (email stored encrypted, hashed IP signals, content), retention, deletion and export, third-party processors (email, storage, AI, monitoring), cookies, and age expectations. State clearly in the drafts and to the user that these are **starting points and not legal advice**, and should be reviewed before serving the public.
- **Abuse and safety escalation:** a documented procedure for content involving self-harm, threats or illegal material: remove or hide promptly, preserve the record, and point the user to the relevant reporting channels and local authorities as appropriate. Include supportive resource text for the UI written with care, and review it with the user.
- **Transparency notes:** what the AI does and does not do on the platform, in user-facing language.

Tie these to product behavior: report reasons in the UI map to the policy categories, moderation reasons use templates derived from the guidelines, and the guidelines are linked from the composer and the report dialog.

---

## PART 22 — PHASED EXECUTION PLAN WITH ACCEPTANCE CRITERIA

Work through these phases in order. Each phase ends with a **demo-ready system**, passing CI, updated documents and a short written summary. **Do not start a phase until the previous phase's exit criteria are met and the user has approved, unless told to proceed autonomously.**

### Phase 0 — Foundations

- Repository skeleton (`frontend/`, `backend/`, `ml/`, `shared/`, `docs/`, `infra/`), tooling, Docker Compose, CI skeleton, `.env.example` files, env loaders, `env:check`, secret-generation script.
- **STOP-AND-ASK: environment collection (Part 5.3).**
- Problem statement and first draft of the SRS. ADRs for the locked decisions.
- **Exit criteria:** `pnpm install && pnpm dev` starts the empty frontend and backend; `pnpm env:check` passes; CI is green; no secrets in Git.

### Phase 1 — Core platform

- Prisma schema and migrations (including hand-written SQL), seed data.
- OTP auth, sessions with rotation and reuse detection, anonymous profiles and handles, RBAC.
- Communities, posts, threaded comments, votes, tags, bookmarks, profiles, basic search.
- Frontend: shell, auth flow, feed, community page, post page, composer, comment thread, profile.
- Tests for all of the above, anonymity response-scan, Postman/OpenAPI docs.
- **Exit criteria:** a new user can sign up with OTP in the mail catcher, get a handle, post, comment, vote and search; the response-scan test passes; auth and RBAC test suites pass.

### Phase 2 — Speed, safety and moderation

- Redis caching, counters, rate limiting, idempotency; BullMQ with email, karma, ranking and maintenance queues.
- Sanitization, security headers, CSP, CAPTCHA, trust levels, reports, moderator queue, admin dashboard, audit log, bans.
- Cursor pagination everywhere, full-text search tuning, index audit with `EXPLAIN` evidence.
- Notifications (in-app) and email.
- **Exit criteria:** rate limits verified by tests; XSS payload suite passes; feed p95 meets the SLO on the large seed set; moderator can action a report end to end.

### Phase 3 — AI/ML

- `ml/` package: interfaces, fake and heuristic providers, then the chosen hosted or local providers, and the evaluation scripts and datasets.
- Toxicity/spam pipeline with decision policy and human review; similar-question detection with `pgvector`; auto-tagging.
- Budget controls, circuit breakers, fallbacks, evaluation scripts and reports.
- **Exit criteria:** each feature works with providers enabled and with providers disabled (fallback); evaluation report exists with honest metrics; no AI call blocks a request.

### Phase 4 — Real-time and polish

- Socket.IO with Redis adapter, live notifications and comments, reconnect and re-sync.
- Image upload pipeline, dark mode, accessibility pass, performance budget pass, empty and error states, SEO basics.
- **Exit criteria:** multi-instance real-time test passes; axe critical violations are zero; Lighthouse and bundle budgets recorded.

### Phase 5 — Hardening and quality evidence

- Full E2E suite, k6 load and soak tests with before/after reports, ZAP scan, dependency and container scanning, threat-model review, secret-rotation drill, restore drill.
- Final documentation set (Part 20), traceability matrix, viva question document.
- **Exit criteria:** all SLOs met or explicitly documented; security checklist complete; every SRS requirement traced to a test or marked with a justification.

### Phase 6 — Deployment and launch

- **STOP-AND-ASK:** accounts, domain, budget, providers (Part 19.1).
- Provision staging, deploy, smoke-test, ZAP scan on staging, fix findings.
- Production deploy with approval gate, DNS, email authentication records, monitoring, alerts, uptime checks, admin bootstrap.
- Post-launch observation period and a written launch report.
- **Exit criteria:** production is reachable over HTTPS on the user's domain; a real signup works end to end; alerts fire in a test; rollback rehearsed; admin bootstrap variable removed.

---

## PART 23 — DEFINITION OF DONE AND CLOSING INSTRUCTIONS

### 23.1 Project-level definition of done

The project is done only when **all** of the following are true. Verify each and report the evidence.

**Product**

- Every feature in Part 1.3 works in production, or is listed in `docs/KNOWN_LIMITATIONS.md` with a reason.
- Fully usable on mobile and desktop, in light and dark themes.

**Security and privacy**

- The Part 14 checklist is complete, with test evidence.
- The anonymity guarantees in Part 7.7 each have a passing automated test.
- No secrets in the repository or its history (verified by a full-history scan).

**Reliability and scale**

- Health checks, graceful shutdown, timeouts, retries, circuit breakers and fallbacks are implemented and tested.
- Load-test report shows behavior against the SLOs, including cached versus uncached comparisons.
- Backup restore has been drilled.

**Quality**

- CI is green with required checks. Coverage gates pass. Lint, types and format are clean.
- No known critical or high vulnerabilities in dependencies, or documented mitigations.

**Documentation**

- All Part 20 documents exist, are consistent with the code, and are current.
- The README lets a stranger run the project locally with one command and understand the architecture in ten minutes.

**Process**

- Git history shows meaningful, Conventional Commits and pull requests. The task board reflects the work done.

### 23.2 Things you must never do

1. Never commit or print secrets. Never disable a security control in production to make something work.
2. Never claim something works without running it.
3. Never introduce Next.js, MongoDB, or another runtime than Node.js for the backend.
4. Never expose the email, IP, or internal user ID through any public interface, log or error message.
5. Never let an AI decision permanently punish a user without human review.
6. Never run destructive database operations against staging or production without explicit user approval.
7. Never store tokens in `localStorage` or `sessionStorage`.
8. Never skip the STOP-AND-ASK points.
9. Never leave a phase with failing tests or undocumented shortcuts.

### 23.3 How to report progress

At the end of each phase, send the user a short report containing: what was built, what was verified (with the commands run and their outcomes), what was deferred and why, open risks, decisions taken (with ADR links), documents produced, and the exact question you need answered to proceed. Keep it factual.

### 23.4 Your first message to the user

After reading this document, do the following, in this order:

1. Confirm in three or four sentences that you understood the project, the locked constraints (plain JavaScript on Node.js with no TypeScript, no Next.js, the frontend/backend/ml/shared layout, anonymous profiles, open registration) and the phase plan. Do not re-ask anything listed in Part 1.5.
2. List any **ambiguities or conflicts** you found in this document, and your proposed resolutions.
3. Ask the two questions that most change the design if unknown: **(a)** does the user own a domain, and **(b)** which hosting providers and budget do they intend to use.
4. State that you will start **Phase 0**, and that once the skeleton and `.env.example` files exist you will pause and **ask the user for the environment-file contents, group by group, exactly as described in Part 5.3**, before writing code that depends on any external service.

Then begin.

---

*End of master prompt.*
