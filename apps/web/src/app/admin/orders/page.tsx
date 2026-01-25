'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import layoutStyles from '../dashboard/dashboard.module.css';
import styles from './orders.module.css';

interface AdminOrder {
    id: string;
    userId: string;
    userName: string | null;
    userPhone: string | null;
    schemeId: string;
    schemeName: string | null;
    paymentAmount: number;
    status: 'PENDING_PAYMENT' | 'PAID' | 'IN_PROGRESS' | 'PROOF_UPLOADED' | 'COMPLETED' | 'CANCELLED';
    createdAt: string;
    paymentTimestamp: string | null;
    assignedTo: string | null;
}

export default function AdminOrdersPage() {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const queryParams = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            const response = await api.request(`/api/orders/admin/queue${queryParams}`);
            if (response.success) {
                setOrders(response.data as AdminOrder[]);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredOrders = orders.filter(order =>
        (order.userName && order.userName.toLowerCase().includes(search.toLowerCase())) ||
        (order.userPhone && order.userPhone.includes(search)) ||
        (order.schemeName && order.schemeName.toLowerCase().includes(search.toLowerCase()))
    );

    const getStatusBadgeClass = (status: string) => {
        const statusMap: Record<string, string> = {
            'PENDING_PAYMENT': styles.statusPendingPayment,
            'PAID': styles.statusPaid,
            'IN_PROGRESS': styles.statusInProgress,
            'PROOF_UPLOADED': styles.statusProofUploaded,
            'COMPLETED': styles.statusCompleted,
            'CANCELLED': styles.statusCancelled,
        };
        return statusMap[status] || styles.statusPendingPayment;
    };

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
                    <Link href="/admin/orders" className={`${layoutStyles.navLink} ${layoutStyles.active}`}>
                        📦 Orders
                    </Link>
                    <Link href="/admin/schemes" className={layoutStyles.navLink}>
                        📋 Schemes
                    </Link>
                    <Link href="/admin/users" className={layoutStyles.navLink}>
                        👥 Users
                    </Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={layoutStyles.navLink}>
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
                <header className={layoutStyles.pageHeader}>
                    <h1>Order Management</h1>
                    <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>Track and process scheme application orders</p>
                </header>

                {/* Status Tabs */}
                <div className={styles.tabsContainer}>
                    {['all', 'PAID', 'IN_PROGRESS', 'PROOF_UPLOADED', 'COMPLETED', 'CANCELLED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`${styles.tab} ${statusFilter === status
                                ? styles.tabActive
                                : styles.tabInactive
                                }`}
                        >
                            {status === 'all' ? 'All Orders' : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <input
                        type="text"
                        placeholder="Search by user, phone or scheme..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                <div className={styles.tableContainer}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th className={styles.tableHeadCell}>Order ID / Date</th>
                                    <th className={styles.tableHeadCell}>User Details</th>
                                    <th className={styles.tableHeadCell}>Scheme</th>
                                    <th className={styles.tableHeadCell}>Internal Status</th>
                                    <th className={styles.tableHeadCell}>Amount</th>
                                    <th className={styles.tableHeadCell} style={{ textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className={styles.emptyState}>
                                            <div className={styles.spinner} />
                                            <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--text-sm)' }}>Loading orders...</div>
                                        </td>
                                    </tr>
                                ) : filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className={styles.emptyState}>
                                            No orders found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order, index) => (
                                        <tr key={order.id}>
                                            <td className={styles.tableCell}>
                                                <div className={styles.orderId}>
                                                    #{index + 1} · {order.id.slice(0, 8)}
                                                </div>
                                                <div className={styles.orderDate}>
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <div className={styles.userName}>{order.userName || 'Unknown'}</div>
                                                <div className={styles.userPhone}>{order.userPhone}</div>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <div className={styles.schemeName} title={order.schemeName || ''}>
                                                    {order.schemeName || 'Unknown Scheme'}
                                                </div>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <span className={styles.amount}>
                                                    ₹{order.paymentAmount}
                                                </span>
                                            </td>
                                            <td className={styles.tableCell} style={{ textAlign: 'right' }}>
                                                <Link
                                                    href={`/admin/orders/${order.id}`}
                                                    className={styles.viewLink}
                                                >
                                                    View Details
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
