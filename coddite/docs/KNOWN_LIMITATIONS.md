# Coddite — Known Limitations

This document tracks features and behaviors that are incomplete, deferred, or carry known caveats.

## Deployment

- **No custom domain yet.** The frontend and API are on separate hosting provider subdomains (e.g. `coddite.vercel.app` and `coddite-api.onrender.com`). Cookie-based refresh uses `SameSite=None; Secure` as a cross-origin fallback. See [ADR-0003](decisions/0003-cross-origin-cookie-fallback.md) for details and the migration path when a custom domain is added.
- **Render free tier spin-down.** The API/worker process on Render's free tier spins down after inactivity and takes 30–60 seconds to wake up. This affects WebSocket connections and background job processing. Upgrade to a paid tier for always-on availability.
- **Single-process worker.** `RUN_WORKER_IN_API=true` runs BullMQ processors inside the API process to avoid a second paid service. This means a long-running job can affect API latency under load. The code supports a separate worker service when the budget allows.

## Features

- **Pre-rendering of public post pages** for SEO is deferred. Without SSR, search engines may not fully index content. Record as future scope — do not adopt Next.js.
- **Direct messaging** between users is out of scope for v1. Requires heavy block/report tooling for anonymous accounts.
- **College-email verification** is documented as future scope.

## AI/ML

- Features ship behind `AI_ENABLED=false` by default. Enable when providers are configured.
