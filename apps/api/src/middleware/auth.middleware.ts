import type { Request, Response, NextFunction } from 'express';
import { verifyToken, validateSession } from '../services/auth.service';
import { errorResponse, ErrorCodes } from '../lib/utils';
import type { AuthSession } from '@shasansetu/types';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: AuthSession;
        }
    }
}

/**
 * Authentication middleware - verifies JWT and session
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json(
                errorResponse({
                    code: ErrorCodes.UNAUTHORIZED,
                    message: 'No token provided',
                })
            );
        }

        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);

        if (!payload) {
            return res.status(401).json(
                errorResponse({
                    code: ErrorCodes.UNAUTHORIZED,
                    message: 'Invalid token',
                })
            );
        }

        // Validate session in Redis
        const session = await validateSession(payload.userId);

        if (!session) {
            return res.status(401).json(
                errorResponse({
                    code: ErrorCodes.UNAUTHORIZED,
                    message: 'Session expired. Please login again.',
                })
            );
        }

        // Attach user to request
        req.user = session;
        next();
    } catch (error) {
        return res.status(401).json(
            errorResponse({
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Authentication failed',
            })
        );
    }
}

/**
 * Admin-only middleware - must be used after authMiddleware
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json(
            errorResponse({
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Not authenticated',
            })
        );
    }

    if (req.user.userType !== 'ADMIN') {
        return res.status(403).json(
            errorResponse({
                code: ErrorCodes.FORBIDDEN,
                message: 'Admin access required',
            })
        );
    }

    next();
}

/**
 * Super Admin-only middleware - must be used after authMiddleware
 */
export function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json(
            errorResponse({
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Not authenticated',
            })
        );
    }

    if (req.user.userType !== 'ADMIN' || req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json(
            errorResponse({
                code: ErrorCodes.FORBIDDEN,
                message: 'Super Admin access required',
            })
        );
    }

    next();
}

/**
 * User-only middleware - must be used after authMiddleware
 */
export function userMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json(
            errorResponse({
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Not authenticated',
            })
        );
    }

    if (req.user.userType !== 'USER') {
        return res.status(403).json(
            errorResponse({
                code: ErrorCodes.FORBIDDEN,
                message: 'User access required',
            })
        );
    }

    next();
}
