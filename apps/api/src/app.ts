import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middleware/validation.middleware';
import { apiRateLimiter } from './middleware/rateLimit.middleware';
import { env } from './config/env';
import { logger } from './lib/utils';

const app = express();

// Security middleware
app.use(helmet());

// CORS - Allow frontend
app.use(cors({
    origin: env.WEB_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
    next();
});

// Global rate limiting
app.use('/api', apiRateLimiter);

// API routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        },
    });
});

// Global error handler
app.use(errorHandler);

export default app;
