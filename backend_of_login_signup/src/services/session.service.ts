
import crypto from "crypto";

import prisma from "../config/prisma.js";
import {
    generateRefreshToken,
    hashRefreshToken,
} from "../utils/refresh-token.js";

const REFRESH_TOKEN_DAYS = 7;

function hashesMatch(
    incomingHash: string,
    storedHash: string
): boolean {
    const incoming = Buffer.from(incomingHash, "hex");
    const stored = Buffer.from(storedHash, "hex");

    if (incoming.length !== stored.length) {
        return false;
    }

    return crypto.timingSafeEqual(incoming, stored);
}

export async function createSession(data: {
    userId: string;
    userAgent?: string;
    ipAddress?: string;
}) {
    const sessionId = crypto.randomUUID();

    const refreshToken = generateRefreshToken(sessionId);

    const refreshTokenHash = hashRefreshToken(
        refreshToken
    );

    const expiresAt = new Date(
        Date.now() +
            REFRESH_TOKEN_DAYS *
                24 *
                60 *
                60 *
                1000
    );

    const session = await prisma.session.create({
        data: {
            id: sessionId,
            userId: data.userId,
            refreshTokenHash,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            lastUsedAt: new Date(),
            expiresAt,
        },
        select: {
            id: true,
            expiresAt: true,
        },
    });

    return {
        session,
        refreshToken,
    };
}

export async function rotateSession(
    sessionId: string,
    refreshToken: string
) {
    const session = await prisma.session.findUnique({
        where: {
            id: sessionId,
        },
        include: {
            user: true,
        },
    });

    if (!session) {
        throw new Error("SESSION_NOT_FOUND");
    }

    if (session.revokedAt) {
        throw new Error("SESSION_REVOKED");
    }

    if (session.expiresAt <= new Date()) {
        throw new Error("SESSION_EXPIRED");
    }

    const incomingHash = hashRefreshToken(
        refreshToken
    );

    const validToken = hashesMatch(
        incomingHash,
        session.refreshTokenHash
    );

    if (!validToken) {
        await prisma.session.update({
            where: {
                id: session.id,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        throw new Error("REFRESH_TOKEN_REUSE");
    }

    const newRefreshToken =
        generateRefreshToken(session.id);

    const newRefreshTokenHash =
        hashRefreshToken(newRefreshToken);

    const newExpiresAt = new Date(
        Date.now() +
            REFRESH_TOKEN_DAYS *
                24 *
                60 *
                60 *
                1000
    );

    /*
     * Atomic rotation:
     *
     * Only update the session if the stored refresh-token
     * hash is still the same one that we verified above.
     *
     * This prevents two simultaneous refresh requests from
     * both successfully rotating the same refresh token.
     */
    const updated = await prisma.session.updateMany({
        where: {
            id: session.id,
            refreshTokenHash:
                session.refreshTokenHash,
            revokedAt: null,
            expiresAt: {
                gt: new Date(),
            },
        },
        data: {
            refreshTokenHash: newRefreshTokenHash,
            lastUsedAt: new Date(),
            expiresAt: newExpiresAt,
        },
    });

    if (updated.count !== 1) {
        /*
         * Another request may have rotated the token first,
         * or the session may have been revoked/expired.
         *
         * Revoke the session so that the token family cannot
         * continue being used after an abnormal rotation.
         */
        await prisma.session.updateMany({
            where: {
                id: session.id,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        throw new Error("REFRESH_TOKEN_REUSE");
    }

    return {
        session: {
            id: session.id,
            expiresAt: newExpiresAt,
        },
        user: session.user,
        refreshToken: newRefreshToken,
    };
}