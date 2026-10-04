# ADR-0008: Password Login Disabled by Default

## Status

Superseded by ADR-0010

## Context

The primary authentication method is email + OTP (passwordless). Password login is an optional feature behind a flag. The project owner decided to ship with it disabled by default.

## Decision

Password login is implemented behind `PASSWORD_LOGIN_ENABLED=false`. When disabled:

- The password login and set-password endpoints return 404.
- The frontend hides password-related UI elements.
- No `passwordHash` is ever set on User records.

When enabled (`PASSWORD_LOGIN_ENABLED=true`):

- argon2id hashing with parameters tuned to the hosting hardware.
- Minimum 10-character passwords, checked against a breached-password list if feasible.
- The password routes become available.

## Consequences

- OTP-only is the default experience, which is simpler and avoids password-related security issues.
- The password module code exists and is tested, ready to enable when needed.
- The feature flag is checked in both the route layer and the service layer.
