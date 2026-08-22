'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import type { NotificationItem } from '@shasansetu/types';
import styles from './NotificationBell.module.css';

const POLL_INTERVAL_MS = 60000;

export function NotificationBell() {
    const t = useTranslations('Notifications');
    const locale = useLocale();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        const res = await api.getNotifications(1, 10);
        if (res.success && res.data) {
            setItems(res.data.notifications);
            setUnreadCount(res.data.unreadCount);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    // Close on outside click (same pattern as the Header user menu)
    useEffect(() => {
        if (!open) return;
        const handleClick = () => setOpen(false);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [open]);

    const toggleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!open) fetchNotifications();
        setOpen(!open);
    };

    const handleItemClick = async (item: NotificationItem) => {
        setOpen(false);
        if (!item.read) {
            // Optimistic update; the poll will correct any failure
            setItems(prev => prev.map(n => (n.id === item.id ? { ...n, read: true } : n)));
            setUnreadCount(prev => Math.max(prev - 1, 0));
            api.markNotificationRead(item.id);
        }
        if (item.relatedOrderId) {
            router.push(`/orders/${item.relatedOrderId}`);
        }
    };

    const handleMarkAllRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setItems(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        api.markAllNotificationsRead();
    };

    const formatTime = (createdAt: string) =>
        new Date(createdAt).toLocaleString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
        });

    return (
        <div className={styles.wrapper}>
            <button
                className={styles.bellBtn}
                onClick={toggleOpen}
                aria-label={t('title')}
            >
                <span className="material-icons" style={{ fontSize: 22 }}>notifications</span>
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.dropdownHeader}>
                        <span className={styles.dropdownTitle}>{t('title')}</span>
                        {unreadCount > 0 && (
                            <button className={styles.markAllBtn} onClick={handleMarkAllRead}>
                                {t('markAllRead')}
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {items.length === 0 ? (
                            <div className={styles.empty}>{t('empty')}</div>
                        ) : (
                            items.map((item) => (
                                <button
                                    key={item.id}
                                    className={`${styles.item} ${!item.read ? styles.itemUnread : ''}`}
                                    onClick={() => handleItemClick(item)}
                                >
                                    <div className={styles.itemTitleRow}>
                                        <span className={styles.itemTitle}>{item.title}</span>
                                        {!item.read && <span className={styles.unreadDot} />}
                                    </div>
                                    {item.message && (
                                        <span className={styles.itemMessage}>{item.message}</span>
                                    )}
                                    <span className={styles.itemTime}>{formatTime(item.createdAt)}</span>
                                </button>
                            ))
                        )}
                    </div>

                    <Link
                        href="/notifications"
                        className={styles.viewAll}
                        onClick={() => setOpen(false)}
                    >
                        {t('viewAll')}
                    </Link>
                </div>
            )}
        </div>
    );
}
