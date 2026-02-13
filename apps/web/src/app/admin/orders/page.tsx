'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import Pagination from '@/components/Pagination';
import styles from './orders.module.css';

type OrderStatus = 'PAID' | 'IN_PROGRESS' | 'PROOF_UPLOADED' | 'COMPLETED' | 'CANCELLED';

interface Order {
    id: string;
    userId: string;
    userName: string | null;
    userPhone: string;
    schemeId: string;
    schemeName: string | null;
    paymentAmount: string;
    status: OrderStatus;
    createdAt: string;
    paymentTimestamp: string | null;
    assignedTo: string | null;
}

interface PaginationData {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const STATUS_TABS: { label: string; value: OrderStatus | 'ALL' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Proof Uploaded', value: 'PROOF_UPLOADED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function OrdersPage() {
    const { user, token, isLoading: authLoading } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
    const [updating, setUpdating] = useState<string | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationData>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
    });

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        if (token) {
            fetchOrders(activeTab, 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    // Fetch orders when tab or page changes
    const fetchOrders = async (status: OrderStatus | 'ALL' = activeTab, pageNum: number = page) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (status !== 'ALL') params.append('status', status);
            params.append('page', String(pageNum));
            params.append('limit', '20');

            const res = await fetch(`${API_URL}/api/orders/admin/queue?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setOrders(data.data.data);
                setPagination(data.data.pagination);
                setPage(pageNum);
            } else {
                setError(data.error?.message || 'Failed to load orders');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab: OrderStatus | 'ALL') => {
        setActiveTab(tab);
        fetchOrders(tab, 1); // Reset to page 1 when changing tabs
    };

    const handlePageChange = (newPage: number) => {
        fetchOrders(activeTab, newPage);
    };

    const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
        setUpdating(orderId);
        try {
            const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                fetchOrders(); // Refresh current page
            } else {
                setError(data.error?.message || 'Failed to update status');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setUpdating(null);
        }
    };

    const handleComplete = async (orderId: string) => {
        setUpdating(orderId);
        try {
            const res = await fetch(`${API_URL}/api/orders/${orderId}/complete`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                fetchOrders(); // Refresh current page
            } else {
                setError(data.error?.message || 'Failed to complete order');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setUpdating(null);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatAmount = (amount: string) => {
        return `₹${parseFloat(amount).toLocaleString('en-IN')}`;
    };

    const getStatusClass = (status: OrderStatus) => {
        switch (status) {
            case 'PAID': return styles.statusPaid;
            case 'IN_PROGRESS': return styles.statusProgress;
            case 'PROOF_UPLOADED': return styles.statusProof;
            case 'COMPLETED': return styles.statusComplete;
            case 'CANCELLED': return styles.statusCancelled;
            default: return '';
        }
    };

    if (authLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className="spinner" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <Image src="/logo/logo_icon.png" alt="Logo" width={200} height={100} />
                    </div>
                    <span className={styles.badge}>{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
                </div>
                <nav className={styles.nav}>
                    <Link href="/admin/dashboard" className={styles.navLink}>📊 Dashboard</Link>
                    <Link href="/admin/schemes" className={styles.navLink}>📋 Schemes</Link>
                    <Link href="/admin/orders" className={`${styles.navLink} ${styles.active}`}>📦 Orders</Link>
                    <Link href="/admin/users" className={styles.navLink}>👥 Users</Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={styles.navLink}>🔐 Admins</Link>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1>Orders</h1>
                        <p className={styles.subtitle}>Manage service orders and applications</p>
                    </div>
                </div>

                {/* Status Tabs */}
                <div className={styles.tabs}>
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            className={`${styles.tab} ${activeTab === tab.value ? styles.tabActive : ''}`}
                            onClick={() => handleTabChange(tab.value)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {loading ? (
                    <div className={styles.loading}><div className="spinner" /></div>
                ) : (
                    <>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>User</th>
                                        <th>Scheme</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id}>
                                            <td className={styles.orderId}>
                                                {order.id.slice(0, 8)}...
                                            </td>
                                            <td>
                                                <div className={styles.userCell}>
                                                    <span className={styles.userName}>{order.userName || 'Unknown'}</span>
                                                    <span className={styles.userPhone}>{order.userPhone}</span>
                                                </div>
                                            </td>
                                            <td>{order.schemeName || '-'}</td>
                                            <td className={styles.amount}>{formatAmount(order.paymentAmount)}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>{formatDate(order.createdAt)}</td>
                                            <td className={styles.actions}>
                                                {order.status === 'PAID' && (
                                                    <button
                                                        className={styles.pickupBtn}
                                                        onClick={() => handleStatusUpdate(order.id, 'IN_PROGRESS')}
                                                        disabled={updating === order.id}
                                                    >
                                                        {updating === order.id ? '...' : 'Pick Up'}
                                                    </button>
                                                )}
                                                {order.status === 'PROOF_UPLOADED' && (
                                                    <button
                                                        className={styles.completeBtn}
                                                        onClick={() => handleComplete(order.id)}
                                                        disabled={updating === order.id}
                                                    >
                                                        {updating === order.id ? '...' : 'Complete'}
                                                    </button>
                                                )}
                                                {order.status === 'IN_PROGRESS' && order.assignedTo === user?.userId && (
                                                    <button
                                                        className={styles.progressBtn}
                                                        onClick={() => handleStatusUpdate(order.id, 'PROOF_UPLOADED')}
                                                        disabled={updating === order.id}
                                                    >
                                                        {updating === order.id ? '...' : 'Upload Proof'}
                                                    </button>
                                                )}
                                                {(order.status === 'COMPLETED' || order.status === 'CANCELLED') && (
                                                    <span className={styles.noAction}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {orders.length === 0 && (
                                <div className={styles.empty}>No orders found</div>
                            )}
                        </div>

                        {/* Pagination */}
                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            total={pagination.total}
                            onPageChange={handlePageChange}
                            loading={loading}
                        />
                    </>
                )}
            </main>
        </div>
    );
}
