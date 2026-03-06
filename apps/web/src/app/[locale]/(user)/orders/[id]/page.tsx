'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './orderDetail.module.css';

interface Document {
    id: string;
    docType: string;
    status: string;
    rejectionReason?: string;
}

interface RequiredDoc {
    type: string;
    label: string;
    required: boolean;
    description?: string;
}

interface Proof {
    id: string;
    orderId: string;
    fileKey: string;
    fileUrl: string;
    proofType: string;
    description: string | null;
    uploadedBy: string;
    uploadedAt: string;
}

const PROOF_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
    'RECEIPT': { icon: 'receipt_long', label: 'Receipt' },
    'SCREENSHOT': { icon: 'screenshot_monitor', label: 'Screenshot' },
    'REFERENCE_ID': { icon: 'tag', label: 'Reference ID' },
    'CONFIRMATION': { icon: 'verified', label: 'Confirmation' },
    'OTHER': { icon: 'attach_file', label: 'Other' },
};

interface Order {
    id: string;
    schemeName: string;
    paymentAmount: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
    completedAt: string | null;
    rejectionReason?: string;
    adminNotes?: string;
    scheme?: {
        name: string;
        slug?: string;
        description?: string;
        requiredDocs?: RequiredDoc[];
    };
}

const STATUS_STEPS = ['PAID', 'IN_PROGRESS', 'DOCUMENTS_VERIFIED', 'COMPLETED'];

const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
        PAID: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
        IN_PROGRESS: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', dot: '#f97316' },
        PROOF_UPLOADED: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6' },
        DOCUMENTS_VERIFIED: { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', dot: '#06b6d4' },
        COMPLETED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', dot: '#16a34a' },
        CANCELLED: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
    };
    return colors[status] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' };
};

export default function OrderDetailPage() {
    const params = useParams();
    const t = useTranslations('OrderPage');
    const tStatus = useTranslations('Statuses');
    const locale = useLocale();

    useAuth();
    const [order, setOrder] = useState<Order | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [proofs, setProofs] = useState<Proof[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [selectedDocType, setSelectedDocType] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [downloadingProof, setDownloadingProof] = useState<string | null>(null);
    const [viewingDoc, setViewingDoc] = useState<string | null>(null);

    const fetchOrderDetails = async () => {
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

    useEffect(() => {
        const fetchProofs = async () => {
            try {
                const response = await api.request(`/api/proofs/order/${params.id}`);
                if (response.success) {
                    setProofs(response.data as Proof[]);
                }
            } catch {
                // Non-critical
            }
        };

        if (params.id) {
            fetchOrderDetails();
            fetchProofs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const handleDownloadProof = async (proofId: string) => {
        setDownloadingProof(proofId);
        try {
            const response = await api.request(`/api/proofs/${proofId}/download-url`);
            if (response.success) {
                const data = response.data as { downloadUrl: string };
                window.open(data.downloadUrl, '_blank');
            }
        } catch { /* silent */ } finally {
            setDownloadingProof(null);
        }
    };

    const handleViewDocument = async (docId: string) => {
        setViewingDoc(docId);
        try {
            const response = await api.request(`/api/documents/${docId}/download-url`);
            if (response.success) {
                const data = response.data as { downloadUrl: string };
                window.open(data.downloadUrl, '_blank');
            }
        } catch {
            // silently ignore — user can retry
        } finally {
            setViewingDoc(null);
        }
    };

    const handleAddDocument = async () => {
        if (!selectedFile || !selectedDocType || !order) return;
        setIsUploadingDoc(true);
        setError('');
        setSuccess('');

        try {
            const urlResponse = await api.request('/api/documents/upload-url', {
                method: 'POST',
                body: {
                    documentType: selectedDocType,
                    contentType: selectedFile.type,
                    orderId: order.id,
                },
            });

            if (!urlResponse.success) throw new Error('Failed to get upload URL');
            const { uploadUrl, documentId } = urlResponse.data as any;

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: selectedFile,
                headers: { 'Content-Type': selectedFile.type },
            });

            if (!uploadResponse.ok) throw new Error('Upload failed');

            if (documentId) {
                await api.request(`/api/documents/${documentId}/confirm-upload`, { method: 'POST' });
            }

            setSuccess(t('documentUploaded') || 'Document uploaded successfully!');
            setSelectedFile(null);
            setSelectedDocType('');
            fetchOrderDetails();
        } catch (err) {
            console.error('Document upload error:', err);
            setError(t('uploadFailed') || 'Failed to upload document. Please try again.');
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleResubmit = async () => {
        if (!order) return;
        setIsResubmitting(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.request(`/api/orders/${order.id}/resubmit`, { method: 'POST' });
            if (response.success) {
                setSuccess(t('resubmitSuccess') || 'Application resubmitted successfully!');
                fetchOrderDetails();
            } else {
                setError(response.error?.message || 'Failed to resubmit');
            }
        } catch (err) {
            console.error('Resubmit error:', err);
            setError(t('resubmitFailed') || 'Failed to resubmit. Please try again.');
        } finally {
            setIsResubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    if (isLoading) {
        return <div className={styles.loading}><div className="spinner" /></div>;
    }

    if (error || !order) {
        return (
            <div className={styles.error}>
                <p>{error}</p>
                <Link href="/orders" className="btn btn-primary">{t('backToOrders')}</Link>
            </div>
        );
    }

    const currentStepIndex = STATUS_STEPS.indexOf(order.status);
    const schemeName = order.scheme?.name || order.schemeName || 'Unknown Scheme';
    const statusColors = getStatusColor(order.status);
    const rejectedDocuments = documents.filter(d => d.status === 'REJECTED');

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Link href="/orders" className={styles.backLink}>
                    <span className="material-icons" style={{ fontSize: 18 }}>arrow_back</span>
                    {t('backToOrders')}
                </Link>

                <div className={styles.headerContent}>
                    <div>
                        <h1 className={styles.pageTitle}>{schemeName}</h1>
                        <div className={styles.orderMeta}>
                            <span className={styles.orderId}>
                                {t('orderNumber')}: <span>#{order.id.slice(-8).toUpperCase()}</span>
                            </span>
                            <span className={styles.metaDot} />
                            <span className={styles.appliedDate}>{t('applied')} {formatDate(order.createdAt)}</span>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <span
                            className={styles.statusBadge}
                            style={{
                                background: statusColors.bg,
                                color: statusColors.text,
                                border: `1px solid ${statusColors.border}`
                            }}
                        >
                            <span className={styles.statusDot} style={{ background: statusColors.dot }} />
                            {tStatus(order.status as any) || order.status.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <section className={styles.timeline}>
                <div className={styles.timelineCard}>
                    <div className={styles.steps}>
                        {STATUS_STEPS.map((step, index) => {
                            const isCompleted = index <= currentStepIndex && order.status !== 'CANCELLED';
                            const isCurrent = order.status === step;
                            const stepClass = `${styles.step} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`;

                            return (
                                <div key={step} className={stepClass}>
                                    <div className={styles.stepDot}>
                                        {isCompleted && !isCurrent ? (
                                            <span className="material-icons" style={{ fontSize: 16 }}>check</span>
                                        ) : isCurrent ? (
                                            <span style={{
                                                width: 10, height: 10,
                                                borderRadius: '50%',
                                                background: '#f97316',
                                                display: 'block'
                                            }} />
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={styles.stepLabel}>
                                        {tStatus(step as any) || step.replace('_', ' ')}
                                    </span>
                                    {isCompleted && order.paidAt && index === 0 && (
                                        <span className={styles.stepDate}>{formatDateTime(order.paidAt)}</span>
                                    )}
                                    {isCompleted && order.createdAt && index === 1 && (
                                        <span className={styles.stepDate}>{formatDateTime(order.createdAt)}</span>
                                    )}
                                    {isCurrent && (
                                        <span className={styles.stepDate}>{t('inProgress') || 'In Progress'}</span>
                                    )}
                                    {isCompleted && order.completedAt && index === 3 && (
                                        <span className={styles.stepDate}>{formatDateTime(order.completedAt)}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {order.status === 'CANCELLED' && (
                        <div className={styles.rejected}>
                            <span className="material-icons" style={{ fontSize: 20, color: '#dc2626' }}>info</span>
                            <div>
                                <h3>{t('applicationRejected')}</h3>
                                {(order.rejectionReason || order.adminNotes) && (
                                    <p>{order.rejectionReason || order.adminNotes}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Detail Cards */}
            <section className={styles.details}>
                {/* Payment Card */}
                <div className={styles.detailCard}>
                    <div>
                        <div className={styles.cardIconBox}>
                            <div className={styles.cardIcon}>
                                <span className="material-icons">payments</span>
                            </div>
                            <h3>{t('payment')}</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.cardRow}>
                                <span className={styles.cardRowLabel}>{t('amountPaid') || 'Amount Paid'}</span>
                                <span className={styles.cardRowValue}>₹{order.paymentAmount
                                }</span>
                            </div>
                            {order.paidAt && (
                                <div className={styles.cardRow}>
                                    <span className={styles.cardRowLabel}>{t('paidOn')}</span>
                                    <span className={styles.cardRowValue}>{formatDate(order.paidAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.cardFooter}>
                        <span className={styles.paymentStatus}>
                            <span className="material-icons" style={{ fontSize: 14, marginRight: 4 }}>check_circle</span>
                            {t('paymentSuccessful') || 'Payment Successful'}
                        </span>
                    </div>
                </div>

                {/* Key Dates Card */}
                <div className={styles.detailCard}>
                    <div>
                        <div className={styles.cardIconBox}>
                            <div className={styles.cardIcon}>
                                <span className="material-icons">event</span>
                            </div>
                            <h3>{t('timeline')}</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.cardRow}>
                                <span className={styles.cardRowLabel}>{t('applied')}</span>
                                <span className={styles.cardRowValue}>{formatDate(order.createdAt)}</span>
                            </div>
                            {order.completedAt && (
                                <div className={styles.cardRow}>
                                    <span className={styles.cardRowLabel}>{t('completed')}</span>
                                    <span className={styles.cardRowValue}>{formatDate(order.completedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={styles.cardFooter}>
                        <span className={styles.cardFooterText}>{t('status') || 'Status'}: <span>{tStatus(order.status as any)}</span></span>
                    </div>
                </div>

                {/* Scheme Summary Card */}
                <div className={styles.detailCard}>
                    <div>
                        <div className={styles.cardIconBox}>
                            <div className={styles.cardIcon}>
                                <span className="material-icons">description</span>
                            </div>
                            <h3>{t('scheme')}</h3>
                        </div>
                        {order.scheme?.description && (
                            <p className={styles.schemeDesc}>
                                {order.scheme.description.length > 140
                                    ? order.scheme.description.substring(0, 140) + '...'
                                    : order.scheme.description}
                            </p>
                        )}
                    </div>
                    {order.scheme?.slug && (
                        <div className={styles.cardFooter}>
                            <Link href={`/schemes/${order.scheme.slug}`} className={styles.schemeLink}>
                                {t('viewScheme') || 'View Scheme Details'}
                                <span className="material-icons" style={{ fontSize: 14 }}>open_in_new</span>
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Documents Table */}
            <section className={styles.documents}>
                <div className={styles.documentsCard}>
                    <div className={styles.documentsHeader}>
                        <h2>{t('documents')}</h2>
                        <span className={styles.docCount}>{documents.length} {documents.length === 1 ? 'File' : 'Files'}</span>
                    </div>

                    {documents.length === 0 ? (
                        <p className={styles.noData}>{t('noDocuments')}</p>
                    ) : (
                        <div className={styles.tableWrapper}>
                            <table className={styles.docTable}>
                                <thead>
                                    <tr>
                                        <th>{t('documentType') || 'Document Type'}</th>
                                        <th>{t('status') || 'Status'}</th>
                                        <th style={{ textAlign: 'right' }}>{t('action') || 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((doc) => (
                                        <tr key={doc.id}>
                                            <td>
                                                <div className={styles.docTypeCell}>
                                                    <div className={`${styles.docFileIcon} ${styles.other}`}>
                                                        <span className="material-icons" style={{ fontSize: 18 }}>insert_drive_file</span>
                                                    </div>
                                                    <div>
                                                        <div className={styles.docTypeName}>{doc.docType}</div>
                                                        {doc.rejectionReason && (
                                                            <div className={styles.docTypeLabel} style={{ color: '#dc2626' }}>
                                                                {doc.rejectionReason}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.docStatus} ${styles[doc.status.toLowerCase()]}`}>
                                                    {doc.status === 'UPLOADED' ? t('uploaded') :
                                                        doc.status === 'VERIFIED' ? t('verified') :
                                                            doc.status === 'REJECTED' ? t('rejected') : doc.status}
                                                </span>
                                            </td>
                                            <td className={styles.docActionCell}>
                                                {doc.status === 'REJECTED' ? (
                                                    <button className={`${styles.docActionBtn} ${styles.reupload}`}>
                                                        <span className="material-icons" style={{ fontSize: 16 }}>upload_file</span>
                                                        {t('reupload') || 'Re-upload'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={styles.docActionBtn}
                                                        onClick={() => handleViewDocument(doc.id)}
                                                        title="View document"
                                                        disabled={viewingDoc === doc.id}
                                                    >
                                                        {viewingDoc === doc.id
                                                            ? <span className="spinner" style={{ width: 16, height: 16, display: 'inline-block' }} />
                                                            : <span className="material-icons" style={{ fontSize: 20 }}>visibility</span>
                                                        }
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Rejection Alert Banner */}
                    {rejectedDocuments.length > 0 && (
                        <div className={styles.rejectionAlert}>
                            <span className="material-icons" style={{ fontSize: 20, color: '#ef4444', flexShrink: 0 }}>info</span>
                            <div>
                                <strong>{t('actionRequired') || 'Action Required'}</strong>
                                <p>
                                    {rejectedDocuments[0].rejectionReason ||
                                        (t('reuploadRejectedDocs') || 'Some documents were rejected. Please re-upload corrected versions.')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Add Document Section */}
            {(order.status === 'PAID' || order.status === 'IN_PROGRESS') && order.scheme?.requiredDocs && order.scheme.requiredDocs.length > 0 && (
                <section className={styles.uploadSection}>
                    <div className={styles.uploadCard}>
                        <h2>
                            <span className="material-icons" style={{ fontSize: 20, verticalAlign: 'text-bottom', marginRight: 6 }}>attach_file</span>
                            {t('addDocument') || 'Add Document'}
                        </h2>
                        <div className={styles.uploadForm}>
                            <select
                                className={styles.docTypeSelect}
                                value={selectedDocType}
                                onChange={(e) => setSelectedDocType(e.target.value)}
                            >
                                <option value="">{t('selectDocType') || 'Select document type...'}</option>
                                {order.scheme.requiredDocs.map((doc) => (
                                    <option key={doc.type} value={doc.type}>
                                        {doc.label}{doc.required ? ' *' : ''}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="file"
                                className={styles.fileInput}
                                accept="image/*,.pdf"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            <button
                                className={styles.uploadBtn}
                                onClick={handleAddDocument}
                                disabled={!selectedFile || !selectedDocType || isUploadingDoc}
                            >
                                <span className="material-icons" style={{ fontSize: 16 }}>
                                    {isUploadingDoc ? 'hourglass_empty' : 'cloud_upload'}
                                </span>
                                {isUploadingDoc ? (t('uploading') || 'Uploading...') : (t('upload') || 'Upload')}
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Resubmit Section */}
            {order.status === 'CANCELLED' && (
                <section className={styles.resubmitSection}>
                    <div className={styles.resubmitCard}>
                        <h2>
                            <span className="material-icons" style={{ fontSize: 20, verticalAlign: 'text-bottom', marginRight: 6 }}>replay</span>
                            {t('resubmitApplication') || 'Resubmit Application'}
                        </h2>

                        {order.adminNotes && (
                            <div className={styles.rejectionNote}>
                                <strong>{t('rejectionReason') || 'Reason'}:</strong>
                                <p>{order.adminNotes}</p>
                            </div>
                        )}

                        {rejectedDocuments.length > 0 && (
                            <div className={styles.rejectedDocs}>
                                <h3>{t('rejectedDocuments') || 'Rejected Documents'}</h3>
                                {rejectedDocuments.map(doc => (
                                    <div key={doc.id} className={styles.docItem}>
                                        <div className={styles.docInfo}>
                                            <div className={styles.docIcon}>
                                                <span className="material-icons" style={{ fontSize: 18 }}>insert_drive_file</span>
                                            </div>
                                            <div>
                                                <span className={styles.docName}>{doc.docType}</span>
                                                {doc.rejectionReason && (
                                                    <span className={styles.rejectionReason}>{doc.rejectionReason}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {order.scheme?.requiredDocs && order.scheme.requiredDocs.length > 0 && (
                            <div className={styles.uploadForm}>
                                <p className={styles.resubmitHint}>
                                    {t('resubmitHint') || 'Upload new or corrected documents before resubmitting.'}
                                </p>
                                <select
                                    className={styles.docTypeSelect}
                                    value={selectedDocType}
                                    onChange={(e) => setSelectedDocType(e.target.value)}
                                >
                                    <option value="">{t('selectDocType') || 'Select document type...'}</option>
                                    {order.scheme.requiredDocs.map((doc) => (
                                        <option key={doc.type} value={doc.type}>
                                            {doc.label}{doc.required ? ' *' : ''}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="file"
                                    className={styles.fileInput}
                                    accept="image/*,.pdf"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <button
                                    className={styles.uploadBtn}
                                    onClick={handleAddDocument}
                                    disabled={!selectedFile || !selectedDocType || isUploadingDoc}
                                >
                                    <span className="material-icons" style={{ fontSize: 16 }}>
                                        {isUploadingDoc ? 'hourglass_empty' : 'cloud_upload'}
                                    </span>
                                    {isUploadingDoc ? 'Uploading...' : (t('uploadDocument') || 'Upload Document')}
                                </button>
                            </div>
                        )}

                        <button
                            className={styles.resubmitBtn}
                            onClick={handleResubmit}
                            disabled={isResubmitting}
                        >
                            <span className="material-icons" style={{ fontSize: 18 }}>
                                {isResubmitting ? 'hourglass_empty' : 'replay'}
                            </span>
                            {isResubmitting ? (t('resubmitting') || 'Resubmitting...') : (t('resubmitApplication') || 'Resubmit Application')}
                        </button>
                    </div>
                </section>
            )}

            {/* Success/Error Messages */}
            {success && <div className={styles.successAlert}>{success}</div>}
            {error && !isLoading && <div className={styles.errorAlert}>{error}</div>}

            {/* Proofs */}
            {proofs.length > 0 && (
                <section className={styles.documents}>
                    <div className={styles.documentsCard}>
                        <div className={styles.documentsHeader}>
                            <h2>
                                <span className="material-icons" style={{ fontSize: 20, verticalAlign: 'text-bottom', marginRight: 6 }}>attach_file</span>
                                {t('proofs') || 'Uploaded Proofs'}
                            </h2>
                            <span className={styles.docCount}>{proofs.length} {proofs.length === 1 ? 'File' : 'Files'}</span>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.docTable}>
                                <thead>
                                    <tr>
                                        <th>{t('proofType') || 'Proof Type'}</th>
                                        <th>{t('description') || 'Description'}</th>
                                        <th style={{ textAlign: 'right' }}>{t('action') || 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proofs.map((proof) => (
                                        <tr key={proof.id}>
                                            <td>
                                                <div className={styles.docTypeCell}>
                                                    <div className={`${styles.docFileIcon} ${styles.other}`}>
                                                        <span className="material-icons" style={{ fontSize: 18 }}>
                                                            {PROOF_TYPE_LABELS[proof.proofType]?.icon || 'attach_file'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className={styles.docTypeName}>
                                                            {PROOF_TYPE_LABELS[proof.proofType]?.label || proof.proofType}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 14, color: '#475569' }}>
                                                    {proof.description || '—'}
                                                </span>
                                            </td>
                                            <td className={styles.docActionCell}>
                                                <button
                                                    className={styles.proofDownloadBtn}
                                                    onClick={() => handleDownloadProof(proof.id)}
                                                    disabled={downloadingProof === proof.id}
                                                >
                                                    <span className="material-icons" style={{ fontSize: 14 }}>
                                                        {downloadingProof === proof.id ? 'hourglass_empty' : 'download'}
                                                    </span>
                                                    {t('download') || 'Download'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* Help Section */}
            <section className={styles.help}>
                <div className={styles.helpCard}>
                    <div className={styles.helpInfo}>
                        <div className={styles.helpIconCircle}>
                            <span className="material-icons" style={{ fontSize: 28 }}>support_agent</span>
                        </div>
                        <div>
                            <h3>{t('needHelp')}</h3>
                            <p>{t('helpDescription') || 'If you are facing issues tracking your status or have queries regarding the document verification process, our support team is here to help.'}</p>
                        </div>
                    </div>
                    <div className={styles.helpActions}>
                        <a href="tel:+919876543210" className={styles.helpCallBtn}>
                            <span className="material-icons" style={{ fontSize: 20, color: '#16a34a' }}>call</span>
                            +91 98765 43210
                        </a>
                        <a href="mailto:support@shasanseva.com" className={styles.helpEmailBtn}>
                            <span className="material-icons" style={{ fontSize: 20 }}>email</span>
                            {t('emailSupport') || 'Email Support'}
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
