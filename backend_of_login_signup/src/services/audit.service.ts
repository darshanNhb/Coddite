import prisma from "../config/prisma.js";

export type AuditEvent =
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "OTP_REQUESTED"
    | "OTP_VERIFICATION_FAILED"
    | "PASSWORD_RESET"
    | "PASSWORD_CHANGED"
    | "SESSION_CREATED"
    | "SESSION_REVOKED"
    | "REFRESH_REUSE_DETECTED"
    | "LOGOUT"
    | "LOGOUT_ALL";

interface AuditData {
    userId?: string;
    event: AuditEvent;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
}

export async function createAuditLog(
    data: AuditData
): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: data.userId,
                event: data.event,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                requestId: data.requestId,
                metadata: data.metadata,
            },
        });
    } catch (error) {
        /*
         * Logging failure must not break authentication.
         */
        console.error("Audit log failed:", error);
    }
}