import redis from "../config/redis";

export interface PendingSignup {
    fullName: string;
    username: string;
    email: string;
    mobileNumber?: string;
    passwordHash: string;
}

const SIGNUP_TTL = 5 * 60;

function signupKey(email: string): string {
    return `signup:data:${email.toLowerCase().trim()}`;
}

export async function savePendingSignup(
    data: PendingSignup
): Promise<void> {
    await redis.set(
        signupKey(data.email),
        data,
        {
            ex: SIGNUP_TTL,
        }
    );
}

export async function getPendingSignup(
    email: string
): Promise<PendingSignup | null> {
    return await redis.get<PendingSignup>(
        signupKey(email)
    );
}

export async function deletePendingSignup(
    email: string
): Promise<void> {
    await redis.del(signupKey(email));
}