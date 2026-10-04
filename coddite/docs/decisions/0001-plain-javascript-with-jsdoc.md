# ADR-0001: Plain JavaScript with JSDoc instead of TypeScript

## Status

Accepted

## Context

The project needs type safety for a production-grade platform, but the project owner has explicitly decided against TypeScript source files. The team needs a way to get type-checking benefits without introducing `.ts` or `.tsx` files.

## Decision

Use plain JavaScript (ES modules, `.js` files, `.jsx` for React components) with:

- **JSDoc** (`@typedef`, `@param`, `@returns`) on every exported function
- **Zod schemas** as the runtime source of truth for data shapes
- **`jsconfig.json`** per package with `checkJs: true` and `strict: true`
- **TypeScript compiler** installed as a dev-only checker (`tsc --noEmit -p jsconfig.json`), never to compile source or produce build output

A shared `jsconfig.base.json` at the root provides the common config. Each package extends it with its own `jsconfig.json`.

## Alternatives Considered

1. **Full TypeScript** — Rejected by project owner. Would require `.ts`/`.tsx` files.
2. **No type checking** — Unacceptable for a production system. Bugs would reach runtime.
3. **Flow** — Less tooling support, smaller ecosystem. No advantage over JSDoc + tsc.

## Consequences

- Slightly more verbose than TypeScript annotations, but provides equivalent IDE support.
- Type errors caught at dev time via `pnpm typecheck` without a compile step.
- `.mjs` and `.cjs` files are avoided; `"type": "module"` in every `package.json` makes `.js` files ES modules. Exceptions for third-party config files are documented individually.
