import { cleanupExpiredSessions } from "../services/session-cleanup.service.js";

const CLEANUP_INTERVAL = 60 * 60 * 1000;

export function startSessionCleanupJob(): void {
    void cleanupExpiredSessions();

    setInterval(() => {
        void cleanupExpiredSessions();
    }, CLEANUP_INTERVAL);
}