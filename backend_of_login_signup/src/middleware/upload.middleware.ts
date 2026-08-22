import multer from "multer";
import type { Request } from "express";

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

function fileFilter(
    _req: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
): void {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(null, true);
    } else {
        callback(
            new Error("Only JPEG, PNG, GIF, and WebP images are allowed")
        );
    }
}

export const uploadPhoto = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1,
    },
});
