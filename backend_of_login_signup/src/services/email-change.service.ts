import redis from "../config/redis.js";
import { generateOtp, hashOtp } from "../utils/otp.js";

const OTP_TTL = 10 * 60; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 60; // 60 seconds

function otpKey(userId: string): string {
    return `email-change:otp:${userId}`;
}

function dataKey(userId: string): string {
    return `email-change:data:${userId}`;
}

function attemptKey(userId: string): string {
    return `email-change:attempts:${userId}`;
}

function cooldownKey(userId: string): string {
    return `email-change:cooldown:${userId}`;
}

/**
 * Create an OTP for email change and store the new email in Redis.
 */
export async function createEmailChangeOtp(
    userId: string,
    newEmail: string
): Promise<string> {
    const cooldownExists = await redis.exists(cooldownKey(userId));

    if (cooldownExists) {
        throw new Error("OTP_RESEND_COOLDOWN");
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await redis.set(otpKey(userId), otpHash, { ex: OTP_TTL });
    await redis.set(dataKey(userId), newEmail.toLowerCase().trim(), { ex: OTP_TTL });
    await redis.set(attemptKey(userId), "0", { ex: OTP_TTL });
    await redis.set(cooldownKey(userId), "1", { ex: RESEND_COOLDOWN });

    return otp;
}

/**
 * Verify the email change OTP. Returns the new email if valid, null if invalid.
 */
export async function verifyEmailChangeOtp(
    userId: string,
    otp: string
): Promise<string | null> {
    const storedHash = await redis.get<string>(otpKey(userId));

    if (!storedHash) {
        throw new Error("OTP_EXPIRED");
    }

    const attempts = await redis.incr(attemptKey(userId));

    if (attempts > MAX_ATTEMPTS) {
        await redis.del(otpKey(userId), dataKey(userId), attemptKey(userId));
        throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    const providedHash = hashOtp(otp);

    if (providedHash !== storedHash) {
        return null;
    }

    const newEmail = await redis.get<string>(dataKey(userId));

    await redis.del(
        otpKey(userId),
        dataKey(userId),
        attemptKey(userId),
        cooldownKey(userId)
    );

    return newEmail;
}
