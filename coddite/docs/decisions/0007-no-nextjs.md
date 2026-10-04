# ADR-0007: No Next.js

## Status

Accepted

## Context

The frontend is a client-rendered single-page application. Server-side rendering is explicitly out of scope and Next.js is explicitly forbidden by the project owner (Part 3.1).

## Decision

The frontend is built with **React + Vite** as a client-rendered SPA. No SSR, no Next.js, no server components.

The SPA is deployed as static files on Vercel. The API is a separate Express service on Render.

## Alternatives Considered

1. **Next.js** — Explicitly forbidden. Would add SSR complexity and blur the frontend/backend boundary.
2. **Remix** — Similar SSR concerns, not requested.
3. **Astro** — Not a full SPA framework for this use case.

## Consequences

- SEO is limited for dynamic content (mitigated by meta tags, sitemap, and potential pre-rendering as future scope).
- Frontend and backend are cleanly separated deployments.
- Simpler build pipeline — Vite produces static assets.
- Cookie handling across origins requires careful configuration (see ADR-0003).
