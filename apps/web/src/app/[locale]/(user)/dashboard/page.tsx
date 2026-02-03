'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import styles from './dashboard.module.css';

interface Order {
    id: string;
    schemeName: string;
    status: string;
    createdAt: string;
}

export default function UserDashboard() {
    const { user } = useAuth();
    const t = useTranslations('DashboardPage');
    const locale = useLocale();
    const [orders, _setOrders] = useState<Order[]>([]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN');
    };

    return (
        <div className={styles.page}>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.welcome}>
                    <h1>{t('welcome')}{user?.name ? `, ${user.name}` : ''}! 👋</h1>
                    <p>{t('subtitle')}</p>
                </div>

                {/* Quick Actions */}
                <div className={styles.actions}>
                    <Link href="/" className={styles.actionCard}>
                        <span className={styles.actionIcon}>📋</span>
                        <h3>{t('browseSchemes')}</h3>
                        <p>{t('browseDescription')}</p>
                    </Link>

                    <Link href="/orders" className={styles.actionCard}>
                        <span className={styles.actionIcon}>📦</span>
                        <h3>{t('myApplications')}</h3>
                        <p>{t('applicationsDescription')}</p>
                    </Link>

                    <Link href="/profile" className={styles.actionCard}>
                        <span className={styles.actionIcon}>📄</span>
                        <h3>{t('myDocuments')}</h3>
                        <p>{t('documentsDescription')}</p>
                    </Link>
                </div>

                {/* Recent Orders */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>{t('myApplications')}</h2>
                        <Link href="/orders" className={styles.viewAll}>
                            {t('viewAll')} →
                        </Link>
                    </div>

                    <div className={styles.ordersList}>
                        {orders.length === 0 ? (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>📋</span>
                                <p>{t('noApplications')}</p>
                                <Link href="/" className="btn btn-primary">
                                    {t('browseSchemes')}
                                </Link>
                            </div>
                        ) : (
                            orders.map((order) => (
                                <Link key={order.id} href={`/orders/${order.id}`} className={styles.orderCard}>
                                    <div className={styles.orderInfo}>
                                        <h4>{order.schemeName}</h4>
                                        <span className={styles.orderDate}>
                                            {formatDate(order.createdAt)}
                                        </span>
                                    </div>
                                    <span className={`${styles.orderStatus} ${styles[order.status.toLowerCase()]}`}>
                                        {order.status}
                                    </span>
                                </Link>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
