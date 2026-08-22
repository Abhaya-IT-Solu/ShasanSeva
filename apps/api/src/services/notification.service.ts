import { db, notifications } from '@shasansetu/db';
import { and, eq, desc, count } from 'drizzle-orm';
import { logger } from '../lib/utils.js';

interface CreateNotificationParams {
    recipientId: string;
    recipientType: 'USER' | 'ADMIN';
    type: string;
    title: string;
    message?: string;
    relatedOrderId?: string;
}

/**
 * Create a notification for a user or admin
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
    try {
        await db.insert(notifications).values({
            recipientId: params.recipientId,
            recipientType: params.recipientType,
            type: params.type,
            title: params.title,
            message: params.message || null,
            relatedOrderId: params.relatedOrderId || null,
        });

        logger.info('Notification created', {
            recipientId: params.recipientId,
            type: params.type,
        });
    } catch (error) {
        logger.error('Failed to create notification', error);
        // Don't throw - notifications shouldn't break main flow
    }
}

/**
 * Get notifications for a recipient (paginated)
 */
export async function getNotifications(
    recipientId: string,
    recipientType: 'USER' | 'ADMIN',
    limit = 20,
    offset = 0
) {
    try {
        const result = await db.select()
            .from(notifications)
            .where(
                and(
                    eq(notifications.recipientId, recipientId),
                    eq(notifications.recipientType, recipientType)
                )
            )
            .orderBy(desc(notifications.createdAt))
            .limit(limit)
            .offset(offset);

        return result;
    } catch (error) {
        logger.error('Failed to fetch notifications', error);
        return [];
    }
}

/**
 * Get total notification count for a recipient (for pagination)
 */
export async function getNotificationCount(
    recipientId: string,
    recipientType: 'USER' | 'ADMIN'
): Promise<number> {
    try {
        const result = await db.select({ count: count() })
            .from(notifications)
            .where(
                and(
                    eq(notifications.recipientId, recipientId),
                    eq(notifications.recipientType, recipientType)
                )
            );

        return result[0]?.count || 0;
    } catch (error) {
        logger.error('Failed to count notifications', error);
        return 0;
    }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(
    recipientId: string,
    recipientType: 'USER' | 'ADMIN'
): Promise<number> {
    try {
        const result = await db.select({ count: count() })
            .from(notifications)
            .where(
                and(
                    eq(notifications.recipientId, recipientId),
                    eq(notifications.recipientType, recipientType),
                    eq(notifications.read, false)
                )
            );

        return result[0]?.count || 0;
    } catch (error) {
        logger.error('Failed to count notifications', error);
        return 0;
    }
}

/**
 * Mark a notification as read.
 * The recipient must own the notification — returns 'not_found' otherwise.
 */
export async function markAsRead(
    notificationId: string,
    recipientId: string,
    recipientType: 'USER' | 'ADMIN'
): Promise<'ok' | 'not_found' | 'error'> {
    try {
        const result = await db.update(notifications)
            .set({ read: true })
            .where(
                and(
                    eq(notifications.id, notificationId),
                    eq(notifications.recipientId, recipientId),
                    eq(notifications.recipientType, recipientType)
                )
            )
            .returning({ id: notifications.id });

        return result.length > 0 ? 'ok' : 'not_found';
    } catch (error) {
        logger.error('Failed to mark notification as read', error);
        return 'error';
    }
}

/**
 * Mark all notifications as read for a recipient
 */
export async function markAllAsRead(
    recipientId: string,
    recipientType: 'USER' | 'ADMIN'
): Promise<boolean> {
    try {
        await db.update(notifications)
            .set({ read: true })
            .where(
                and(
                    eq(notifications.recipientId, recipientId),
                    eq(notifications.recipientType, recipientType),
                    eq(notifications.read, false)
                )
            );

        return true;
    } catch (error) {
        logger.error('Failed to mark all notifications as read', error);
        return false;
    }
}
