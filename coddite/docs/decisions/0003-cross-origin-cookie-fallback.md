# ADR-0003: Cross-Origin Cookie Fallback (No Custom Domain)

## Status

Accepted

## Context

The frontend (Vercel) and API (Render) are on different registrable domains (`coddite.vercel.app` and `coddite-api.onrender.com`). The refresh token is stored in an httpOnly cookie. Without a shared parent domain, `SameSite=Lax` cookies will not be sent cross-origin, breaking token refresh.

Part 3.3 and Part 7.9 of the master prompt define the fallback strategy.

## Decision

Use the following approach, in order of preference:

1. **Preferred: Vercel rewrite.** Configure a Vercel rewrite rule (in `vercel.json`) that proxies `/api/*` requests to the Render API. This makes the cookie first-party (same origin). Added latency is acceptable for the auth path.

2. **Fallback: `SameSite=None; Secure`.** If the rewrite approach proves unreliable or introduces unacceptable latency, use `SameSite=None; Secure` cookies. This works in all modern browsers but may be partitioned or blocked in some privacy-focused configurations.

3. **Never: `localStorage` for refresh tokens.** This is explicitly forbidden (Part 23.2).

### Migration path to a custom domain

When the project owner acquires a domain (possibly through the GitHub Student Developer Pack):

1. Set up `app.<domain>` pointing to Vercel and `api.<domain>` pointing to Render.
2. Set `COOKIE_DOMAIN=<domain>` (the parent domain).
3. Switch to `SameSite=Lax`, which is more secure.
4. Remove the Vercel rewrite if no longer needed.
5. Configure SPF, DKIM, and DMARC for email deliverability.

This procedure is documented in `docs/operations/custom-domain-migration.md`.

## Consequences

- Cookie configuration is fully environment-driven (`COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAMESITE`).
- The Vercel rewrite adds a network hop but keeps cookies first-party.
- Browser compatibility is documented in `docs/KNOWN_LIMITATIONS.md`.
- CORS must allow the exact frontend origin with `credentials: true`.
