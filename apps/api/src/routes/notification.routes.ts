import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
    getNotifications,
    getNotificationCount,
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
 * Get user's notifications (paginated via ?page=&limit=; response keys are
 * backward compatible — `pagination` is additive for older clients)
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const userType = req.user!.userType === 'ADMIN' ? 'ADMIN' : 'USER';
        const page = Math.max(parseInt(req.query.page as string) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
        const offset = (page - 1) * limit;

        const [notificationsList, unreadCount, total] = await Promise.all([
            getNotifications(userId, userType, limit, offset),
            getUnreadCount(userId, userType),
            getNotificationCount(userId, userType),
        ]);

        return res.json(successResponse({
            notifications: notificationsList,
            unreadCount,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
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
        const userId = req.user!.userId;
        const userType = req.user!.userType === 'ADMIN' ? 'ADMIN' : 'USER';

        // Ownership is enforced in the WHERE clause — a notification belonging
        // to another recipient is indistinguishable from a missing one (404)
        const result = await markAsRead(id, userId, userType);

        if (result === 'not_found') {
            return res.status(404).json(
                errorResponse({
                    code: ErrorCodes.NOT_FOUND,
                    message: 'Notification not found',
                })
            );
        }

        if (result === 'error') {
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
