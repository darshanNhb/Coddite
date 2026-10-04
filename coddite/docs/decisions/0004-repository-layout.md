# ADR-0004: Repository Layout

## Status

Accepted

## Context

The project owner explicitly wants a `frontend/`, `backend/`, `ml/`, `shared/` layout that anyone can understand at a glance, rather than an `apps/packages` monorepo pattern.

## Decision

Use the following top-level directory structure managed by pnpm workspaces:

- `frontend/` — React + Vite SPA (JavaScript, JSX)
- `backend/` — Node.js + Express API + Socket.IO + BullMQ (JavaScript, ES modules)
- `ml/` — AI/ML library code (JavaScript, pure functions, no env/Express/Prisma)
- `shared/` — Zod schemas, DTOs, constants, error codes, permission matrix
- `docs/` — All documentation
- `infra/` — Docker, k6 scripts, helper scripts

### Dependency direction (enforced by ESLint)

- `frontend` → `shared` only
- `backend` → `shared`, `ml`
- `ml` → nothing (pure library)
- `shared` → nothing

Workspace package names: `@coddite/frontend`, `@coddite/backend`, `@coddite/ml`, `@coddite/shared`.

## Alternatives Considered

1. **`apps/packages` monorepo** (Turborepo-style) — More complex, less readable at a glance.
2. **Separate repositories** — Harder to share code, more CI complexity.
3. **Single flat `src/`** — Does not separate concerns clearly enough for this scope.

## Consequences

- Clear separation of concerns visible in the directory tree.
- Dependency direction is enforced at the linter level, preventing accidental coupling.
- `ml/` is a pure library that can be extracted or replaced independently.
