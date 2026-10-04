# ADR-0010: Password Authentication as Primary Login Method

## Status

Accepted (supersedes ADR-0008)

## Context

ADR-0008 shipped OTP-only auth with password behind a disabled flag. Real-world usage shows users expect a conventional email+password signup/login. OTP alone creates friction for returning users (checking email every session).

## Decision

Password login becomes the primary authentication method. OTP is retained for: (a) email verification during signup, (b) password recovery. The `PASSWORD_LOGIN_ENABLED` flag is removed. 

Signup requires email + handle + password, with OTP email verification before account creation. No partial/unverified User rows are persisted — pending signups live in Redis with a 15-minute TTL.

## Consequences

- Simpler returning-user experience.
- Password storage via argon2id adds a security surface (mitigated by enforcing minimum length).
- OTP infrastructure is preserved and reused. 
- All existing OTP-only accounts (created during development/testing) will need a password set — handled via the "forgot password" flow on first post-migration login.
