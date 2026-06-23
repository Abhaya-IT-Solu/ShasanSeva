import type { Request, Response, NextFunction } from 'express';
import { verifyPortalToken } from '../services/portal.service.js';
import { errorResponse, ErrorCodes } from '../lib/utils.js';

// Extend Express Request with the authenticated portal user
declare global {
    namespace Express {
        interface Request {
            portalUser?: { username: string };
        }
    }
}

/**
 * Portal authentication middleware — verifies a developer-portal JWT.
 * Separate from the user/admin auth so the two token types never cross over.
 */
export function portalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
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
    const payload = verifyPortalToken(token);

    if (!payload) {
        return res.status(401).json(
            errorResponse({
                code: ErrorCodes.UNAUTHORIZED,
                message: 'Invalid or expired token',
            })
        );
    }

    req.portalUser = { username: payload.username };
    next();
}
