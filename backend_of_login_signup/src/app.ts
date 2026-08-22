import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestId } from "./middleware/request-id.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";

const app = express();

// ── Security headers ──
app.use(helmet());

// ── Request ID (must come before routes) ──
app.use(requestId);

// ── CORS (single config using env) ──
app.use(
    cors({
        origin: env.FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-CSRF-Token",
        ],
    })
);

// ── Body parsing ──
app.use(
    express.json({
        limit: "10kb",
    })
);

app.use(cookieParser());

// ── Health check ──
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Coddite API is running",
    });
});

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// ── Error handler (must be last) ──
app.use(errorHandler);

export default app;