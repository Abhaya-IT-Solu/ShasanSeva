'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <Link href="/" className={styles.logo}>
                       <Image src="/logo/logo_icon.png" alt="Logo" width={200} height={100} />
                    </Link>
                    <span className={styles.badge}>
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                </div>

                <nav className={styles.nav}>
                    <Link href="/admin/dashboard" className={`${styles.navLink} ${styles.active}`}>
                        📊 Dashboard
                    </Link>
                    <Link href="/admin/orders" className={styles.navLink}>
                        📦 Orders
                    </Link>
                    <Link href="/admin/schemes" className={styles.navLink}>
                        📋 Schemes
                    </Link>
                    <Link href="/admin/users" className={styles.navLink}>
                        👥 Users
                    </Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={styles.navLink}>
                            🛡️ Manage Admins
                        </Link>
                    )}
                </nav>

                <div className={styles.sidebarFooter}>
                    <span className={styles.userName}>{user?.name || user?.phone}</span>
                    <button onClick={logout} className="btn btn-secondary btn-full">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={styles.pageHeader}>
                    <h1>Admin Dashboard</h1>
                </header>

                {/* Stats */}
                <div className={styles.stats}>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>0</span>
                        <span className={styles.statLabel}>New Orders</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>0</span>
                        <span className={styles.statLabel}>In Progress</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>0</span>
                        <span className={styles.statLabel}>Completed Today</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>0</span>
                        <span className={styles.statLabel}>Total Users</span>
                    </div>
                </div>

                {/* Recent Orders */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Recent Orders</h2>
                        <Link href="/admin/orders" className="btn btn-secondary">
                            View All
                        </Link>
                    </div>

                    <div className={styles.emptyState}>
                        <p>No orders yet</p>
                    </div>
                </section>

                {/* Quick Actions */}
                <section className={styles.section}>
                    <h2>Quick Actions</h2>
                    <div className={styles.quickActions}>
                        <Link href="/admin/schemes/new" className="btn btn-primary">
                            + Add New Scheme
                        </Link>
                        {isSuperAdmin && (
                            <Link href="/admin/admins/new" className="btn btn-outline">
                                + Add Admin
                            </Link>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
