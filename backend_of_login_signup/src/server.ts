import "dotenv/config";

import app from "./app.js";
import { startSessionCleanupJob } from "./jobs/session-cleanup.job.js";

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Coddite server running on port ${PORT}`);
});

startSessionCleanupJob();

const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down Coddite...`);

    server.close((error) => {
        if (error) {
            console.error("Error closing HTTP server:", error);
            process.exit(1);
        }

        console.log("HTTP server closed.");
        process.exit(0);
    });
};

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});