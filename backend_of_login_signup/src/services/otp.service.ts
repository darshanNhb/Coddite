import redis from "../config/redis";
import { generateOtp, hashOtp } from "../utils/otp";

const OTP_TTL = 5 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN = 60;

function otpKey(email: string): string {
    return `signup:otp:${email.toLowerCase()}`;
}

function attemptKey(email: string): string {
    return `signup:otp:attempts:${email.toLowerCase()}`;
}

function cooldownKey(email: string): string {
    return `signup:otp:cooldown:${email.toLowerCase()}`;
}

export async function createSignupOtp(email: string) {
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
        { ex: OTP_TTL }
    );

    await redis.set(
        attemptKey(normalizedEmail),
        "0",
        { ex: OTP_TTL }
    );

    await redis.set(
        cooldownKey(normalizedEmail),
        "1",
        { ex: RESEND_COOLDOWN }
    );

    return otp;
}

export async function verifySignupOtp(
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
            attemptKey(normalizedEmail)
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