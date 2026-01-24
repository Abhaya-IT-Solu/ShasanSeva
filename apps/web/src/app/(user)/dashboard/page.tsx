'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './dashboard.module.css';

interface Order {
    id: string;
    schemeName: string;
    status: string;
    createdAt: string;
}

export default function UserDashboard() {
    const { user, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!(e.target as Element).closest(`.${styles.userMenuWrapper}`)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className={styles.page}>
            {/* Header with Avatar */}
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🏛️</span>
                    ShasanSetu
                </Link>

                <div className={styles.userMenuWrapper}>
                    <button
                        className={styles.userMenuBtn}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className={styles.avatar}>
                            {user?.name?.charAt(0).toUpperCase() || '👤'}
                        </div>
                        <span className={styles.userName}>{user?.name || user?.phone}</span>
                        <span className={styles.chevron}>▼</span>
                    </button>

                    {showUserMenu && (
                        <div className={styles.dropdown}>
                            <Link href="/profile" className={styles.dropdownItem}>
                                👤 View Profile
                            </Link>
                            <Link href="/complete-profile" className={styles.dropdownItem}>
                                ✏️ Edit Profile
                            </Link>
                            <div className={styles.dropdownDivider} />
                            <button
                                onClick={logout}
                                className={styles.dropdownItem}
                            >
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

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
