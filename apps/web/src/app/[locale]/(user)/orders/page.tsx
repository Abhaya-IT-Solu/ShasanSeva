'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import styles from './orders.module.css';

interface Order {
    id: string;
    schemeName: string | null;
    schemeCategory: string | null;
    paymentAmount: string;
    status: string;
    createdAt: string;
    paymentTimestamp: string | null;
}

export default function OrdersPage() {
    const t = useTranslations('OrdersPage');
    const tStatus = useTranslations('Statuses');
    const locale = useLocale();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const STATUS_COLORS: Record<string, string> = {
        PENDING_PAYMENT: 'yellow',
        PAID: 'blue',
        IN_PROGRESS: 'orange',
        DOCUMENTS_VERIFIED: 'purple',
        COMPLETED: 'green',
        REJECTED: 'red',
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.request('/api/orders');
                if (response.success) {
                    setOrders(response.data as Order[]);
                }
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN');
    };

    return (
        <div className={styles.page}>
            {/* Main */}
            <main className={styles.main}>
                <h1>{t('title')}</h1>

                {isLoading ? (
                    <div className={styles.loading}>
                        <div className="spinner" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📋</span>
                        <p>{t('noOrders')}</p>
                        <Link href="/" className="btn btn-primary">
                            {t('browseSchemes')}
                        </Link>
                    </div>
                ) : (
                    <div className={styles.ordersList}>
                        {orders.map((order) => {
                            const statusColor = STATUS_COLORS[order.status] || 'gray';
                            const statusLabel = tStatus(order.status as any) || order.status;

                            return (
                                <Link key={order.id} href={`/orders/${order.id}`} className={styles.orderCard}>
                                    <div className={styles.orderInfo}>
                                        <h3>{order.schemeName || 'Unknown Scheme'}</h3>
                                        <p className={styles.orderDate}>
                                            {t('appliedOn')} {formatDate(order.createdAt)}
                                        </p>
                                    </div>
                                    <div className={styles.orderMeta}>
                                        <span className={styles.amount}>₹{order.paymentAmount}</span>
                                        <span className={`${styles.status} ${styles[statusColor]}`}>
                                            {statusLabel}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
