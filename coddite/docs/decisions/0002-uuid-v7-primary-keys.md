# ADR-0002: UUID v7 for Primary Keys

## Status

Accepted

## Context

Primary keys must be non-enumerable (no sequential integers that reveal entity counts), index-friendly, and globally unique. The project owner decided on UUID v7 (RFC 9562).

## Decision

Use **UUID v7** for all primary keys across all entities. UUID v7 embeds a Unix timestamp in the most significant bits, making it:

- **Time-ordered** — natural chronological sorting, B-tree friendly
- **Non-enumerable** — random suffix prevents guessing
- **Index-efficient** — sequential insert pattern reduces B-tree page splits compared to UUID v4

**Generation:** Application code generates UUID v7 using `import { v7 as uuidv7 } from 'uuid'` (the standard `uuid` npm package). IDs are generated in repository layer code before passing to Prisma `create` calls.

**Why not Prisma's `uuid(7)` default:** Current Prisma (as of project start, September 2026) does not yet support a built-in `uuid(7)` default. If Prisma adds native support, we can migrate to it without schema changes since the format is identical.

**Why not `crypto.randomUUIDv7()`:** Available in Node.js 24.16.0+, but using the `uuid` package provides a consistent API and avoids pinning to a specific Node.js patch version.

## Alternatives Considered

1. **UUID v4** — Random, poor B-tree locality, more page splits on large tables.
2. **ULID** — Similar benefits to UUID v7 but non-standard, different encoding.
3. **Database serial/bigserial** — Sequential, enumerable, reveals entity counts.
4. **nanoid** — Not a UUID, variable length, harder to work with in Postgres UUID columns.

## Consequences

- All `id` columns are `@db.Uuid` in Prisma.
- A `generateId()` utility in `backend/src/utils/` wraps the UUID v7 call.
- Prisma schema uses `@id @db.Uuid` without `@default(uuid())` — the application supplies the ID.
