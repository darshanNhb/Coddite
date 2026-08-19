import type { NextFunction, Request, Response } from "express";

import prisma from "../config/prisma.js";
import { verifyAccessToken } from "../utils/jwt.js";

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        sessionId: string;
        role: string;
    };
}

export async function authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authorization = req.get("authorization");

        if (!authorization?.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const token = authorization.substring(7).trim();

        if (!token) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }

        const payload = await verifyAccessToken(token);

        const userId = payload.userId;
        const sessionId = payload.sessionId;

        if (
            typeof userId !== "string" ||
            typeof sessionId !== "string"
        ) {
            res.status(401).json({
                success: false,
                message: "Invalid authentication token",
            });
            return;
        }

        const session = await prisma.session.findUnique({
            where: {
                id: sessionId,
            },
            select: {
                id: true,
                userId: true,
                expiresAt: true,
                revokedAt: true,
                user: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
            },
        });

        if (!session) {
            res.status(401).json({
                success: false,
                message: "Session not found",
            });
            return;
        }

        if (session.revokedAt) {
            res.status(401).json({
                success: false,
                message: "Session has been revoked",
            });
            return;
        }

        if (session.expiresAt <= new Date()) {
            res.status(401).json({
                success: false,
                message: "Session has expired",
            });
            return;
        }

        if (session.user.status !== "ACTIVE") {
            res.status(403).json({
                success: false,
                message: "Account is not active",
            });
            return;
        }

        if (session.userId !== userId) {
            res.status(401).json({
                success: false,
                message: "Invalid authentication session",
            });
            return;
        }

        req.user = {
            id: session.user.id,
            sessionId: session.id,
            role: payload.role as string,
        };

        next();
    } catch (error) {
        console.error("Authentication error:", error);

        res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
}