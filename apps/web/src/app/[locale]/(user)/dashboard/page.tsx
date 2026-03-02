'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './dashboard.module.css';

interface Order {
    id: string;
    schemeName: string | null;
    status: string;
    createdAt: string;
}

// Quick action cards matching Stitch design (orange icon boxes)
const QUICK_ACTIONS = [
    { key: 'browseSchemes', icon: 'search', href: '/', linkKey: 'explore' },
    { key: 'myApplications', icon: 'description', href: '/orders', linkKey: 'viewStatus' },
    { key: 'myDocuments', icon: 'folder_shared', href: '/profile', linkKey: 'openVault' },
    { key: 'helpSupport', icon: 'help_outline', href: '/schemes', linkKey: 'getHelp' },
];

export default function UserDashboard() {
    const { user } = useAuth();
    const t = useTranslations('DashboardPage');
    const tStatus = useTranslations('Statuses');
    const locale = useLocale();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.request('/api/orders?limit=3');
                if (response.success) {
                    const responseData = response.data as { data?: Order[] } | Order[];
                    const ordersData = Array.isArray(responseData) ? responseData : responseData.data || [];
                    setOrders(ordersData.slice(0, 3));
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

    const getStatusStyle = (status: string) => {
        const map: Record<string, string> = {
            PENDING_PAYMENT: styles.statusYellow,
            PAID: styles.statusBlue,
            IN_PROGRESS: styles.statusOrange,
            DOCUMENTS_VERIFIED: styles.statusPurple,
            COMPLETED: styles.statusGreen,
            CANCELLED: styles.statusRed,
        };
        return map[status] || styles.statusGray;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('goodMorning');
        if (hour < 17) return t('goodAfternoon');
        return t('goodEvening');
    };

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                {/* Hero Welcome Banner */}
                <section className={styles.heroBanner}>
                    <div className={styles.heroBlob1}></div>
                    <div className={styles.heroBlob2}></div>
                    <div className={styles.heroContent}>
                        <div className={styles.heroText}>
                            <h1 className={styles.heroTitle}>
                                {getGreeting()}, {user?.name || t('citizen')}! 👋
                            </h1>
                            <p className={styles.heroSubtitle}>
                                {t('subtitle')}
                            </p>
                        </div>
                        <Link href="/schemes" className={styles.newAppBtn}>
                            <span className="material-icons" style={{ color: 'var(--color-secondary)' }}>add_circle</span>
                            {t('newApplication')}
                        </Link>
                    </div>
                </section>

                {/* Quick Actions */}
                <section>
                    <h2 className={styles.sectionTitle}>
                        <span className={styles.titleBar}></span>
                        {t('quickActions')}
                    </h2>
                    <div className={styles.actionsGrid}>
                        {QUICK_ACTIONS.map((action) => (
                            <Link key={action.key} href={action.href} className={styles.actionCard}>
                                <div className={styles.actionIconBox}>
                                    <span className="material-icons">{action.icon}</span>
                                </div>
                                <h3 className={styles.actionCardTitle}>{t(action.key)}</h3>
                                <p className={styles.actionCardDesc}>{t(`${action.key}Desc`)}</p>
                                <span className={styles.actionCardLink}>
                                    {t(action.linkKey)} <span className="material-icons" style={{ fontSize: 14 }}>arrow_forward</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Recent Applications */}
                <section>
                    <div className={styles.sectionHeaderRow}>
                        <h2 className={styles.sectionTitle}>
                            <span className={`${styles.titleBar} ${styles.greenBar}`}></span>
                            {t('recentApplications')}
                        </h2>
                        <Link href="/orders" className={styles.viewAllLink}>
                            {t('viewAll')}
                        </Link>
                    </div>

                    <div className={styles.applicationsCard}>
                        {isLoading ? (
                            <div className={styles.loadingState}>
                                <div className="spinner" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className={styles.emptyState}>
                                <span className={`material-icons ${styles.emptyIcon}`}>description</span>
                                <p>{t('noApplications')}</p>
                                <Link href="/schemes" className={styles.browseSchemesBtn}>
                                    {t('browseSchemes')}
                                </Link>
                            </div>
                        ) : (
                            orders.map((order, idx) => (
                                <Link
                                    key={order.id}
                                    href={`/orders/${order.id}`}
                                    className={`${styles.applicationItem} ${idx < orders.length - 1 ? styles.applicationItemBorder : ''}`}
                                >
                                    <div className={styles.applicationTop}>
                                        <div className={styles.applicationInfo}>
                                            <div className={styles.applicationIcon}>
                                                <span className="material-icons">badge</span>
                                            </div>
                                            <div>
                                                <h4 className={styles.applicationName}>
                                                    {order.schemeName || 'Unknown Scheme'}
                                                </h4>
                                                <p className={styles.applicationDate}>
                                                    {t('appliedOn')} {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`${styles.statusBadge} ${getStatusStyle(order.status)}`}>
                                            <span className={styles.statusDot}></span>
                                            {tStatus(order.status as any) || order.status}
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
