# Custom Domain Migration Guide

## Current State (No Custom Domain)

The frontend and API are deployed on separate hosting provider subdomains:
- **Frontend:** `coddite.vercel.app` (Vercel)
- **API:** `coddite-api.onrender.com` (Render)

Cookie-based refresh uses a Vercel rewrite or `SameSite=None; Secure` as a cross-origin fallback. See [ADR-0003](../decisions/0003-cross-origin-cookie-fallback.md).

## Migration Steps (When You Get a Domain)

### 1. DNS Setup

Configure DNS records (e.g., on Cloudflare):

```
app.<domain>    CNAME   cname.vercel-dns.com
api.<domain>    CNAME   coddite-api.onrender.com
```

### 2. Hosting Configuration

**Vercel:**
1. Go to Project Settings → Domains
2. Add `app.<domain>`
3. Verify DNS propagation

**Render:**
1. Go to Service → Settings → Custom Domains
2. Add `api.<domain>`
3. Verify DNS and TLS certificate

### 3. Environment Variable Updates

**Backend (`backend/.env`):**
```
API_BASE_URL=https://api.<domain>
WEB_BASE_URL=https://app.<domain>
CORS_ALLOWED_ORIGINS=https://app.<domain>
COOKIE_DOMAIN=<domain>
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

**Frontend (`frontend/.env`):**
```
VITE_API_BASE_URL=https://api.<domain>
VITE_WS_URL=https://api.<domain>
```

### 4. Email Authentication

Configure SPF, DKIM, and DMARC for the sending domain:
1. Set up SPF record allowing Resend
2. Configure DKIM via the Resend dashboard
3. Add a DMARC record

### 5. Remove Vercel Rewrite

If you were using the `/api/*` rewrite to the Render backend, it can be removed (or kept for backward compatibility).

### 6. Verify

- [ ] Frontend loads at `https://app.<domain>`
- [ ] API responds at `https://api.<domain>/health/live`
- [ ] Login flow works (cookie is set with correct domain)
- [ ] OTP emails arrive in inbox
- [ ] HSTS headers are present
