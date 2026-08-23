---
title: Profile Domain
type: domain
scope: Overview of user profile management, including personal details, education, work experience, skills, and profile photo.
related_files:
  - backend_of_login_signup/src/controllers/profile.controller.ts
  - backend_of_login_signup/src/services/profile.service.ts
  - backend_of_login_signup/src/services/education.service.ts
  - backend_of_login_signup/src/services/work.service.ts
  - backend_of_login_signup/src/services/skill.service.ts
  - backend_of_login_signup/src/services/social-link.service.ts
related_okf:
  - ../apis/profile-endpoints.md
confidence: high
last_verified: 2026-08-23
---

## Overview

The Profile domain manages all data associated with a user beyond basic authentication credentials. Users can maintain a detailed resume-like profile.

## Sub-Domains

The profile domain is divided into several discrete areas, each managed by its own service:

- **General Profile:** Handled by `backend_of_login_signup/src/services/profile.service.ts`. Includes updating basic info (`fullName`, `username`, `gender`, `location`, `birthday`), handling profile photo uploads, changing passwords, requesting email changes, and account deletion.
- **Education:** Handled by `backend_of_login_signup/src/services/education.service.ts`. Supports CRUD operations for a user's academic history. Limited to 5 entries per user.
- **Work Experience:** Handled by `backend_of_login_signup/src/services/work.service.ts`. Supports CRUD operations for employment history. Limited to 5 entries per user.
- **Skills:** Handled by `backend_of_login_signup/src/services/skill.service.ts`. Users can tag themselves with predefined or custom skills. Limited to 7 skills per user.
- **Social Links:** Handled by `backend_of_login_signup/src/services/social-link.service.ts`. Users can add links to their external profiles (e.g., GitHub, LinkedIn). Limited to 5 links per user.

## Profile Photo

Profile photos are uploaded via `multipart/form-data` using `multer` middleware in `backend_of_login_signup/src/middleware/upload.middleware.ts`. 

<!-- UNVERIFIED: could not confirm Cloudinary implementation fully without viewing the exact config, but package.json has 'cloudinary' and the error map specifies 'CLOUDINARY_NOT_CONFIGURED'. -->

## Sensitive Actions

Certain profile updates require OTP verification or strict rate limits, such as changing an email address or resetting a password. These hit specialized rate limiters defined in `backend_of_login_signup/src/routes/profile.routes.ts`.

## Related OKF files
- [Profile Endpoints](../apis/profile-endpoints.md)
