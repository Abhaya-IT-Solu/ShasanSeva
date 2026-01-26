import type { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { errorResponse, ErrorCodes, logger } from '../lib/utils.js';

/**
 * Validation middleware factory
 */
export function validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details = error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));

                return res.status(400).json(
                    errorResponse({
                        code: ErrorCodes.VALIDATION_ERROR,
                        message: 'Validation failed',
                        details: { errors: details },
                    })
                );
            }
            next(error);
        }
    };
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.query = schema.parse(req.query) as any;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details = error.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));

                return res.status(400).json(
                    errorResponse({
                        code: ErrorCodes.VALIDATION_ERROR,
                        message: 'Invalid query parameters',
                        details: { errors: details },
                    })
                );
            }
            next(error);
        }
    };
}

/**
 * Global error handler
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
    logger.error('Unhandled error', err);

    return res.status(500).json(
        errorResponse({
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
        })
    );
}
