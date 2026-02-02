'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './order.module.css';

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
    const t = useTranslations('OrderPage');
    const tStatus = useTranslations('Statuses');
    const locale = useLocale();

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
                    setError(t('notFound'));
                }
            } catch {
                setError(t('loadError'));
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchOrder();
        }
    }, [params.id, t]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

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
                    {t('backToOrders')}
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
                    ← {t('backToOrders')}
                </Link>
                <h1 className={styles.pageTitle}>{schemeName}</h1>
                <div className={styles.orderMeta}>
                    <span className={styles.orderId}>{t('orderNumber')} #{order.id.slice(-8).toUpperCase()}</span>
                    <span
                        className={styles.statusBadge}
                        style={{
                            background: `${getStatusColor(order.status)}15`,
                            color: getStatusColor(order.status)
                        }}
                    >
                        {tStatus(order.status as any) || order.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* Timeline */}
            <section className={styles.timeline}>
                <h2>{t('applicationStatus')}</h2>
                <div className={styles.steps}>
                    {STATUS_STEPS.map((step, index) => (
                        <div
                            key={step}
                            className={`${styles.step} ${index <= currentStepIndex ? styles.completed : ''
                                } ${order.status === step ? styles.current : ''}`}
                        >
                            <div className={styles.stepDot} />
                            <span className={styles.stepLabel}>
                                {tStatus(step as any) || step.replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                </div>

                {order.status === 'REJECTED' && (
                    <div className={styles.rejected}>
                        <h3>❌ {t('applicationRejected')}</h3>
                        {order.rejectionReason && <p>{order.rejectionReason}</p>}
                    </div>
                )}
            </section>

            {/* Details Grid */}
            <section className={styles.details}>
                <div className={styles.detailCard}>
                    <span className={styles.cardIcon}>💰</span>
                    <h3>{t('payment')}</h3>
                    <p className={styles.amount}>₹{order.amountPaid}</p>
                    {order.paidAt && (
                        <p className={styles.date}>
                            {t('paidOn')} {formatDate(order.paidAt)}
                        </p>
                    )}
                </div>

                <div className={styles.detailCard}>
                    <span className={styles.cardIcon}>📅</span>
                    <h3>{t('timeline')}</h3>
                    <p>{t('applied')}: {formatDate(order.createdAt)}</p>
                    {order.completedAt && (
                        <p>{t('completed')}: {formatDate(order.completedAt)}</p>
                    )}
                </div>

                <div className={styles.detailCard}>
                    <span className={styles.cardIcon}>📋</span>
                    <h3>{t('scheme')}</h3>
                    <p className={styles.schemeName}>{schemeName}</p>
                    {order.scheme?.description && (
                        <p className={styles.schemeDesc}>{order.scheme.description.substring(0, 100)}...</p>
                    )}
                </div>
            </section>

            {/* Documents */}
            <section className={styles.documents}>
                <h2>{t('documents')}</h2>
                <div className={styles.docsList}>
                    {documents.length === 0 ? (
                        <p className={styles.noData}>{t('noDocuments')}</p>
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
                                    {doc.status === 'UPLOADED' ? `📤 ${t('uploaded')}` :
                                        doc.status === 'VERIFIED' ? `✅ ${t('verified')}` :
                                            doc.status === 'REJECTED' ? `❌ ${t('rejected')}` : doc.status}
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
                        <h3>{t('needHelp')}</h3>
                        <p>
                            {t('contactUs')} <a href="mailto:support@shasanseva.com">support@shasanseva.com</a> {t('or')}
                            {' '}<a href="tel:+919876543210">+91 98765 43210</a>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
