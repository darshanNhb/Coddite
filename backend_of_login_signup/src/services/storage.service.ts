import cloudinary from "../config/cloudinary.js";
import { env } from "../config/env.js";

interface UploadResult {
    url: string;
    publicId: string;
}

/**
 * Upload a profile photo buffer to Cloudinary.
 */
export async function uploadProfilePhoto(
    buffer: Buffer,
    userId: string
): Promise<UploadResult> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        throw new Error("CLOUDINARY_NOT_CONFIGURED");
    }

    return new Promise<UploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "coddite/avatars",
                public_id: `user_${userId}_${Date.now()}`,
                resource_type: "image",
                transformation: [
                    { width: 400, height: 400, crop: "fill", gravity: "face" },
                    { quality: "auto", fetch_format: "auto" },
                ],
                overwrite: true,
            },
            (error, result) => {
                if (error || !result) {
                    reject(error ?? new Error("Upload failed"));
                    return;
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        uploadStream.end(buffer);
    });
}

/**
 * Delete a profile photo from Cloudinary by its public ID.
 */
export async function deleteProfilePhoto(publicId: string): Promise<void> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Failed to delete Cloudinary asset:", error);
    }
}
