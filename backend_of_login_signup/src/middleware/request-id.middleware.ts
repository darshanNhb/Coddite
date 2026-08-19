import type {
    NextFunction,
    Request,
    Response,
} from "express";

import { randomUUID } from "crypto";

export function requestId(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const id =
        req.get("X-Request-ID") ??
        randomUUID();

    res.setHeader("X-Request-ID", id);

    res.locals.requestId = id;

    next();
}