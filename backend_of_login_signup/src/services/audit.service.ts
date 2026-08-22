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
    | "LOGOUT_ALL"
    | "PROFILE_UPDATED"
    | "EMAIL_CHANGE_REQUESTED"
    | "EMAIL_CHANGED"
    | "ACCOUNT_DELETE_REQUESTED"
    | "ACCOUNT_DELETED"
    | "SOCIAL_LINK_ADDED"
    | "SOCIAL_LINK_REMOVED"
    | "PROFILE_PHOTO_CHANGED";

interface AuditData {
    userId?: string | undefined;
    event: AuditEvent;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    requestId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}

export async function createAuditLog(
    data: AuditData
): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: data.userId ?? null,
                event: data.event,
                ipAddress: data.ipAddress ?? null,
                userAgent: data.userAgent ?? null,
                requestId: data.requestId ?? null,
                metadata: data.metadata ? (data.metadata as any) : null,
            },
        });
    } catch (error) {
        /*
         * Logging failure must not break authentication.
         */
        console.error("Audit log failed:", error);
    }
}