import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { requestId } from "./middleware/request-id.middleware.js";

import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(helmet());

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.use(
    express.json({
        limit: "10kb",
    })
);

app.use(cookieParser());

app.get("/api/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Coddite API is running",
    });
});

app.use("/api/auth", authRoutes);
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
app.use(errorHandler);


app.use(requestId);

app.use(helmet());

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
    })
);

export default app;