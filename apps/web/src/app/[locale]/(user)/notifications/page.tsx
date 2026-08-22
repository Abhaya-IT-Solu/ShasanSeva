'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import type { NotificationItem } from '@shasansetu/types';
import Pagination from '@/components/Pagination';
import styles from './notifications.module.css';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
    const t = useTranslations('Notifications');
    const locale = useLocale();
    const router = useRouter();

    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = useCallback(async (targetPage: number) => {
        setIsLoading(true);
        const res = await api.getNotifications(targetPage, PAGE_SIZE);
        if (res.success && res.data) {
            setItems(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
            setTotal(res.data.pagination.total);
            setTotalPages(res.data.pagination.totalPages);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchNotifications(page);
    }, [page, fetchNotifications]);

    const handleItemClick = async (item: NotificationItem) => {
        if (!item.read) {
            setItems(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)));
            setUnreadCount(prev => Math.max(prev - 1, 0));
            api.markNotificationRead(item.id);
        }
        if (item.relatedOrderId) {
            router.push(`/orders/${item.relatedOrderId}`);
        }
    };

    const handleMarkAllRead = async () => {
        setItems(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        api.markAllNotificationsRead();
    };

    const formatTime = (createdAt: string) =>
        new Date(createdAt).toLocaleString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>{t('title')}</h1>
                        {unreadCount > 0 && (
                            <p className={styles.pageSubtitle}>
                                {t('unreadSubtitle', { count: unreadCount })}
                            </p>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                            {t('markAllRead')}
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className={styles.centered}>
                        <div className="spinner" style={{ width: 32, height: 32 }} />
                    </div>
                ) : items.length === 0 ? (
                    <div className={styles.empty}>
                        <span className="material-icons" style={{ fontSize: 48 }}>notifications_none</span>
                        <p>{t('empty')}</p>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {items.map((item) => (
                            <button
                                key={item.id}
                                className={`${styles.item} ${!item.read ? styles.itemUnread : ''}`}
                                onClick={() => handleItemClick(item)}
                            >
                                <div className={styles.itemHeader}>
                                    <span className={styles.itemTitle}>{item.title}</span>
                                    {!item.read && <span className={styles.unreadDot} />}
                                </div>
                                {item.message && (
                                    <p className={styles.itemMessage}>{item.message}</p>
                                )}
                                <span className={styles.itemTime}>{formatTime(item.createdAt)}</span>
                            </button>
                        ))}
                    </div>
                )}

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    onPageChange={setPage}
                    loading={isLoading}
                />
            </main>
        </div>
    );
}
