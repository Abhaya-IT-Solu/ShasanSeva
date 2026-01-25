'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import layoutStyles from '../../dashboard/dashboard.module.css';
import styles from './orderDetail.module.css';

interface OrderDocument {
    id: string;
    docType: string;
    status: string;
    rejectionReason?: string;
    uploadedAt: string;
}

interface OrderDetail {
    id: string;
    userId: string;
    schemeId: string;
    status: 'PENDING_PAYMENT' | 'PAID' | 'IN_PROGRESS' | 'PROOF_UPLOADED' | 'COMPLETED' | 'CANCELLED';
    paymentId: string;
    paymentAmount: string;
    paymentTimestamp: string;
    adminNotes?: string;
    assignedTo?: string;
    createdAt: string;
    updatedAt: string;
    scheme: {
        id: string;
        name: string;
        category?: string;
        schemeType?: string;
    } | null;
}

interface OrderResponse {
    order: OrderDetail;
    documents: OrderDocument[];
}

export default function OrderDetailPage() {
    const params = useParams();
    const orderId = params.id as string;
    const { user, logout } = useAuth();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [documents, setDocuments] = useState<OrderDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const response = await api.request(`/api/orders/${orderId}`);
            if (response.success) {
                const data = response.data as OrderResponse;
                setOrder(data.order);
                setDocuments(data.documents);
                setAdminNotes(data.order.adminNotes || '');
            } else {
                setError(response.error?.message || 'Failed to load order');
            }
        } catch (err) {
            console.error('Failed to fetch order:', err);
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    const updateOrderStatus = async (newStatus: string) => {
        setIsUpdating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await api.request(`/api/orders/${orderId}/status`, {
                method: 'PATCH',
                body: {
                    status: newStatus,
                    adminNotes: adminNotes || undefined,
                },
            });

            if (response.success) {
                setSuccess(`Order status updated to ${newStatus}`);
                fetchOrderDetails(); // Refresh data
            } else {
                setError(response.error?.message || 'Failed to update status');
            }
        } catch (err) {
            console.error('Failed to update status:', err);
            setError('Failed to connect to server');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusClass = (status: string) => {
        const statusMap: Record<string, string> = {
            'PAID': styles.statusPaid,
            'IN_PROGRESS': styles.statusInProgress,
            'PROOF_UPLOADED': styles.statusProofUploaded,
            'COMPLETED': styles.statusCompleted,
            'CANCELLED': styles.statusCancelled,
        };
        return statusMap[status] || styles.statusPaid;
    };

    const getDocStatusClass = (status: string) => {
        const statusMap: Record<string, string> = {
            'PENDING': styles.docPending,
            'VERIFIED': styles.docVerified,
            'REJECTED': styles.docRejected,
        };
        return statusMap[status] || styles.docPending;
    };

    // Check if current admin is assigned to this order
    const isAssignedToMe = order?.assignedTo === user?.userId;
    const canPickup = order?.status === 'PAID' && !order?.assignedTo;
    const canProgress = order?.status === 'IN_PROGRESS' && isAssignedToMe;
    const canComplete = order?.status === 'PROOF_UPLOADED' && isAssignedToMe;
    const canCancel = (order?.status === 'PAID' || order?.status === 'IN_PROGRESS') && (isAssignedToMe || !order?.assignedTo || isSuperAdmin);

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
                <Link href="/admin/orders" className={styles.backLink}>
                    ← Back to Orders
                </Link>

                <header className={layoutStyles.pageHeader}>
                    <h1>Order Details</h1>
                    {order && (
                        <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>
                            Order ID: {order.id.slice(0, 8)}...
                        </p>
                    )}
                </header>

                {isLoading ? (
                    <div className={styles.loadingWrapper}>
                        <div className="spinner" />
                    </div>
                ) : error && !order ? (
                    <div className={styles.errorAlert}>{error}</div>
                ) : order ? (
                    <>
                        {error && <div className={styles.errorAlert}>{error}</div>}
                        {success && <div className={styles.successAlert}>{success}</div>}

                        {/* Status & Actions Card */}
                        <div className={styles.actionsCard}>
                            <h2>Order Status & Actions</h2>

                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                <span className={`${styles.statusBadge} ${getStatusClass(order.status)}`}>
                                    {order.status.replace('_', ' ')}
                                </span>
                            </div>

                            {order.assignedTo && (
                                <div className={styles.assignedInfo}>
                                    <strong>Assigned to:</strong> {isAssignedToMe ? 'You' : `Admin ID: ${order.assignedTo.slice(0, 8)}...`}
                                </div>
                            )}

                            <div className={styles.actionButtons}>
                                {canPickup && (
                                    <button
                                        onClick={() => updateOrderStatus('IN_PROGRESS')}
                                        disabled={isUpdating}
                                        className={`${styles.btnAction} ${styles.btnPickup}`}
                                    >
                                        {isUpdating ? 'Processing...' : '📋 Pick Up Order'}
                                    </button>
                                )}

                                {canProgress && (
                                    <button
                                        onClick={() => updateOrderStatus('PROOF_UPLOADED')}
                                        disabled={isUpdating}
                                        className={`${styles.btnAction} ${styles.btnProgress}`}
                                    >
                                        {isUpdating ? 'Processing...' : '📤 Mark Proof Uploaded'}
                                    </button>
                                )}

                                {canComplete && (
                                    <button
                                        onClick={() => updateOrderStatus('COMPLETED')}
                                        disabled={isUpdating}
                                        className={`${styles.btnAction} ${styles.btnComplete}`}
                                    >
                                        {isUpdating ? 'Processing...' : '✅ Mark Complete'}
                                    </button>
                                )}

                                {canCancel && (
                                    <button
                                        onClick={() => updateOrderStatus('CANCELLED')}
                                        disabled={isUpdating}
                                        className={`${styles.btnAction} ${styles.btnCancel}`}
                                    >
                                        {isUpdating ? 'Processing...' : '❌ Cancel Order'}
                                    </button>
                                )}

                                {!canPickup && !canProgress && !canComplete && !canCancel && (
                                    <div className={styles.notAssigned}>
                                        {order.status === 'COMPLETED' || order.status === 'CANCELLED'
                                            ? 'This order is finalized.'
                                            : order.assignedTo && !isAssignedToMe
                                                ? 'This order is assigned to another admin.'
                                                : 'No actions available.'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Info */}
                        <div className={styles.detailCard}>
                            <h2>Order Information</h2>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Order ID</span>
                                    <span className={styles.infoValue}>{order.id}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Scheme</span>
                                    <span className={styles.infoValue}>{order.scheme?.name || 'Unknown'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Category</span>
                                    <span className={styles.infoValue}>{order.scheme?.category || 'N/A'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Payment Amount</span>
                                    <span className={styles.infoValue}>₹{order.paymentAmount}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Payment ID</span>
                                    <span className={styles.infoValue}>{order.paymentId || 'N/A'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Created At</span>
                                    <span className={styles.infoValue}>{new Date(order.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className={styles.detailCard}>
                            <h2>Submitted Documents</h2>
                            {documents.length === 0 ? (
                                <p style={{ color: 'var(--color-gray-500)' }}>No documents submitted.</p>
                            ) : (
                                <table className={styles.documentsTable}>
                                    <thead>
                                        <tr>
                                            <th>Document Type</th>
                                            <th>Status</th>
                                            <th>Uploaded At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((doc) => (
                                            <tr key={doc.id}>
                                                <td>{doc.docType}</td>
                                                <td>
                                                    <span className={`${styles.documentStatus} ${getDocStatusClass(doc.status)}`}>
                                                        {doc.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Admin Notes */}
                        <div className={styles.detailCard}>
                            <h2>Admin Notes</h2>
                            <div className={styles.notesSection}>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Add notes about this order..."
                                    className={styles.notesTextarea}
                                />
                            </div>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}
