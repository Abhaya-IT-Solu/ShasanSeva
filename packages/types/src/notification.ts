// Notification types shared between API, web, and mobile clients

export interface NotificationItem {
    id: string;
    recipientId: string;
    recipientType: 'USER' | 'ADMIN';
    type: string;
    title: string;
    message: string | null;
    relatedOrderId: string | null;
    read: boolean | null;
    createdAt: string;
}

export interface NotificationListResponse {
    notifications: NotificationItem[];
    unreadCount: number;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
