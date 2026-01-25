import { db, notifications } from '@shasansetu/db';
import { and, eq, desc } from 'drizzle-orm';
import { logger } from '../lib/utils';

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
 * Get notifications for a recipient
 */
export async function getNotifications(
    recipientId: string,
    recipientType: 'USER' | 'ADMIN',
    limit = 20
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
            .limit(limit);

        return result;
    } catch (error) {
        logger.error('Failed to fetch notifications', error);
        return [];
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
        const result = await db.select()
            .from(notifications)
            .where(
                and(
                    eq(notifications.recipientId, recipientId),
                    eq(notifications.recipientType, recipientType),
                    eq(notifications.read, false)
                )
            );

        return result.length;
    } catch (error) {
        logger.error('Failed to count notifications', error);
        return 0;
    }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
    try {
        await db.update(notifications)
            .set({ read: true })
            .where(eq(notifications.id, notificationId));

        return true;
    } catch (error) {
        logger.error('Failed to mark notification as read', error);
        return false;
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

// Notification type constants
export const NotificationTypes = {
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',
    DOCUMENT_REJECTED: 'DOCUMENT_REJECTED',
    PROOF_UPLOADED: 'PROOF_UPLOADED',
    ORDER_COMPLETED: 'ORDER_COMPLETED',
    NEW_ORDER_ASSIGNED: 'NEW_ORDER_ASSIGNED',
} as const;
