import crypto from 'node:crypto';

// Use environment variables for all crypto operations
const {
  EMAIL_HASH_PEPPER,
  EMAIL_ENCRYPTION_KEY,
  OTP_HMAC_SECRET
} = process.env;

/**
 * Deterministically hash an email address for fast exact-match lookups.
 * MUST NOT be reversible.
 * @param {string} email - The raw email address
 * @returns {string} The HMAC-SHA256 hash (base64)
 */
export function hashEmail(email) {
  const normalized = email.toLowerCase().trim();
  const pepperBuf = Buffer.from(EMAIL_HASH_PEPPER, 'base64');
  return crypto.createHmac('sha256', pepperBuf).update(normalized).digest('base64');
}

/**
 * Encrypt an email address for storage.
 * @param {string} email 
 * @returns {string} The AES-256-GCM ciphertext in format iv:authTag:encryptedData
 */
export function encryptEmail(email) {
  const normalized = email.toLowerCase().trim();
  const key = Buffer.from(EMAIL_ENCRYPTION_KEY, 'base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(normalized, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

/**
 * Hash an OTP for storage in Redis.
 * This prevents the backend from knowing the raw OTP in case Redis is compromised.
 * @param {string} otp 
 * @returns {string} 
 */
export function hashOtp(otp) {
  const secret = Buffer.from(OTP_HMAC_SECRET, 'base64');
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}
