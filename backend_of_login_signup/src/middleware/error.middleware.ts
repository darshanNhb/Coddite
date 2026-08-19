import type {
    NextFunction,
    Request,
    Response,
} from "express";

export function errorHandler(
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error("Unhandled server error:", error);

    if (res.headersSent) {
        return;
    }

    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
}