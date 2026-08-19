import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

const CSRF_COOKIE = "coddite_csrf";

const SAFE_METHODS = new Set([
    "GET",
    "HEAD",
    "OPTIONS",
]);

export function csrfToken(
    _req: Request,
    res: Response,
    next: NextFunction
): void {
    let token = crypto.randomBytes(32).toString("hex");

    res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    });

    next();
}

export function verifyCsrf(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.get("X-CSRF-Token");

    if (
        !cookieToken ||
        !headerToken ||
        cookieToken !== headerToken
    ) {
        res.status(403).json({
            success: false,
            message: "CSRF validation failed",
        });

        return;
    }

    next();
}