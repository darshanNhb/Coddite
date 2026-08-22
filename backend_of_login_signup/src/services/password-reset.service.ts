import redis from "../config/redis.js";
import { generateOtp, hashOtp } from "../utils/otp.js";

const RESET_OTP_TTL = 10 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 60;

function otpKey(email: string): string {
    return `password-reset:otp:${email.toLowerCase().trim()}`;
}

function attemptKey(email: string): string {
    return `password-reset:attempts:${email.toLowerCase().trim()}`;
}

function cooldownKey(email: string): string {
    return `password-reset:cooldown:${email.toLowerCase().trim()}`;
}

export async function createPasswordResetOtp(
    email: string
): Promise<string> {
    const normalizedEmail = email.toLowerCase().trim();

    const cooldownExists = await redis.exists(
        cooldownKey(normalizedEmail)
    );

    if (cooldownExists) {
        throw new Error("OTP_RESEND_COOLDOWN");
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    await redis.set(
        otpKey(normalizedEmail),
        otpHash,
        {
            ex: RESET_OTP_TTL,
        }
    );

    await redis.set(
        attemptKey(normalizedEmail),
        "0",
        {
            ex: RESET_OTP_TTL,
        }
    );

    await redis.set(
        cooldownKey(normalizedEmail),
        "1",
        {
            ex: RESEND_COOLDOWN,
        }
    );

    return otp;
}

export async function verifyPasswordResetOtp(
    email: string,
    otp: string
): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const storedHash = await redis.get<string>(
        otpKey(normalizedEmail)
    );

    if (!storedHash) {
        throw new Error("OTP_EXPIRED");
    }

    const attempts = await redis.incr(
        attemptKey(normalizedEmail)
    );

    if (attempts > MAX_ATTEMPTS) {
        await redis.del(
            otpKey(normalizedEmail),
            attemptKey(normalizedEmail),
            cooldownKey(normalizedEmail)
        );

        throw new Error("OTP_ATTEMPTS_EXCEEDED");
    }

    const providedHash = hashOtp(otp);

    if (providedHash !== storedHash) {
        return false;
    }

    await redis.del(
        otpKey(normalizedEmail),
        attemptKey(normalizedEmail),
        cooldownKey(normalizedEmail)
    );

    return true;
}