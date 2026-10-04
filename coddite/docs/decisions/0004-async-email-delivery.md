# 0004. Async Email Delivery

## Context
During the Phase 5 load testing of the OTP request endpoint (`POST /api/v1/auth/otp/request`), the endpoint exhibited a p95 latency of ~4 seconds under a moderate load of 5 concurrent virtual users. Profiling revealed that the latency was not due to hashing (which relies on fast `HMAC-SHA256`) but because the endpoint synchronously awaited `nodemailer.sendMail()`. The process of establishing a TCP connection, performing the SMTP handshake (EHLO, MAIL FROM, etc.), sending the payload, and quitting blocked the HTTP response.

Since we already had BullMQ infrastructure laid out from Phase 0, we could resolve this immediately instead of deferring it to a future architecture change.

## Decision
We moved the `sendOtpEmail()` call into a BullMQ background job (the `email` queue). 
- The HTTP handler now simply generates the OTP, saves its hash to Redis, pushes a job to the `emailQueue`, and immediately responds to the client.
- The `worker.js` processor consumes the `email` queue and executes the synchronous SMTP send out of band.

## Consequences
### Positive UX
- The frontend user no longer has to stare at a loading spinner for several seconds before seeing the "Check your email for the OTP" confirmation. The UI transition is now practically instantaneous.

### Load Test Results (Before vs After)
**Before (Sync SMTP):**
- p95 Latency: **3.98s**
- Throughput: **~2.11 req/s**

**After (Async BullMQ):**
- p95 Latency: **7.17ms** (a 99.8% reduction)
- Throughput: **~3.9 req/s** (limited by test scenario length, entirely sub-100ms)
- Checks Pass Rate: **100%** (all 79 requests fulfilled in under 500ms)

This confirms the endpoint is fully production-ready and immune to SMTP provider bottlenecks.
