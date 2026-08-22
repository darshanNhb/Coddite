You can create:

Coddite/

└── backend_of_login_signup/

└── README.md

and paste this:

# Coddite Authentication Backend

- JWT

- HTTP-only cookies

- Refresh-token rotation

- Zod

- Helmet

- CORS

- Rate limiting

- CSRF protection

## Temporary Storage

- Upstash Redis

## Email

- Nodemailer

- Gmail SMTP

---

# Project Structure

```text

backend_of_login_signup/

│

├── prisma/

│   ├── migrations/

│   └── schema.prisma

│

├── src/

│   │

│   ├── config/

│   │   ├── env.ts

│   │   ├── prisma.ts

│   │   └── redis.ts

│   │

│   ├── controllers/

│   │   └── auth.controller.ts

│   │

│   ├── jobs/

│   │   └── session-cleanup.job.ts

│   │

│   ├── middleware/

│   │   ├── auth.middleware.ts

│   │   ├── csrf.middleware.ts

│   │   ├── error.middleware.ts

│   │   └── request-id.middleware.ts

│   │

│   ├── routes/

│   │   └── auth.routes.ts

│   │

│   ├── services/

│   │   ├── audit.service.ts

│   │   ├── email.service.ts

│   │   ├── otp.service.ts

│   │   ├── password-reset.service.ts

│   │   ├── session-cleanup.service.ts

│   │   ├── session.service.ts

│   │   └── signup.service.ts

│   │

│   ├── utils/

│   │   ├── auth-cookie.ts

│   │   ├── jwt.ts

│   │   ├── otp.ts

│   │   ├── password.ts

│   │   ├── refresh-token.ts

│   │   └── request-context.ts

│   │

│   ├── app.ts

│   └── server.ts

│

├── .env

├── .gitignore

├── package.json

├── package-lock.json

├── prisma.config.ts

└── tsconfig.json

Requirements

Install the following before running the project.

Node.js

Node.js 18+ is required.

Recommended:

Node.js 24+

Check:

node -v

npm -v

1. Install Dependencies

From the backend directory:

cd backend_of_login_signup

Install all dependencies:

npm install

If you are setting up the project from scratch, the main packages include:

npm install express cors dotenv zod helmet cookie-parser

npm install prisma @prisma/client

npm install @prisma/adapter-pg pg

npm install @upstash/redis

npm install argon2

npm install jose

npm install express-rate-limit

npm install nodemailer

npm install uuid

Development dependencies:

npm install -D typescript tsx

npm install -D @types/node

npm install -D @types/express

npm install -D @types/cors

npm install -D @types/cookie-parser

npm install -D @types/nodemailer

2. Create Neon PostgreSQL Database

Create a PostgreSQL database using Neon.

Create a database/project such as:

Project: Coddite

Database: neondb

Copy the PostgreSQL connection string provided by Neon.

It will look similar to:

postgresql://username:password@host/database?sslmode=require

Add it to .env:

DATABASE_URL="your_neon_connection_string"

Do not commit .env to GitHub.

3. Configure Prisma

Prisma is used as the ORM.

Initialize Prisma if necessary:

npx prisma init

For Prisma 7, the database URL is configured in:

prisma.config.ts

Example:

import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({

schema: "prisma/schema.prisma",

migrations: {

    path: "prisma/migrations",

},

datasource: {

    url: env("DATABASE\_URL"),

},

});

The PostgreSQL datasource in schema.prisma should not contain the old Prisma 6-style url property.

4. Run Database Migrations

After configuring the database:

npx prisma migrate dev

Or create a named migration:

npx prisma migrate dev --name init_auth

Generate Prisma Client:

npx prisma generate

Open Prisma Studio:

npx prisma studio

5. Upstash Redis

Upstash Redis is used for temporary and short-lived authentication data.

Current uses include:

Signup OTP

OTP expiration

OTP attempts

OTP resend cooldown

Temporary signup data

Password reset OTP

Create a Redis database in Upstash.

Recommended region for users in India:

Mumbai

Use the REST credentials supplied by Upstash.

Add to .env:

UPSTASH_REDIS_REST_URL="your_upstash_rest_url"

UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"

6. Gmail + Nodemailer

Coddite currently uses Nodemailer with Gmail SMTP to send OTP emails.

Gmail account

Use a Gmail account dedicated to development/testing.

Example:

coddite.testing@gmail.com

Do not use your normal Gmail password.

Enable 2-Step Verification

In your Google account:

Google Account

→ Security

→ 2-Step Verification

Enable it.

Create an App Password

Go to:

Google Account

→ Security

→ 2-Step Verification

→ App passwords

Create an app password for:

Coddite

Google will generate a 16-character app password.

Add the values to .env:

GMAIL_USER="yourgmail@gmail.com"

GMAIL_APP_PASSWORD="your_app_password"

Never commit the app password.

7. Environment Variables

Create:

backend_of_login_signup/.env

Example:

# --------------------------------------------------

# Application

# --------------------------------------------------

NODE_ENV="development"

PORT="5000"

FRONTEND_URL="http://localhost:5173"



# --------------------------------------------------

# PostgreSQL / Neon

# --------------------------------------------------

DATABASE_URL="your_neon_postgresql_connection_string"



# --------------------------------------------------

# Upstash Redis

# --------------------------------------------------

UPSTASH_REDIS_REST_URL="your_upstash_rest_url"

UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"



# --------------------------------------------------

# Gmail / Nodemailer

# --------------------------------------------------

GMAIL_USER="yourgmail@gmail.com"

GMAIL_APP_PASSWORD="your_gmail_app_password"



# --------------------------------------------------

# JWT

# --------------------------------------------------

ACCESS_TOKEN_SECRET="your_long_random_secret"

ACCESS_TOKEN_ISSUER="coddite-api"

ACCESS_TOKEN_AUDIENCE="coddite-client"

ACCESS_TOKEN_EXPIRES_IN="15m"

8. JWT Secret

Generate a strong secret.

Run:

node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

Example output:

VDsQ6prpdq0mnO2zTSoooYyyQoW_aifaWRNnR4CR85ofEr-jTHNkKkwfg0CA9S8m

Put your generated value into:

ACCESS_TOKEN_SECRET="your_generated_secret"

Do not use the example secret above.

9. Security

Never commit:

.env

The .gitignore should contain:

node_modules/

.env

dist/

src/generated/

.agents/

.claude/

.windsurf/

skills-lock.json

Never expose:

Database passwords

Redis tokens

Gmail App Password

JWT secrets

API keys

Refresh tokens

OTP values

10. Start the Backend

Development mode:

npm run dev

The server should start at:

http://localhost:5000

Expected output:

Coddite server running on port 5000

11. Health Check

Request:

GET http://localhost:5000/api/health

Expected:

{

"success": true,

"message": "Coddite API is running"

}

Authentication API

Base URL:

http://localhost:5000

Signup

POST /api/auth/signup

Body:

{

"fullName": "Darshan Buddhdev",

"username": "darshan123",

"email": "your-email@gmail.com",

"mobileNumber": "+919876543210",

"password": "Coddite@2026Secure",

"confirmPassword": "Coddite@2026Secure"

}

The server:

Validates the data

Checks email/username

Hashes the password

Stores temporary signup data in Redis

Generates an OTP

Stores the OTP hash in Redis

Sends the OTP using Nodemailer

Verify Email

POST /api/auth/verify-email

Body:

{

"email": "your-email@gmail.com",

"otp": "123456"

}

After successful verification, the permanent user is created in PostgreSQL.

Login

POST /api/auth/login

Body:

{

"email": "your-email@gmail.com",

"password": "Coddite@2026Secure"

}

Returns a short-lived JWT access token and sets a secure refresh-token cookie.

Refresh Access Token

POST /api/auth/refresh

No request body is required.

The refresh token is read from the HTTP-only cookie.

Get Current User

GET /api/auth/me

Header:

Authorization: Bearer YOUR_ACCESS_TOKEN

Logout

POST /api/auth/logout

Header:

Authorization: Bearer YOUR_ACCESS_TOKEN

The current session is revoked.

Logout All Devices

POST /api/auth/logout-all

Header:

Authorization: Bearer YOUR_ACCESS_TOKEN

All active sessions for that user are revoked.

Forgot Password

POST /api/auth/forgot-password

Body:

{

"email": "your-email@gmail.com"

}

A password-reset OTP is sent by email.

The API intentionally returns the same public response whether the email exists or not.

Reset Password

POST /api/auth/reset-password

Body:

{

"email": "your-email@gmail.com",

"otp": "123456",

"newPassword": "NewCoddite@2026Secure",

"confirmPassword": "NewCoddite@2026Secure"

}

After successful password reset, existing sessions are revoked.

Authentication Flow

Signup

User

↓

Signup form

↓

Express API

↓

Zod validation

↓

Argon2id password hash

↓

Redis temporary signup data

↓

Generate OTP

↓

Redis OTP

↓

Nodemailer

↓

Gmail

↓

User receives OTP

↓

Verify OTP

↓

Create User in PostgreSQL

Login

Email + Password

↓

PostgreSQL user lookup

↓

Argon2id verification

↓

Create session

↓

Generate access JWT

↓

Generate refresh token

↓

HTTP-only cookie

Refresh

Refresh cookie

↓

Session verification

↓

Refresh-token verification

↓

Token rotation

↓

New access token

Database

Current authentication-related tables:

User

Session

AuditLog

User

Stores permanent account information:

id

fullName

username

email

mobileNumber

passwordHash

emailVerified

role

status

createdAt

updatedAt

Session

Stores session information:

id

userId

refreshTokenHash

userAgent

ipAddress

lastUsedAt

expiresAt

revokedAt

createdAt

updatedAt

AuditLog

Stores security events:

id

userId

event

ipAddress

userAgent

requestId

metadata

createdAt

Redis Data

Redis stores temporary authentication information.

Examples:

signup:otp:<email>

signup:otp:attempts:<email>

signup:otp:cooldown:<email>

signup:data:<email>

password-reset:otp:<email>

Temporary keys use expiration/TTL.

Password Security

Passwords are never stored in plaintext.

Coddite uses:

Password

↓

Argon2id

↓

passwordHash

↓

PostgreSQL

Passwords must satisfy the configured password policy.

Session Security

Coddite uses:

Short-lived JWT access tokens

Refresh tokens

HTTP-only refresh cookies

Refresh-token rotation

Refresh-token reuse detection

Server-side session records

Session revocation

Logout from all devices

Security Middleware

The backend includes:

Helmet

CORS

Rate limiting

Zod validation

CSRF protection

Authentication middleware

Centralized error handling

Request IDs

Session Cleanup

Expired sessions are cleaned automatically.

The cleanup system removes:

Expired sessions

and eventually:

Revoked sessions older than the retention period

Audit Logging

Security events can include:

LOGIN_SUCCESS

LOGIN_FAILURE

OTP_REQUESTED

OTP_VERIFICATION_FAILED

PASSWORD_CHANGED

SESSION_CREATED

SESSION_REVOKED

REFRESH_REUSE_DETECTED

LOGOUT

LOGOUT_ALL

Sensitive values are not stored in audit logs.

Development Testing

Use Thunder Client, Postman, or another API client.

Recommended testing order:

GET  /api/health

POST /api/auth/signup

POST /api/auth/verify-email

POST /api/auth/login

GET  /api/auth/me

POST /api/auth/refresh

POST /api/auth/logout

POST /api/auth/logout-all

POST /api/auth/forgot-password

POST /api/auth/reset-password

Also test:

Wrong password

Wrong OTP

Expired OTP

Too many OTP attempts

Too many login attempts

Missing authentication token

Revoked session

Refresh-token reuse

Password reset invalidating existing sessions

Production Notes

Before public deployment:

Use production environment variables.

Replace the development frontend URL.

Use HTTPS.

Use a production email provider/domain rather than relying indefinitely on a personal Gmail account.

Review CORS allowed origins.

Keep NODE_ENV=production.

Keep secrets only in deployment environment variables.

Review dependency vulnerabilities.

Run automated authentication tests.

Verify database backups and recovery procedures.

Run Commands

Install

npm install

Prisma migration

npx prisma migrate dev

Generate Prisma client

npx prisma generate

Prisma Studio

npx prisma studio

Development server

npm run dev

Production build

npm run build

Production start

npm start
