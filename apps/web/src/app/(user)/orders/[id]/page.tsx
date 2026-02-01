'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './orderDetail.module.css';

interface Document {
    id: string;
    documentType: string;
    fileName: string;
    status: string;
    rejectionReason?: string;
}

interface Order {
    id: string;
    schemeName: string;
    amountPaid: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
    completedAt: string | null;
    rejectionReason?: string;
    scheme?: {
        name: string;
        description?: string;
    };
}

const STATUS_STEPS = ['PAID', 'IN_PROGRESS', 'DOCUMENTS_VERIFIED', 'COMPLETED'];

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        PAID: '#2563eb',
        IN_PROGRESS: '#f59e0b',
        PROOF_UPLOADED: '#8b5cf6',
        DOCUMENTS_VERIFIED: '#06b6d4',
        COMPLETED: '#10b981',
        REJECTED: '#ef4444',
    };
    return colors[status] || '#6b7280';
};

export default function OrderDetailPage() {
    const params = useParams();
    useAuth(); // Ensure user is authenticated
    const [order, setOrder] = useState<Order | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const response = await api.request(`/api/orders/${params.id}`);
                if (response.success) {
                    const data = response.data as { order: Order; documents: Document[] };
                    setOrder(data.order);
                    setDocuments(data.documents || []);
                } else {
                    setError('Order not found');
                }
            } catch {
                setError('Failed to load order');
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchOrder();
        }
    }, [params.id]);

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={styles.error}>
                <p>{error}</p>
                <Link href="/orders" className="btn btn-primary">
                    Back to Orders
                </Link>
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.indexOf(order.status);
    const schemeName = order.scheme?.name || order.schemeName || 'Unknown Scheme';

    return (
        <div className={styles.container}>
            {/* Back Link & Header */}
            <div className={styles.header}>
                <Link href="/orders" className={styles.backLink}>
                    ← Back to My Applications
                </Link>
                <h1 className={styles.pageTitle}>{schemeName}</h1>
                <div className={styles.orderMeta}>
                    <span className={styles.orderId}>Order #{order.id.slice(-8).toUpperCase()}</span>
                    <span
                        className={styles.statusBadge}
                        style={{
                            background: `${getStatusColor(order.status)}15`,
                            color: getStatusColor(order.status)
                        }}
                    >
                        {order.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* Timeline */}
            <section className={styles.timeline}>
                <h2>Application Status</h2>
                <div className={styles.steps}>
                    {STATUS_STEPS.map((step, index) => (
                        <div
                            key={step}
                            className={`${styles.step} ${index <= currentStepIndex ? styles.completed : ''
                                } ${order.status === step ? styles.current : ''}`}
                        >
                            <div className={styles.stepDot} />
                            <span className={styles.stepLabel}>
                                {step === 'PAID' ? 'Payment Received' :
                                    step === 'IN_PROGRESS' ? 'Processing' :
                                        step === 'DOCUMENTS_VERIFIED' ? 'Documents Verified' :
                                            'Completed'}
                            </span>
                        </div>
                    ))}
                </div>

                {order.status === 'REJECTED' && (
                    <div className={styles.rejected}>
                        <h3>❌ Application Rejected</h3>
                        {order.rejectionReason && <p>{order.rejectionReason}</p>}
                    </div>
                )}
            </section>

            {/* Details Grid */}
            <section className={styles.details}>
                <div className={styles.detailCard}>
                    <span className={styles.cardIcon}>💰</span>
                    <h3>Payment</h3>
                    <p className={styles.amount}>₹{order.amountPaid}</p>
                    {order.paidAt && (
                        <p className={styles.date}>
                            Paid on {new Date(order.paidAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </p>
                    )}
                </div>

                <div className={styles.detailCard}>
                    <span className={styles.cardIcon}>📅</span>
                    <h3>Timeline</h3>
                    <p>Applied: {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    })}</p>
                    {order.completedAt && (
                        <p>Completed: {new Date(order.completedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}</p>
                    )}
                </div>

                <div className={styles.detailCard}>
                    <span className={styles.cardIcon}>📋</span>
                    <h3>Scheme</h3>
                    <p className={styles.schemeName}>{schemeName}</p>
                    {order.scheme?.description && (
                        <p className={styles.schemeDesc}>{order.scheme.description.substring(0, 100)}...</p>
                    )}
                </div>
            </section>

            {/* Documents */}
            <section className={styles.documents}>
                <h2>Submitted Documents</h2>
                <div className={styles.docsList}>
                    {documents.length === 0 ? (
                        <p className={styles.noData}>No documents uploaded yet</p>
                    ) : (
                        documents.map((doc) => (
                            <div key={doc.id} className={styles.docItem}>
                                <div className={styles.docInfo}>
                                    <span className={styles.docIcon}>📄</span>
                                    <div>
                                        <span className={styles.docName}>{doc.fileName}</span>
                                        <span className={styles.docType}>{doc.documentType}</span>
                                    </div>
                                </div>
                                <span className={`${styles.docStatus} ${styles[doc.status.toLowerCase()]}`}>
                                    {doc.status === 'UPLOADED' ? '📤 Uploaded' :
                                        doc.status === 'VERIFIED' ? '✅ Verified' :
                                            doc.status === 'REJECTED' ? '❌ Rejected' : doc.status}
                                </span>
                                {doc.rejectionReason && (
                                    <span className={styles.rejectionReason}>{doc.rejectionReason}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Help */}
            <section className={styles.help}>
                <div className={styles.helpContent}>
                    <span className={styles.helpIcon}>❓</span>
                    <div>
                        <h3>Need Help?</h3>
                        <p>
                            Contact us at <a href="mailto:support@shasanseva.com">support@shasanseva.com</a> or
                            call <a href="tel:+919876543210">+91 98765 43210</a>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
