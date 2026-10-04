#!/usr/bin/env node

/**
 * Environment variable validation script.
 *
 * Usage: pnpm env:check
 *
 * Validates both backend and frontend .env files against their
 * respective Zod schemas. Prints a pass/fail table by variable
 * name — NEVER prints actual values.
 *
 * @module env-check
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

/**
 * Parse a .env file into a key-value object.
 * Handles comments, empty lines, and quoted values.
 * @param {string} filePath
 * @returns {Record<string, string>}
 */
function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }
  const content = readFileSync(filePath, 'utf-8');
  /** @type {Record<string, string>} */
  const env = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

/**
 * @typedef {Object} CheckResult
 * @property {string} variable
 * @property {'PASS' | 'FAIL' | 'WARN' | 'SKIP'} status
 * @property {string} [reason]
 */

/**
 * Check a list of required and optional variables.
 * @param {Record<string, string>} env
 * @param {Array<{name: string, required: boolean, secret?: boolean, validate?: (v: string) => string|null}>} vars
 * @returns {CheckResult[]}
 */
function checkVariables(env, vars) {
  /** @type {CheckResult[]} */
  const results = [];

  for (const v of vars) {
    const value = env[v.name];

    if (!value || value.startsWith('<')) {
      if (v.required) {
        results.push({ variable: v.name, status: 'FAIL', reason: 'Missing or placeholder' });
      } else {
        results.push({ variable: v.name, status: 'SKIP', reason: 'Optional, not set' });
      }
      continue;
    }

    if (v.validate) {
      const error = v.validate(value);
      if (error) {
        results.push({ variable: v.name, status: 'FAIL', reason: error });
        continue;
      }
    }

    results.push({ variable: v.name, status: 'PASS' });
  }

  return results;
}

/**
 * Print results as a formatted table.
 * @param {string} title
 * @param {CheckResult[]} results
 */
function printTable(title, results) {
  console.warn(`\n  ${title}`);
  console.warn('  ' + '─'.repeat(60));

  const statusIcons = { PASS: '✓', FAIL: '✗', WARN: '⚠', SKIP: '○' };

  for (const r of results) {
    const icon = statusIcons[r.status];
    const reason = r.reason ? ` (${r.reason})` : '';
    const padding = ' '.repeat(Math.max(1, 35 - r.variable.length));
    console.warn(`  ${icon} ${r.variable}${padding}${r.status}${reason}`);
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  console.warn(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
}

// ── Backend variables ──
const backendEnv = parseEnvFile(resolve(ROOT, 'backend', '.env'));

const backendVars = [
  // A. Core
  { name: 'NODE_ENV', required: true, validate: (v) => ['development', 'test', 'production'].includes(v) ? null : 'Must be development, test, or production' },
  { name: 'PORT', required: true, validate: (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535 ? null : 'Must be 1-65535' },
  { name: 'API_BASE_URL', required: true, validate: (v) => v.startsWith('http') ? null : 'Must be a URL' },
  { name: 'WEB_BASE_URL', required: true, validate: (v) => v.startsWith('http') ? null : 'Must be a URL' },
  { name: 'CORS_ALLOWED_ORIGINS', required: true },
  { name: 'TRUST_PROXY', required: false },
  { name: 'RUN_WORKER_IN_API', required: false },

  // B. Database
  { name: 'DATABASE_URL', required: true, validate: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://') ? null : 'Must be a postgresql:// URL' },
  { name: 'DIRECT_URL', required: true, validate: (v) => v.startsWith('postgresql://') || v.startsWith('postgres://') ? null : 'Must be a postgresql:// URL' },

  // C. Redis
  { name: 'REDIS_URL', required: true, validate: (v) => v.startsWith('redis://') || v.startsWith('rediss://') ? null : 'Must be a redis:// or rediss:// URL' },
  { name: 'CACHE_REDIS_URL', required: false },
  { name: 'UPSTASH_REDIS_REST_URL', required: false },
  { name: 'UPSTASH_REDIS_REST_TOKEN', required: false, secret: true },

  // D. Auth & Crypto
  { name: 'JWT_ACCESS_SECRET', required: true, secret: true, validate: (v) => v.length >= 64 ? null : 'Must be at least 64 characters' },
  { name: 'JWT_REFRESH_SECRET', required: true, secret: true, validate: (v) => v.length >= 64 ? null : 'Must be at least 64 characters' },
  { name: 'ACCESS_TOKEN_TTL', required: true },
  { name: 'REFRESH_TOKEN_TTL', required: true },
  { name: 'COOKIE_SECURE', required: true },
  { name: 'COOKIE_SAMESITE', required: true, validate: (v) => ['lax', 'strict', 'none'].includes(v) ? null : 'Must be lax, strict, or none' },
  { name: 'EMAIL_HASH_PEPPER', required: true, secret: true },
  { name: 'EMAIL_ENCRYPTION_KEY', required: true, secret: true },
  { name: 'EMAIL_ENCRYPTION_KEY_ID', required: true },
  { name: 'OTP_HMAC_SECRET', required: true, secret: true },
  { name: 'IP_HASH_SALT', required: true, secret: true },
  { name: 'PASSWORD_LOGIN_ENABLED', required: false },

  // E. Email
  { name: 'EMAIL_PROVIDER', required: true, validate: (v) => ['resend', 'smtp'].includes(v) ? null : 'Must be resend or smtp' },
  { name: 'EMAIL_FROM', required: true },
  { name: 'SMTP_HOST', required: false },
  { name: 'SMTP_PORT', required: false },

  // F. Images
  { name: 'STORAGE_PROVIDER', required: false },
  { name: 'CLOUDINARY_CLOUD_NAME', required: false },
  { name: 'CLOUDINARY_API_KEY', required: false },
  { name: 'CLOUDINARY_API_SECRET', required: false, secret: true },

  // G. Bot protection
  { name: 'TURNSTILE_SECRET_KEY', required: false, secret: true },
  { name: 'TURNSTILE_ENABLED', required: false },

  // H. AI/ML
  { name: 'AI_ENABLED', required: false },
  { name: 'EMBEDDING_DIMENSIONS', required: false, validate: (v) => /^\d+$/.test(v) ? null : 'Must be an integer' },

  // I. Observability
  { name: 'SENTRY_DSN', required: false },

  // J. Rate limiting
  { name: 'RL_GLOBAL_PER_MIN', required: false },

  // K. Bootstrap
  { name: 'ADMIN_BOOTSTRAP_EMAIL', required: false },
];

const backendResults = checkVariables(backendEnv, backendVars);

// ── Frontend variables ──
const frontendEnv = parseEnvFile(resolve(ROOT, 'frontend', '.env'));

const frontendVars = [
  { name: 'VITE_API_BASE_URL', required: true, validate: (v) => v.startsWith('http') ? null : 'Must be a URL' },
  { name: 'VITE_WS_URL', required: true, validate: (v) => v.startsWith('http') || v.startsWith('ws') ? null : 'Must be a URL' },
  { name: 'VITE_TURNSTILE_SITE_KEY', required: false },
  { name: 'VITE_SENTRY_DSN', required: false },
  { name: 'VITE_GOOGLE_CLIENT_ID', required: false },
  { name: 'VITE_APP_ENV', required: false },
];

const frontendResults = checkVariables(frontendEnv, frontendVars);

// ── Print results ──
console.warn('\n═══════════════════════════════════════════════════════════════');
console.warn('  Coddite — Environment Variable Check');
console.warn('═══════════════════════════════════════════════════════════════');

printTable('Backend (backend/.env)', backendResults);
printTable('Frontend (frontend/.env)', frontendResults);

// ── Exit code ──
const allFailed = [
  ...backendResults.filter((r) => r.status === 'FAIL'),
  ...frontendResults.filter((r) => r.status === 'FAIL'),
];

if (allFailed.length > 0) {
  console.warn(`\n  ✗ ${allFailed.length} required variable(s) missing or invalid.`);
  console.warn('  Fix the issues above and run pnpm env:check again.\n');
  process.exit(1);
} else {
  console.warn('\n  ✓ All required variables are set.\n');
  process.exit(0);
}
