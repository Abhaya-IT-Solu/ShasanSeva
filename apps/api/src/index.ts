import app from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/utils.js';
import { sql } from '@shasansetu/db';

const PORT = parseInt(env.API_PORT || '3001', 10);

const server = app.listen(PORT, () => {
    logger.info(`🚀 ShasanSetu API server running on port ${PORT}`);
    logger.info(`📍 Environment: ${env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Web URL: ${env.WEB_URL || 'http://localhost:3000'}`);

    // These are all optional at the schema level, so a missing or empty secret
    // degrades silently rather than failing: uploads land in the wrong bucket,
    // image URLs resolve to null, CORS falls back to localhost. Each of those has
    // already cost real debugging time, so name them explicitly at boot.
    const configWarnings: [unknown, string][] = [
        [env.R2_BUCKET_NAME, 'R2_BUCKET_NAME — uploads and downloads will fail'],
        [env.R2_PUBLIC_URL, 'R2_PUBLIC_URL — every image URL will resolve to null'],
        [env.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID — storage endpoint will be invalid'],
        [env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID — storage auth will fail'],
        [env.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY — storage auth will fail'],
    ];
    const missing = configWarnings.filter(([value]) => !value).map(([, description]) => description);
    if (missing.length > 0) {
        logger.warn(`⚠️  Missing configuration (${missing.length}):`);
        missing.forEach((description) => logger.warn(`      • ${description}`));
    }

    if (env.NODE_ENV === 'production') {
        // Localhost defaults in production mean the secret never made it to the
        // container — CORS and OAuth callbacks will break in confusing ways.
        ([
            ['WEB_URL', env.WEB_URL],
            ['API_URL', env.API_URL],
            ['PORTAL_URL', env.PORTAL_URL],
        ] as const).forEach(([name, value]) => {
            if (value?.includes('localhost')) {
                logger.warn(`⚠️  ${name} is still "${value}" in production — the secret is likely unset`);
            }
        });
    }
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
