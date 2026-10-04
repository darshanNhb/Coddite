#!/usr/bin/env node

/**
 * Generate cryptographic secrets for Coddite .env files.
 *
 * Usage: node infra/scripts/generate-secrets.js
 *
 * Outputs freshly generated values for the user to copy into their
 * own .env file. NEVER commit the output. Use different secrets for
 * every environment (development, staging, production) and store
 * production secrets in a password manager or the hosting provider's
 * secret store.
 *
 * @module generate-secrets
 */

import { randomBytes } from 'node:crypto';

/**
 * Generate a base64-encoded random string of the given byte length.
 * @param {number} bytes
 * @returns {string}
 */
function generateSecret(bytes) {
  return randomBytes(bytes).toString('base64');
}

const secrets = {
  JWT_ACCESS_SECRET: generateSecret(64),
  JWT_REFRESH_SECRET: generateSecret(64),
  EMAIL_HASH_PEPPER: generateSecret(32),
  EMAIL_ENCRYPTION_KEY: generateSecret(32),
  OTP_HMAC_SECRET: generateSecret(32),
  IP_HASH_SALT: generateSecret(32),
};

console.warn('');
console.warn('═══════════════════════════════════════════════════════════════');
console.warn('  Coddite — Generated Secrets');
console.warn('  Copy these into your .env file. Do NOT commit them.');
console.warn('  Generate NEW values for each environment (dev/staging/prod).');
console.warn('═══════════════════════════════════════════════════════════════');
console.warn('');

for (const [key, value] of Object.entries(secrets)) {
  console.warn(`${key}=${value}`);
}

console.warn('');
console.warn('EMAIL_ENCRYPTION_KEY_ID=v1');
console.warn('');
console.warn('═══════════════════════════════════════════════════════════════');
console.warn('  ⚠  These values are shown ONCE. Save them now.');
console.warn('  ⚠  Store production secrets in a password manager.');
console.warn('═══════════════════════════════════════════════════════════════');
console.warn('');
