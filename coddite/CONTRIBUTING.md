# Contributing to Coddite

## Development Setup

1. Install Node.js 24+ and pnpm 9+
2. Clone and run `pnpm install`
3. Start Docker services: `docker compose up -d`
4. Set up environment: `cp backend/.env.example backend/.env` (see README)
5. Run `pnpm dev`

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `test:` — Adding or fixing tests
- `chore:` — Maintenance (deps, config)
- `refactor:` — Code change that neither fixes nor adds
- `perf:` — Performance improvement
- `ci:` — CI/CD changes
- `build:` — Build system changes

## Before Submitting

1. `pnpm lint` — no errors
2. `pnpm typecheck` — no type errors
3. `pnpm test` — all tests pass
4. `pnpm format:check` — code is formatted

## Branch Naming

- `feat/<feature-name>` for features
- `fix/<bug-description>` for bug fixes
- `docs/<topic>` for documentation

## Code Style

- Plain JavaScript (ES modules, `.js` / `.jsx`)
- JSDoc on all exported functions
- Zod for all data validation
- No TypeScript source files
