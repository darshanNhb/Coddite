# ADR-0006: Vitest for Testing, No Jest

## Status

Accepted

## Context

The project needs a test runner for unit, integration, and component tests across all four packages. The project owner has explicitly chosen Vitest and prohibited Jest.

## Decision

Use **Vitest** in every package (`frontend`, `backend`, `ml`, `shared`), complemented by:

- **Supertest** for API integration tests against the Express app (`backend/src/app.js`)
- **Playwright** for end-to-end tests
- **k6** for load tests

## Alternatives Considered

1. **Jest** — Explicitly prohibited by the project owner.
2. **Node.js built-in test runner** — Less mature, fewer features for this scale.
3. **Mocha + Chai** — More boilerplate, less modern DX.

## Consequences

- One test runner across the entire monorepo, consistent configuration.
- Vitest's native ESM support aligns with the project's ES modules setup.
- Fast execution with Vitest's watch mode and parallel test runs.
