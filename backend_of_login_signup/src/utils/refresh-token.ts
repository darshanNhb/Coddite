import crypto from "crypto";

export function generateRefreshToken(sessionId: string): string {
    const secret = crypto.randomBytes(64).toString("base64url");

    return `${sessionId}.${secret}`;
}

export function extractSessionId(
    refreshToken: string
): string | null {
    const separatorIndex = refreshToken.indexOf(".");

    if (separatorIndex <= 0) {
        return null;
    }

    return refreshToken.substring(0, separatorIndex);
}

export function hashRefreshToken(
    refreshToken: string
): string {
    return crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");
}