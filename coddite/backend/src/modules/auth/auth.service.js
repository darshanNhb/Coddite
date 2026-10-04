import crypto from 'node:crypto';

import argon2 from 'argon2';
import { v7 as uuidv7 } from 'uuid';

import { hashEmail, encryptEmail, hashOtp } from '../../lib/crypto.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { AppError } from '../../utils/errors.js';
import {
  generateAccessToken,
  generateRefreshToken,
  getExpirationDate,
  verifyRefreshToken,
} from '../../utils/jwt.js';

const OTP_TTL_SECONDS = 15 * 60; // 15 minutes
const MAX_OTP_ATTEMPTS = 5;

// ── Argon2 config ───────────────────────────────────────────────────────────
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,   // ~19 MB
  timeCost: 2,
  parallelism: 1,
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

async function storeAndSendOtp(emailHash, normalizedEmail, purpose) {
  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);
  const redisKey = `otp:${purpose}:${emailHash}`;
  const attemptsKey = `otp_attempts:${purpose}:${emailHash}`;

  await redis.set(redisKey, hashedOtp, 'EX', OTP_TTL_SECONDS);
  await redis.del(attemptsKey);

  const { emailQueue } = await import('../../lib/queues.js');
  await emailQueue.add('sendOtp', { email: normalizedEmail, otp });
}

async function verifyOtp(emailHash, otp, purpose) {
  const redisKey = `otp:${purpose}:${emailHash}`;
  const attemptsKey = `otp_attempts:${purpose}:${emailHash}`;

  const storedHashedOtp = await redis.get(redisKey);
  if (!storedHashedOtp) {
    throw new AppError(401, 'OTP expired or not found.');
  }

  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) {
    await redis.expire(attemptsKey, OTP_TTL_SECONDS);
  }

  if (attempts > MAX_OTP_ATTEMPTS) {
    await redis.del(redisKey);
    throw new AppError(429, 'Too many failed attempts. Request a new OTP.');
  }

  const inputHashedOtp = hashOtp(otp);
  if (inputHashedOtp !== storedHashedOtp) {
    throw new AppError(401, 'Invalid OTP.');
  }

  // OTP is valid — clear it
  await redis.del(redisKey);
  await redis.del(attemptsKey);
}

/**
 *
 * @param user
 * @param ipHash
 * @param userAgentHash
 * @param existingFamilyId
 */
async function issueTokenPair(user, ipHash, userAgentHash, existingFamilyId = null) {
  const familyId = existingFamilyId || uuidv7();
  const tokenId = uuidv7();

  const accessToken = generateAccessToken(user.profile.id, user.id, user.role);
  const refreshToken = generateRefreshToken(user.id, familyId, tokenId);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      id: tokenId,
      userId: user.id,
      familyId,
      tokenHash,
      expiresAt: getExpirationDate(process.env.REFRESH_TOKEN_TTL),
      ipHash,
      userAgentHash,
    },
  });

  return { accessToken, refreshToken, profile: user.profile };
}

// ── Signup ───────────────────────────────────────────────────────────────────

/**
 *
 * @param email
 * @param handle
 * @param password
 */
export async function signup(email, handle, password) {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedHandle = handle.toLowerCase().trim();
  const hashedEmail = hashEmail(normalizedEmail);

  // 1. Check if email is banned
  const banned = await prisma.bannedIdentity.findUnique({
    where: { emailHash: hashedEmail },
  });
  if (banned) {
    throw new AppError(403, 'Account is banned.');
  }

  // 2. Check if a User already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { emailHash: hashedEmail },
  });
  if (existingUser) {
    throw new AppError(409, 'An account with this email already exists.');
  }

  // 3. Check if handle is taken in DB
  const existingProfile = await prisma.profile.findUnique({
    where: { handle: normalizedHandle },
  });
  if (existingProfile) {
    throw new AppError(409, 'This handle is already taken.');
  }

  // 4. Check if handle is reserved by another pending signup
  const reserveKey = `handle-reserve:${normalizedHandle}`;
  const existingReservation = await redis.get(reserveKey);
  if (existingReservation && existingReservation !== hashedEmail) {
    throw new AppError(409, 'This handle is already taken.');
  }

  // 5. Hash password before storing in Redis
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  // 6. Store pending signup in Redis (NOT a real User row)
  const pendingKey = `signup:${hashedEmail}`;
  const pendingData = JSON.stringify({
    email: normalizedEmail,
    handle: normalizedHandle,
    passwordHash,
    createdAt: Date.now(),
  });
  await redis.set(pendingKey, pendingData, 'EX', OTP_TTL_SECONDS);

  // 7. Reserve the handle
  await redis.set(reserveKey, hashedEmail, 'EX', OTP_TTL_SECONDS);

  // 8. Send verification OTP
  await storeAndSendOtp(hashedEmail, normalizedEmail, 'signup');
}

/**
 *
 * @param email
 * @param otp
 * @param ipHash
 * @param userAgentHash
 */
export async function signupVerify(email, otp, ipHash, userAgentHash) {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedEmail = hashEmail(normalizedEmail);

  // 1. Verify the OTP
  await verifyOtp(hashedEmail, otp, 'signup');

  // 2. Retrieve pending signup data
  const pendingKey = `signup:${hashedEmail}`;
  const pendingRaw = await redis.get(pendingKey);
  if (!pendingRaw) {
    throw new AppError(410, 'Signup session expired. Please start over.');
  }

  const pending = JSON.parse(pendingRaw);

  // 3. Double-check email uniqueness (race condition guard)
  const existingUser = await prisma.user.findUnique({
    where: { emailHash: hashedEmail },
  });
  if (existingUser) {
    throw new AppError(409, 'An account with this email already exists.');
  }

  // 4. Create User + Profile in a transaction
  const userId = uuidv7();
  const profileId = uuidv7();

  const user = await prisma.user.create({
    data: {
      id: userId,
      emailHash: hashedEmail,
      emailCiphertext: encryptEmail(pending.email),
      emailKeyId: process.env.EMAIL_ENCRYPTION_KEY_ID || 'v1',
      passwordHash: pending.passwordHash,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          id: profileId,
          handle: pending.handle,
        },
      },
    },
    include: { profile: true },
  });

  // 5. Clean up Redis
  await redis.del(pendingKey);
  await redis.del(`handle-reserve:${pending.handle}`);

  // 6. Issue tokens
  return issueTokenPair(user, ipHash, userAgentHash);
}

// ── Login ────────────────────────────────────────────────────────────────────

/**
 *
 * @param email
 * @param password
 * @param ipHash
 * @param userAgentHash
 */
export async function login(email, password, ipHash, userAgentHash) {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedEmail = hashEmail(normalizedEmail);

  const user = await prisma.user.findUnique({
    where: { emailHash: hashedEmail },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    throw new AppError(401, 'Invalid email or password.');
  }

  if (user.status === 'BANNED' || user.status === 'DELETED') {
    throw new AppError(403, 'Account is suspended or deleted.');
  }

  if (!user.passwordHash) {
    throw new AppError(401, 'No password set. Use "Forgot Password" to create one.');
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return issueTokenPair(user, ipHash, userAgentHash);
}

// ── Forgot Password ─────────────────────────────────────────────────────────

/**
 *
 * @param email
 */
export async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedEmail = hashEmail(normalizedEmail);

  // Check if banned
  const banned = await prisma.bannedIdentity.findUnique({
    where: { emailHash: hashedEmail },
  });
  if (banned) {
    // Don't reveal ban status — silently succeed
    return;
  }

  // Check user exists
  const user = await prisma.user.findUnique({
    where: { emailHash: hashedEmail },
  });
  if (!user) {
    // Don't reveal whether email exists — silently succeed
    return;
  }

  await storeAndSendOtp(hashedEmail, normalizedEmail, 'password-reset');
}

/**
 *
 * @param email
 * @param otp
 * @param newPassword
 */
export async function resetPassword(email, otp, newPassword) {
  const normalizedEmail = email.toLowerCase().trim();
  const hashedEmail = hashEmail(normalizedEmail);

  // 1. Verify the OTP
  await verifyOtp(hashedEmail, otp, 'password-reset');

  // 2. Find the user
  const user = await prisma.user.findUnique({
    where: { emailHash: hashedEmail },
  });
  if (!user) {
    throw new AppError(404, 'Account not found.');
  }

  // 3. Hash the new password and update
  // Works for both NULL passwordHash (first-time set) and existing hash (reset)
  const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // 4. Revoke all refresh tokens (force re-login everywhere)
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ── Token Refresh ────────────────────────────────────────────────────────────

/**
 *
 * @param oldRefreshToken
 * @param ipHash
 * @param userAgentHash
 */
export async function refreshTokens(oldRefreshToken, ipHash, userAgentHash) {
  if (!oldRefreshToken) throw new AppError(401, 'No refresh token provided');

  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: true } } },
  });

  if (!storedToken) {
    throw new AppError(401, 'Token not found');
  }

  // Reuse detection
  if (storedToken.revokedAt || storedToken.replacedById) {
    await prisma.refreshToken.updateMany({
      where: { familyId: storedToken.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(403, 'Token reuse detected. All sessions revoked.');
  }

  const { accessToken, refreshToken } = await issueTokenPair(
    storedToken.user,
    ipHash,
    userAgentHash,
    storedToken.familyId,
  );

  const newPayload = verifyRefreshToken(refreshToken);

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { replacedById: newPayload.jti, revokedAt: new Date() },
  });

  return { accessToken, refreshToken, profile: storedToken.user.profile };
}

// ── Logout ───────────────────────────────────────────────────────────────────

/**
 *
 * @param refreshTokenString
 */
export async function logout(refreshTokenString) {
  if (!refreshTokenString) return;

  try {
    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Ignore errors on logout
  }
}

// ── Account Settings ──────────────────────────────────────────────────────────

/**
 *
 * @param userId
 * @param currentPassword
 * @param newPassword
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user.passwordHash) {
    throw new AppError(400, 'No password set on this account. Please use "Forgot Password" to set one.');
  }

  const valid = await argon2.verify(user.passwordHash, currentPassword);
  if (!valid) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

/**
 *
 * @param userId
 */
export async function getSessions(userId) {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    distinct: ['familyId'],
    select: {
      familyId: true,
      ipHash: true,
      userAgentHash: true,
      createdAt: true,
      expiresAt: true,
    }
  });
  
  return sessions;
}

/**
 *
 * @param userId
 * @param familyId
 */
export async function revokeSessionFamily(userId, familyId) {
  await prisma.refreshToken.updateMany({
    where: { userId, familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 *
 * @param userId
 * @param currentRefreshToken
 */
export async function revokeAllOtherSessions(userId, currentRefreshToken) {
  const tokenHash = crypto.createHash('sha256').update(currentRefreshToken).digest('hex');
  
  const currentToken = await prisma.refreshToken.findUnique({
    where: { tokenHash }
  });

  if (currentToken) {
    await prisma.refreshToken.updateMany({
      where: { 
        userId, 
        familyId: { not: currentToken.familyId },
        revokedAt: null
      },
      data: { revokedAt: new Date() },
    });
  }
}



/**
 *
 * @param userId
 * @param newEmail
 */
export async function requestEmailChange(userId, newEmail) {
  const normalizedEmail = newEmail.toLowerCase().trim();
  const emailHash = hashEmail(normalizedEmail);

  // Check if taken in DB
  const existingUser = await prisma.user.findUnique({
    where: { emailHash },
  });
  if (existingUser) {
    throw new AppError(409, 'This email is already in use by another account.');
  }

  const otp = generateOtp();
  const hashedOtp = hashOtp(otp);

  const emailCiphertext = encryptEmail(normalizedEmail);
  const data = JSON.stringify({ otp: hashedOtp, emailHash, emailCiphertext });
  
  // Store everything in a single Redis key tied to the user
  await redis.set(`otp:email-change:${userId}`, data, 'EX', OTP_TTL_SECONDS);

  const { emailQueue } = await import('../../lib/queues.js');
  await emailQueue.add('sendOtp', { email: normalizedEmail, otp });
}

/**
 *
 * @param userId
 * @param otp
 * @param currentRefreshToken
 */
export async function verifyEmailChange(userId, otp, currentRefreshToken) {
  const key = `otp:email-change:${userId}`;
  const dataStr = await redis.get(key);
  if (!dataStr) {
    throw new AppError(400, 'OTP expired or not found. Please request a new one.');
  }

  const data = JSON.parse(dataStr);

  const valid = hashOtp(otp) === data.otp;
  if (!valid) {
    throw new AppError(401, 'Invalid OTP.');
  }

  // Check race condition again
  const existingUser = await prisma.user.findUnique({
    where: { emailHash: data.emailHash },
  });
  if (existingUser) {
    await redis.del(key);
    throw new AppError(409, 'This email was just taken by another account.');
  }

  // Update email
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailHash: data.emailHash,
      emailCiphertext: data.emailCiphertext,
      emailKeyId: process.env.EMAIL_ENCRYPTION_KEY_ID || 'v1',
      emailVerifiedAt: new Date(),
    },
  });

  await redis.del(key);

  // Revoke all other sessions
  if (currentRefreshToken) {
    await revokeAllOtherSessions(userId, currentRefreshToken);
  }
}

/**
 *
 * @param userId
 * @param password
 */
export async function deleteAccount(userId, password) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  
  if (!user.passwordHash) {
    throw new AppError(400, 'No password set on this account. Please use "Forgot Password" to set one before deleting.');
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    throw new AppError(401, 'Password is incorrect');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        emailHash: `deleted-${userId}`, 
        emailCiphertext: 'deleted',
        passwordHash: null,
      },
    });

    await tx.profile.update({
      where: { userId },
      data: {
        handle: `deleted-${user.profile.id}`,
        bio: null,
        avatarUrl: null,
      },
    });

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}

export { issueTokenPair as generateTokens };
