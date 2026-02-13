'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from '../admin.module.css';

interface DashboardStats {
    newOrders: number;
    inProgress: number;
    completedToday: number;
    totalUsers: number;
}

interface RecentOrder {
    id: string;
    userName: string;
    schemeName: string;
    status: string;
    amount: string;
    createdAt: string;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [stats, setStats] = useState<DashboardStats>({
        newOrders: 0,
        inProgress: 0,
        completedToday: 0,
        totalUsers: 0,
    });
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch orders for stats
            const ordersResponse = await api.request('/api/orders/admin/queue');
            if (ordersResponse.success) {
                // Handle paginated response format
                const responseData = ordersResponse.data as { data?: RecentOrder[] } | RecentOrder[];
                const orders = Array.isArray(responseData) ? responseData : responseData.data || [];

                // Calculate stats from orders
                const today = new Date().toDateString();
                setStats({
                    newOrders: orders.filter((o: RecentOrder) => o.status === 'PAID').length,
                    inProgress: orders.filter((o: RecentOrder) => o.status === 'IN_PROGRESS').length,
                    completedToday: orders.filter((o: RecentOrder) =>
                        o.status === 'COMPLETED' && new Date(o.createdAt).toDateString() === today
                    ).length,
                    totalUsers: 0, // Will be fetched separately if admin API exists
                });

                // Get recent orders (last 5)
                setRecentOrders(orders.slice(0, 5));
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            PAID: '#2563eb',
            IN_PROGRESS: '#f59e0b',
            PROOF_UPLOADED: '#8b5cf6',
            COMPLETED: '#10b981',
            CANCELLED: '#ef4444',
        };
        return (
            <span style={{
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                background: `${statusColors[status] || '#6b7280'}20`,
                color: statusColors[status] || '#6b7280',
            }}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <>
            <header className={styles.pageHeader}>
                <h1>Admin Dashboard</h1>
            </header>

            {/* Stats */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>
                        {isLoading ? '-' : stats.newOrders}
                    </span>
                    <span className={styles.statLabel}>New Orders</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>
                        {isLoading ? '-' : stats.inProgress}
                    </span>
                    <span className={styles.statLabel}>In Progress</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>
                        {isLoading ? '-' : stats.completedToday}
                    </span>
                    <span className={styles.statLabel}>Completed Today</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>
                        {isLoading ? '-' : stats.totalUsers}
                    </span>
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

                {isLoading ? (
                    <div className={styles.emptyState}>
                        <div className="spinner" />
                    </div>
                ) : recentOrders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>No orders yet</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: 'var(--color-gray-500)' }}>User</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: 'var(--color-gray-500)' }}>Scheme</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: 'var(--color-gray-500)' }}>Amount</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: 'var(--color-gray-500)' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', color: 'var(--color-gray-500)' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                        <td style={{ padding: '12px', fontSize: '14px' }}>{order.userName || 'Unknown'}</td>
                                        <td style={{ padding: '12px', fontSize: '14px' }}>{order.schemeName}</td>
                                        <td style={{ padding: '12px', fontSize: '14px' }}>₹{order.amount}</td>
                                        <td style={{ padding: '12px' }}>{getStatusBadge(order.status)}</td>
                                        <td style={{ padding: '12px', fontSize: '14px', color: 'var(--color-gray-500)' }}>
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
        </>
    );
}
