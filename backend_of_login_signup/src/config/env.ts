import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce.number().int().positive().default(5000),

    DATABASE_URL: z.string().min(1),

    UPSTASH_REDIS_REST_URL: z.string().url(),

    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

    RESEND_API_KEY: z.string().min(1),

    ACCESS_TOKEN_SECRET: z.string().min(64),

    ACCESS_TOKEN_ISSUER: z.string().min(1),

    ACCESS_TOKEN_AUDIENCE: z.string().min(1),

    ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),

    FRONTEND_URL: z.string().url(),

    // Gmail / Nodemailer
    GMAIL_USER: z.string().email(),
    GMAIL_APP_PASSWORD: z.string().min(1),

    // Cloudinary (optional — photo upload will fail gracefully without them)
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
});


const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error("Invalid environment configuration:");
    console.error(result.error.flatten().fieldErrors);

    process.exit(1);
}

export const env = result.data;