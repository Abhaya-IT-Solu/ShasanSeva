import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from '../services/notification.service.js';
import { successResponse, errorResponse, ErrorCodes, logger } from '../lib/utils.js';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const userType = req.user!.userType === 'ADMIN' ? 'ADMIN' : 'USER';
        const limit = parseInt(req.query.limit as string) || 20;

        const notificationsList = await getNotifications(userId, userType, limit);
        const unreadCount = await getUnreadCount(userId, userType);

        return res.json(successResponse({
            notifications: notificationsList,
            unreadCount,
        }));
    } catch (error) {
        logger.error('Failed to fetch notifications', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to fetch notifications',
            })
        );
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const success = await markAsRead(id);

        if (!success) {
            return res.status(500).json(
                errorResponse({
                    code: ErrorCodes.INTERNAL_ERROR,
                    message: 'Failed to mark notification as read',
                })
            );
        }

        return res.json(successResponse({
            notificationId: id,
            read: true,
        }));
    } catch (error) {
        logger.error('Failed to mark notification as read', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to mark notification as read',
            })
        );
    }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const userType = req.user!.userType === 'ADMIN' ? 'ADMIN' : 'USER';

        const success = await markAllAsRead(userId, userType);

        if (!success) {
            return res.status(500).json(
                errorResponse({
                    code: ErrorCodes.INTERNAL_ERROR,
                    message: 'Failed to mark notifications as read',
                })
            );
        }

        return res.json(successResponse({
            message: 'All notifications marked as read',
        }));
    } catch (error) {
        logger.error('Failed to mark all notifications as read', error);
        return res.status(500).json(
            errorResponse({
                code: ErrorCodes.INTERNAL_ERROR,
                message: 'Failed to mark notifications as read',
            })
        );
    }
});

/**
 * GET /api/notifications/stream
 * SSE endpoint for real-time notifications
 */
router.get('/stream', async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const userType = req.user!.userType === 'ADMIN' ? 'ADMIN' : 'USER';

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

    // Polling interval (check every 10 seconds)
    const intervalId = setInterval(async () => {
        try {
            const unreadCount = await getUnreadCount(userId, userType);
            res.write(`data: ${JSON.stringify({ type: 'unread_count', count: unreadCount })}\n\n`);
        } catch (error) {
            logger.error('SSE polling error', error);
        }
    }, 10000);

    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
        logger.info('SSE connection closed', { userId });
    });
});

export default router;
