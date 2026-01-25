'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import layoutStyles from '../dashboard/dashboard.module.css';
import styles from './admins.module.css';

interface Admin {
    id: string;
    phone: string;
    email: string | null;
    name: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
    isActive: boolean;
    createdAt: string;
}

interface AdminAnalytics {
    totalOrdersHandled: number;
    ordersCompleted: number;
    ordersCancelled: number;
    ordersInProgress: number;
    documentsVerified: number;
    documentsRejected: number;
    avgCompletionTimeHours: number | null;
    lastActiveAt: string | null;
}

export default function AdminsPage() {
    const { user, logout } = useAuth();
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<Record<string, AdminAnalytics>>({});
    const [loadingAnalytics, setLoadingAnalytics] = useState<string | null>(null);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const response = await api.request('/api/admin/admins');
            if (response.success) {
                setAdmins(response.data as Admin[]);
            }
        } catch (error) {
            console.error('Failed to fetch admins:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = async (id: string) => {
        try {
            const response = await api.request(`/api/admin/admins/${id}/toggle-active`, {
                method: 'PATCH',
            });

            if (response.success) {
                setAdmins(admins.map(admin =>
                    admin.id === id ? { ...admin, isActive: !admin.isActive } : admin
                ));
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
            alert('Failed to update status');
        }
    };

    const toggleExpand = async (id: string) => {
        if (expandedAdmin === id) {
            setExpandedAdmin(null);
            return;
        }

        setExpandedAdmin(id);

        if (!analytics[id]) {
            setLoadingAnalytics(id);
            try {
                const response = await api.request(`/api/admin/admins/${id}/analytics`);
                if (response.success) {
                    setAnalytics(prev => ({
                        ...prev,
                        [id]: response.data as AdminAnalytics
                    }));
                }
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoadingAnalytics(null);
            }
        }
    };

    const filteredAdmins = admins.filter(admin =>
        admin.name.toLowerCase().includes(search.toLowerCase()) ||
        admin.phone.includes(search) ||
        (admin.email && admin.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className={layoutStyles.container}>
            {/* Sidebar */}
            <aside className={layoutStyles.sidebar}>
                <div className={layoutStyles.sidebarHeader}>
                    <Link href="/" className={layoutStyles.logo}>
                        <span className={layoutStyles.logoIcon}>🏛️</span>
                        ShasanSetu
                    </Link>
                    <span className={layoutStyles.badge}>
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                </div>

                <nav className={layoutStyles.nav}>
                    <Link href="/admin/dashboard" className={layoutStyles.navLink}>
                        📊 Dashboard
                    </Link>
                    <Link href="/admin/orders" className={layoutStyles.navLink}>
                        📦 Orders
                    </Link>
                    <Link href="/admin/schemes" className={layoutStyles.navLink}>
                        📋 Schemes
                    </Link>
                    <Link href="/admin/users" className={layoutStyles.navLink}>
                        👥 Users
                    </Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={`${layoutStyles.navLink} ${layoutStyles.active}`}>
                            🛡️ Manage Admins
                        </Link>
                    )}
                </nav>

                <div className={layoutStyles.sidebarFooter}>
                    <span className={layoutStyles.userName}>{user?.name || user?.phone}</span>
                    <button onClick={logout} className="btn btn-secondary btn-full">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={layoutStyles.main}>
                <header className={layoutStyles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Manage Admins</h1>
                        <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>Manage administrative access and monitor performance</p>
                    </div>
                    <Link href="/admin/admins/new" className="btn btn-primary">
                        + Add New Admin
                    </Link>
                </header>

                {/* Search */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <input
                        type="text"
                        placeholder="Search by name, phone or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                {isLoading ? (
                    <div className={styles.spinnerWrapper}>
                        <div className={styles.spinner} />
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th className={styles.tableHeadCell}>Name/Contact</th>
                                        <th className={styles.tableHeadCell}>Role</th>
                                        <th className={styles.tableHeadCell}>Status</th>
                                        <th className={styles.tableHeadCell}>Created</th>
                                        <th className={styles.tableHeadCell} style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={styles.tableBody}>
                                    {filteredAdmins.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.emptyState}>
                                                No admins found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAdmins.map((admin) => (
                                            <>
                                                <tr key={admin.id}>
                                                    <td className={styles.tableCell}>
                                                        <div className={styles.userInfo}>
                                                            <button
                                                                onClick={() => toggleExpand(admin.id)}
                                                                className={styles.expandButton}
                                                            >
                                                                {expandedAdmin === admin.id ? '▼' : '▶'}
                                                            </button>
                                                            <div className={styles.userDetails}>
                                                                <div className={styles.userName}>{admin.name}</div>
                                                                <div className={styles.userEmail}>{admin.email}</div>
                                                                <div className={styles.userPhone}>{admin.phone}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={styles.tableCell}>
                                                        <span className={`${styles.badge} ${admin.role === 'SUPER_ADMIN'
                                                            ? styles.badgeSuperAdmin
                                                            : styles.badgeAdmin
                                                            }`}>
                                                            {admin.role.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className={styles.tableCell}>
                                                        <span className={`${styles.badge} ${admin.isActive
                                                            ? styles.badgeActive
                                                            : styles.badgeInactive
                                                            }`}>
                                                            {admin.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className={styles.tableCell} style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>
                                                        {new Date(admin.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className={styles.tableCell} style={{ textAlign: 'right' }}>
                                                        {admin.role !== 'SUPER_ADMIN' && (
                                                            <button
                                                                onClick={() => toggleStatus(admin.id)}
                                                                className={`${styles.actionButton} ${admin.isActive
                                                                    ? styles.btnDeactivate
                                                                    : styles.btnActivate
                                                                    }`}
                                                            >
                                                                {admin.isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Analytics Row */}
                                                {expandedAdmin === admin.id && (
                                                    <tr className={styles.analyticsRow}>
                                                        <td colSpan={5}>
                                                            {loadingAnalytics === admin.id ? (
                                                                <div className={styles.spinnerWrapper} style={{ minHeight: '100px' }}>
                                                                    <div className={styles.spinner} />
                                                                </div>
                                                            ) : analytics[admin.id] ? (
                                                                <div className={styles.analyticsContainer}>
                                                                    <div className={styles.analyticsCard}>
                                                                        <div className={styles.analyticsLabel}>Total Orders</div>
                                                                        <div className={styles.analyticsValue}>{analytics[admin.id].totalOrdersHandled}</div>
                                                                    </div>
                                                                    <div className={styles.analyticsCard}>
                                                                        <div className={styles.analyticsLabel}>Documents Verified</div>
                                                                        <div className={styles.analyticsValue}>{analytics[admin.id].documentsVerified}</div>
                                                                    </div>
                                                                    <div className={styles.analyticsCard}>
                                                                        <div className={styles.analyticsLabel}>Last Active</div>
                                                                        <div className={styles.analyticsValue}>
                                                                            {analytics[admin.id].lastActiveAt
                                                                                ? new Date(analytics[admin.id].lastActiveAt!).toLocaleString()
                                                                                : 'Never'}
                                                                        </div>
                                                                    </div>
                                                                    <div className={styles.analyticsCard}>
                                                                        <div className={styles.analyticsLabel}>Orders In Progress</div>
                                                                        <div className={`${styles.analyticsValue} ${styles.highlight}`}>{analytics[admin.id].ordersInProgress}</div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className={styles.emptyState}>
                                                                    No data available
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
