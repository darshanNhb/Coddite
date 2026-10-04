import jwt from 'jsonwebtoken';

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
} = process.env;

/**
 * Generate an Access Token (JWT).
 * @param {string} profileId 
 * @param {string} userId 
 * @param {string} role 
 * @returns {string} 
 */
export function generateAccessToken(profileId, userId, role) {
  return jwt.sign({ profileId, userId, role }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

/**
 * Verify an Access Token.
 * @param {string} token 
 * @returns {any} 
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

/**
 * Generate a Refresh Token (JWT).
 * @param {string} userId 
 * @param {string} familyId 
 * @param {string} tokenId - unique ID for this specific token
 * @returns {string} 
 */
export function generateRefreshToken(userId, familyId, tokenId) {
  return jwt.sign({ userId, familyId, jti: tokenId }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

/**
 * Verify a Refresh Token.
 * @param {string} token 
 * @returns {any} 
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

/**
 * Calculate absolute expiration date based on a TTL string like '30d'.
 * @param {string} ttl 
 * @returns {Date}
 */
export function getExpirationDate(ttl) {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid TTL format: ${ttl}`);
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  let ms = 0;
  if (unit === 's') ms = value * 1000;
  else if (unit === 'm') ms = value * 60 * 1000;
  else if (unit === 'h') ms = value * 60 * 60 * 1000;
  else if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;
  
  return new Date(Date.now() + ms);
}
