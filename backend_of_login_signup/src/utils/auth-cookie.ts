import type { Response } from "express";

const REFRESH_COOKIE_NAME = "coddite_refresh";

export function setRefreshTokenCookie(
    res: Response,
    refreshToken: string,
    expiresAt: Date
): void {
    res.cookie(
        REFRESH_COOKIE_NAME,
        refreshToken,
        {
            httpOnly: true,
            secure:
                process.env.NODE_ENV === "production",
            sameSite: "strict",
            expires: expiresAt,
            path: "/api/auth",
        }
    );
}

export function clearRefreshTokenCookie(
    res: Response
): void {
    res.clearCookie(
        REFRESH_COOKIE_NAME,
        {
            httpOnly: true,
            secure:
                process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/api/auth",
        }
    );
}

export { REFRESH_COOKIE_NAME };