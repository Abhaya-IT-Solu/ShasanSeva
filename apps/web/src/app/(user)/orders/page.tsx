'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING_PAYMENT: { label: 'Pending Payment', color: 'yellow' },
    PAID: { label: 'Paid', color: 'blue' },
    IN_PROGRESS: { label: 'In Progress', color: 'orange' },
    DOCUMENTS_VERIFIED: { label: 'Verified', color: 'purple' },
    COMPLETED: { label: 'Completed', color: 'green' },
    REJECTED: { label: 'Rejected', color: 'red' },
};

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await api.request('/api/orders');
                if (response.success) {
                    setOrders(response.data as Order[]);
                }
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);

    return (
        <div className={styles.page}>

            {/* Main */}
            <main className={styles.main}>
                <h1>My Applications</h1>

                {isLoading ? (
                    <div className={styles.loading}>
                        <div className="spinner" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📋</span>
                        <p>No applications yet</p>
                        <Link href="/" className="btn btn-primary">
                            Browse Schemes
                        </Link>
                    </div>
                ) : (
                    <div className={styles.ordersList}>
                        {orders.map((order) => {
                            const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: 'gray' };

                            return (
                                <Link key={order.id} href={`/orders/${order.id}`} className={styles.orderCard}>
                                    <div className={styles.orderInfo}>
                                        <h3>{order.schemeName || 'Unknown Scheme'}</h3>
                                        <p className={styles.orderDate}>
                                            Applied on {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={styles.orderMeta}>
                                        <span className={styles.amount}>₹{order.paymentAmount}</span>
                                        <span className={`${styles.status} ${styles[statusInfo.color]}`}>
                                            {statusInfo.label}
                                        </span>
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
