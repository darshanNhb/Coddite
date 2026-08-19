import type { Request } from "express";

export function getRequestContext(req: Request) {
    return {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        requestId: req.res?.locals.requestId,
    };
}