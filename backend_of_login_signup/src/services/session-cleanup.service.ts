import prisma from "../config/prisma.js";

const REVOKED_SESSION_RETENTION_DAYS = 30;

export async function cleanupExpiredSessions(): Promise<void> {
    try {
        const now = new Date();

        const revokedCutoff = new Date(
            now.getTime() -
                REVOKED_SESSION_RETENTION_DAYS *
                    24 *
                    60 *
                    60 *
                    1000
        );

        const result = await prisma.session.deleteMany({
            where: {
                OR: [
                    {
                        expiresAt: {
                            lt: now,
                        },
                    },
                    {
                        revokedAt: {
                            not: null,
                            lt: revokedCutoff,
                        },
                    },
                ],
            },
        });

        if (result.count > 0) {
            console.log(
                `Session cleanup: removed ${result.count} sessions`
            );
        }
    } catch (error) {
        console.error("Session cleanup failed:", error);
    }
}