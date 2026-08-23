import type { Request, Response, NextFunction } from 'express';
import { verifyToken, validateSession } from '../services/auth.service.js';
import { errorResponse, ErrorCodes } from '../lib/utils.js';
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

/**
 * Resolve whether a request comes from an authenticated admin, without rejecting
 * anonymous callers.
 *
 * For public routes that reveal extra data to admins (e.g. INACTIVE schemes).
 * These previously trusted the mere presence of an Authorization header, so any
 * garbage bearer token was enough to see unpublished content.
 *
 * Returns false — rather than throwing — for missing, malformed, unverifiable or
 * expired credentials, so the caller falls through to the public path.
 */
export async function resolveOptionalAdmin(req: Request): Promise<boolean> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

        const payload = verifyToken(authHeader.split(' ')[1]);
        if (!payload) return false;

        const session = await validateSession(payload.userId);
        return session?.userType === 'ADMIN';
    } catch {
        return false;
    }
}
