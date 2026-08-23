---
title: Email Integration
type: integration
scope: Details the email delivery mechanism using Nodemailer and Gmail SMTP.
related_files:
  - backend_of_login_signup/src/services/email.service.ts
confidence: high
last_verified: 2026-08-23
---

## Overview

Coddite uses Nodemailer configured with Gmail SMTP to send transactional emails, specifically One-Time Passwords (OTPs).

## Transporter Setup

The Nodemailer transporter is configured in `backend_of_login_signup/src/services/email.service.ts`:
- **Host**: `smtp.gmail.com`
- **Port**: 465 (Secure)
- **Auth User**: `GMAIL_USER` from environment variables.
- **Auth Pass**: `GMAIL_APP_PASSWORD` from environment variables (requires a 16-character App Password generated via Google Account Security).

## Transactional Emails

The service exports functions for specific transactional events:
- `sendVerificationOtp(email, otp)`: Sent during signup to verify the user's email address.
- `sendPasswordResetOtp(email, otp)`: Sent when a user forgets their password and requests a reset.

## Considerations

- Gmail SMTP has strict sending limits (approx. 500 emails/day for standard accounts). This setup is suitable for development and small-scale use. For production scaling, a dedicated service (e.g., AWS SES, SendGrid, Resend) should be implemented.
- The `package.json` contains references to `@getbrevo/brevo` and `resend`, indicating potential future migrations or alternative implementations for email delivery.

## Related OKF files
- [Signup Flow](../data-flows/signup-flow.md)
