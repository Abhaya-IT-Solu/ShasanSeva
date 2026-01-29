'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    const [orders, _setOrders] = useState<Order[]>([]);
    const [_isLoading, _setIsLoading] = useState(true);

    return (
        <div className={styles.page}>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.welcome}>
                    <h1>Welcome{user?.name ? `, ${user.name}` : ''}! 👋</h1>
                    <p>Browse schemes and track your applications</p>
                </div>

                {/* Quick Actions */}
                <div className={styles.actions}>
                    <Link href="/" className={styles.actionCard}>
                        <span className={styles.actionIcon}>📋</span>
                        <h3>Browse Schemes</h3>
                        <p>Explore available schemes</p>
                    </Link>

                    <Link href="/orders" className={styles.actionCard}>
                        <span className={styles.actionIcon}>📦</span>
                        <h3>My Applications</h3>
                        <p>Track your orders</p>
                    </Link>

                    <Link href="/profile" className={styles.actionCard}>
                        <span className={styles.actionIcon}>📄</span>
                        <h3>My Documents</h3>
                        <p>Saved documents</p>
                    </Link>
                </div>

                {/* Recent Orders */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>My Applications</h2>
                        <Link href="/orders" className={styles.viewAll}>
                            View All →
                        </Link>
                    </div>

                    <div className={styles.ordersList}>
                        {orders.length === 0 ? (
                            <div className={styles.emptyState}>
                                <span className={styles.emptyIcon}>📋</span>
                                <p>No applications yet</p>
                                <Link href="/" className="btn btn-primary">
                                    Browse Schemes
                                </Link>
                            </div>
                        ) : (
                            orders.map((order) => (
                                <Link key={order.id} href={`/orders/${order.id}`} className={styles.orderCard}>
                                    <div className={styles.orderInfo}>
                                        <h4>{order.schemeName}</h4>
                                        <span className={styles.orderDate}>
                                            {new Date(order.createdAt).toLocaleDateString()}
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
