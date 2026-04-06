import app from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/utils.js';
import { sql } from '@shasansetu/db';

const PORT = parseInt(env.API_PORT || '3001', 10);

const server = app.listen(PORT, () => {
    logger.info(`🚀 ShasanSetu API server running on port ${PORT}`);
    logger.info(`📍 Environment: ${env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Web URL: ${env.WEB_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown — close DB connections before exiting
async function shutdown(signal: string) {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        logger.info('HTTP server closed.');
        try {
            await sql.end({ timeout: 5 });
            logger.info('Database connections closed.');
        } catch (err) {
            logger.error('Error closing database connections:', err);
        }
        process.exit(0);
    });
    // Force exit after 10s if graceful shutdown stalls
    setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Prevent silent hangs from unhandled errors
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
});
