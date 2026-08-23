---
title: Profile Endpoints
type: api
scope: Defines the REST endpoints for user profile management, including sub-entities like work, education, and skills.
related_files:
  - backend_of_login_signup/src/routes/profile.routes.ts
  - backend_of_login_signup/src/controllers/profile.controller.ts
related_okf:
  - ../domains/profile.md
confidence: high
last_verified: 2026-08-23
---

## Overview

All endpoints in this group are prefixed with `/api/profile` and **require authentication** via the `authenticate` middleware. The router definition is located in `backend_of_login_signup/src/routes/profile.routes.ts`.

## Endpoints

### General Profile
- **GET `/`**: Fetch the full user profile, including all related entities (work, education, etc.).
- **PATCH `/`**: Update basic profile information (name, username, gender, location, birthday).

### Profile Photo
- **POST `/photo`**: Upload a new profile photo. Uses `uploadPhoto.single("photo")` middleware.
- **DELETE `/photo`**: Remove the current profile photo.

### Social Links
- **POST `/social-links`**: Add a new social link.
- **PATCH `/social-links/:id`**: Update an existing social link.
- **DELETE `/social-links/:id`**: Delete a social link.

### Work Experience
- **POST `/work`**: Add a new work experience entry.
- **PATCH `/work/:id`**: Update an existing work experience entry.
- **DELETE `/work/:id`**: Delete a work experience entry.

### Education
- **POST `/education`**: Add a new education entry.
- **PATCH `/education/:id`**: Update an existing education entry.
- **DELETE `/education/:id`**: Delete an education entry.

### Skills
- **POST `/skills`**: Add a new skill to the user's profile.
- **DELETE `/skills/:id`**: Remove a skill from the user's profile.

### Sensitive Operations
These operations are protected by specific rate limiters (`sensitiveActionLimiter` or `otpRequestLimiter`).

- **POST `/email/change/request`**: Request to change email address (sends OTP).
- **POST `/email/change/verify`**: Verify OTP and update email.
- **POST `/password/change`**: Change password (requires current password).
- **POST `/password/reset/request`**: Request password reset while authenticated.
- **POST `/password/reset/verify`**: Verify password reset OTP.
- **POST `/delete/request`**: Request account deletion (sends OTP).
- **POST `/delete/verify`**: Verify OTP and delete the account.

### Session Management
- **GET `/sessions`**: Fetch all active sessions for the user.
- **DELETE `/sessions/:id`**: Revoke a specific session.
- **POST `/sessions/logout-all`**: Revoke all active sessions across devices.

## Related OKF files
- [Profile Domain](../domains/profile.md)
