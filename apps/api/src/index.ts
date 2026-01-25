import app from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/utils.js';

const PORT = parseInt(env.API_PORT || '3001', 10);

app.listen(PORT, () => {
    logger.info(`🚀 ShasanSetu API server running on port ${PORT}`);
    logger.info(`📍 Environment: ${env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Web URL: ${env.WEB_URL || 'http://localhost:3000'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});
