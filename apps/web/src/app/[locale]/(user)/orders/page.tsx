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

const CATEGORY_ICONS: Record<string, string> = {
    FARMER: 'agriculture',
    STUDENT: 'school',
    HEALTH: 'health_and_safety',
    LOAN: 'account_balance_wallet',
    CERTIFICATE: 'badge',
    WOMEN: 'family_restroom',
    EMPLOYMENT: 'engineering',
    SENIOR: 'commute',
    OTHER: 'bolt',
};

export default function OrdersPage() {
    const t = useTranslations('OrdersPage');
    const tStatus = useTranslations('Statuses');
    const locale = useLocale();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const STATUS_STYLES: Record<string, string> = {
        PENDING_PAYMENT: styles.statusYellow,
        PAID: styles.statusBlue,
        IN_PROGRESS: styles.statusOrange,
        DOCUMENTS_VERIFIED: styles.statusPurple,
        COMPLETED: styles.statusGreen,
        CANCELLED: styles.statusRed,
    };

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.request('/api/orders');
                if (response.success) {
                    const responseData = response.data as { data?: Order[] } | Order[];
                    const ordersData = Array.isArray(responseData) ? responseData : responseData.data || [];
                    setOrders(ordersData);
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
        return new Date(dateStr).toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                {/* Page Header */}
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.pageTitle}>{t('title')}</h1>
                        <p className={styles.pageSubtitle}>{t('subtitle')}</p>
                    </div>
                    <Link href="/schemes" className={styles.newAppBtn}>
                        <span className="material-icons" style={{ fontSize: 18 }}>add_circle</span>
                        New Application
                    </Link>
                </div>

                {/* Orders List */}
                {isLoading ? (
                    <div className={styles.loadingState}>
                        <div className="spinner" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconWrapper}>
                            <span className="material-icons" style={{ fontSize: 48, color: 'var(--color-gray-300)' }}>description</span>
                        </div>
                        <p className={styles.emptyText}>{t('noOrders')}</p>
                        <Link href="/schemes" className={styles.browseSchemesBtn}>
                            {t('browseSchemes')}
                        </Link>
                    </div>
                ) : (
                    <div className={styles.ordersCard}>
                        {orders.map((order, idx) => {
                            const statusStyle = STATUS_STYLES[order.status] || styles.statusGray;
                            const statusLabel = tStatus(order.status as any) || order.status;
                            const icon = CATEGORY_ICONS[order.schemeCategory || ''] || 'description';

                            return (
                                <Link
                                    key={order.id}
                                    href={`/orders/${order.id}`}
                                    className={`${styles.orderItem} ${idx < orders.length - 1 ? styles.orderItemBorder : ''}`}
                                >
                                    <div className={styles.orderTop}>
                                        <div className={styles.orderInfo}>
                                            <div className={styles.orderIcon}>
                                                <span className="material-icons">{icon}</span>
                                            </div>
                                            <div>
                                                <h3 className={styles.orderName}>
                                                    {order.schemeName || 'Unknown Scheme'}
                                                </h3>
                                                <p className={styles.orderDate}>
                                                    {t('appliedOn')} {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={styles.orderRight}>
                                            <span className={styles.orderAmount}>₹{order.paymentAmount}</span>
                                            <span className={`${styles.statusBadge} ${statusStyle}`}>
                                                <span className={styles.statusDot}></span>
                                                {statusLabel}
                                            </span>
                                        </div>
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
