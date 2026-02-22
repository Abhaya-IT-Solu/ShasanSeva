'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import layoutStyles from '../../dashboard/dashboard.module.css';
import styles from './orderDetail.module.css';

interface OrderDocument {
    id: string;
    docType: string;
    fileKey: string;
    status: string;
    rejectionReason?: string;
    uploadedAt: string;
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

const PROOF_TYPES = [
    { value: 'RECEIPT', label: '🧾 Receipt' },
    { value: 'SCREENSHOT', label: '📸 Screenshot' },
    { value: 'REFERENCE_ID', label: '🔢 Reference ID' },
    { value: 'CONFIRMATION', label: '✅ Confirmation' },
    { value: 'OTHER', label: '📎 Other' },
];

// const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function OrderDetailPage() {
    const params = useParams();
    const orderId = params.id as string;
    const { user, logout} = useAuth();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [documents, setDocuments] = useState<OrderDocument[]>([]);
    const [proofs, setProofs] = useState<Proof[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
    const [docAction, setDocAction] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);

    // Proof upload state
    const [showProofModal, setShowProofModal] = useState(false);
    const [proofType, setProofType] = useState('RECEIPT');
    const [proofDescription, setProofDescription] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [downloadingProof, setDownloadingProof] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchOrderDetails();
        fetchProofs();
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

    const fetchProofs = async () => {
        try {
            const response = await api.request(`/api/proofs/order/${orderId}`);
            if (response.success) {
                setProofs(response.data as Proof[]);
            }
        } catch (err) {
            console.error('Failed to fetch proofs:', err);
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
                fetchOrderDetails();
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

    const handleDownloadDocument = async (docId: string) => {
        setDownloadingDoc(docId);
        try {
            const response = await api.request(`/api/documents/${docId}/download-url`);
            if (response.success) {
                const data = response.data as { downloadUrl: string };
                window.open(data.downloadUrl, '_blank');
            } else {
                setError(response.error?.message || 'Failed to get download URL');
            }
        } catch (err) {
            console.error('Failed to download:', err);
            setError('Failed to get download URL');
        } finally {
            setDownloadingDoc(null);
        }
    };

    const handleVerifyDocument = async (docId: string) => {
        setDocAction(docId);
        setError(null);
        try {
            const response = await api.request(`/api/documents/${docId}/verify`, {
                method: 'PATCH',
                body: {},
            });
            if (response.success) {
                setSuccess('Document verified successfully');
                fetchOrderDetails();
            } else {
                setError(response.error?.message || 'Failed to verify document');
            }
        } catch (err) {
            console.error('Failed to verify document:', err);
            setError('Failed to verify document');
        } finally {
            setDocAction(null);
        }
    };

    const handleRejectDocument = async (docId: string) => {
        if (!rejectionReason || rejectionReason.length < 5) {
            setError('Rejection reason must be at least 5 characters');
            return;
        }
        setDocAction(docId);
        setError(null);
        try {
            const response = await api.request(`/api/documents/${docId}/reject`, {
                method: 'PATCH',
                body: { rejectionReason },
            });
            if (response.success) {
                setSuccess('Document rejected');
                setRejectingDocId(null);
                setRejectionReason('');
                fetchOrderDetails();
            } else {
                setError(response.error?.message || 'Failed to reject document');
            }
        } catch (err) {
            console.error('Failed to reject document:', err);
            setError('Failed to reject document');
        } finally {
            setDocAction(null);
        }
    };

    // Proof Upload Flow: 3 steps
    // 1. POST /api/proofs/upload-url → get uploadUrl + proofId
    // 2. PUT file to uploadUrl (direct R2 upload)
    // 3. POST /api/proofs/:id/confirm → confirm upload + update order status
    const handleProofUpload = async () => {
        if (!proofFile) {
            setError('Please select a file');
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadProgress('Getting upload URL...');

        try {
            // Step 1: Get upload URL
            const urlResponse = await api.request('/api/proofs/upload-url', {
                method: 'POST',
                body: {
                    orderId,
                    proofType,
                    contentType: proofFile.type,
                    description: proofDescription || undefined,
                },
            });

            if (!urlResponse.success) {
                setError(urlResponse.error?.message || 'Failed to get upload URL');
                setIsUploading(false);
                return;
            }

            const { uploadUrl, proofId } = urlResponse.data as { uploadUrl: string; proofId: string };

            // Step 2: Upload file directly to R2
            setUploadProgress('Uploading file...');
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': proofFile.type },
                body: proofFile,
            });

            if (!uploadRes.ok) {
                throw new Error('File upload failed');
            }

            // Step 3: Confirm the upload
            setUploadProgress('Confirming upload...');
            const confirmResponse = await api.request(`/api/proofs/${proofId}/confirm`, {
                method: 'POST',
                body: {},
            });

            if (confirmResponse.success) {
                setSuccess('Proof uploaded successfully! Order status updated to PROOF_UPLOADED.');
                setShowProofModal(false);
                setProofFile(null);
                setProofType('RECEIPT');
                setProofDescription('');
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchOrderDetails();
                fetchProofs();
            } else {
                setError(confirmResponse.error?.message || 'Failed to confirm upload');
            }
        } catch (err) {
            console.error('Proof upload failed:', err);
            setError('Proof upload failed. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress('');
        }
    };

    const handleDownloadProof = async (proofId: string) => {
        setDownloadingProof(proofId);
        try {
            const response = await api.request(`/api/proofs/${proofId}/download-url`);
            if (response.success) {
                const data = response.data as { downloadUrl: string };
                window.open(data.downloadUrl, '_blank');
            } else {
                setError(response.error?.message || 'Failed to get download URL');
            }
        } catch (err) {
            console.error('Failed to download proof:', err);
            setError('Failed to get proof download URL');
        } finally {
            setDownloadingProof(null);
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
            'UPLOADED': styles.docPending,
            'PENDING': styles.docPending,
            'VERIFIED': styles.docVerified,
            'REJECTED': styles.docRejected,
        };
        return statusMap[status] || styles.docPending;
    };

    const isAssignedToMe = order?.assignedTo === user?.userId;
    const canPickup = order?.status === 'PAID' && !order?.assignedTo;
    const canUploadProof = order?.status === 'IN_PROGRESS' && isAssignedToMe;
    const canComplete = (order?.status === 'PROOF_UPLOADED' || order?.status === 'IN_PROGRESS') && isAssignedToMe;
    const canCancel = (order?.status === 'PAID' || order?.status === 'IN_PROGRESS') && (isAssignedToMe || !order?.assignedTo || isSuperAdmin);

    return (
        <div className={layoutStyles.container}>
            {/* Sidebar */}
            <aside className={layoutStyles.sidebar}>
                <div className={layoutStyles.sidebarHeader}>
                    <Link href="/" className={layoutStyles.logo}>
                        <Image src="/logo/logo_icon.png" alt="Logo" width={200} height={100} />
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

                                {canUploadProof && (
                                    <button
                                        onClick={() => setShowProofModal(true)}
                                        className={`${styles.btnAction} ${styles.btnProgress}`}
                                    >
                                        📤 Upload Proof
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

                                {!canPickup && !canUploadProof && !canComplete && !canCancel && (
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

                        {/* Documents with Download & Actions */}
                        <div className={styles.detailCard}>
                            <h2>📄 Submitted Documents</h2>
                            {documents.length === 0 ? (
                                <p style={{ color: 'var(--color-gray-500)' }}>No documents submitted.</p>
                            ) : (
                                <table className={styles.documentsTable}>
                                    <thead>
                                        <tr>
                                            <th>Document Type</th>
                                            <th>Status</th>
                                            <th>Uploaded At</th>
                                            <th>Download</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((doc) => (
                                            <tr key={doc.id}>
                                                <td>{doc.docType}</td>
                                                <td>
                                                    <span className={`${styles.documentStatus} ${getDocStatusClass(doc.status)}`}>
                                                        {doc.status === 'UPLOADED' ? '📤 Uploaded' :
                                                            doc.status === 'VERIFIED' ? '✅ Verified' :
                                                                doc.status === 'REJECTED' ? '❌ Rejected' : doc.status}
                                                    </span>
                                                    {doc.status === 'REJECTED' && doc.rejectionReason && (
                                                        <div className={styles.rejectionNote}>
                                                            Reason: {doc.rejectionReason}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>{new Date(doc.uploadedAt).toLocaleString()}</td>
                                                <td>
                                                    <button
                                                        className={styles.downloadBtn}
                                                        onClick={() => handleDownloadDocument(doc.id)}
                                                        disabled={downloadingDoc === doc.id}
                                                    >
                                                        {downloadingDoc === doc.id ? '⏳' : '⬇️ Download'}
                                                    </button>
                                                </td>
                                                <td>
                                                    {doc.status === 'UPLOADED' && (
                                                        <div className={styles.docActions}>
                                                            <button
                                                                className={styles.verifyBtn}
                                                                onClick={() => handleVerifyDocument(doc.id)}
                                                                disabled={docAction === doc.id}
                                                            >
                                                                {docAction === doc.id ? '...' : '✅ Verify'}
                                                            </button>
                                                            {rejectingDocId === doc.id ? (
                                                                <div className={styles.rejectForm}>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Rejection reason (min 5 chars)..."
                                                                        value={rejectionReason}
                                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                                        className={styles.rejectInput}
                                                                    />
                                                                    <div className={styles.rejectFormActions}>
                                                                        <button
                                                                            className={styles.rejectConfirmBtn}
                                                                            onClick={() => handleRejectDocument(doc.id)}
                                                                            disabled={docAction === doc.id}
                                                                        >
                                                                            Confirm Reject
                                                                        </button>
                                                                        <button
                                                                            className={styles.rejectCancelBtn}
                                                                            onClick={() => { setRejectingDocId(null); setRejectionReason(''); }}
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    className={styles.rejectBtn}
                                                                    onClick={() => setRejectingDocId(doc.id)}
                                                                >
                                                                    ❌ Reject
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {doc.status !== 'UPLOADED' && (
                                                        <span className={styles.noDocAction}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Uploaded Proofs */}
                        <div className={styles.detailCard}>
                            <h2>📎 Uploaded Proofs</h2>
                            {proofs.length === 0 ? (
                                <p style={{ color: 'var(--color-gray-500)' }}>No proofs uploaded yet.</p>
                            ) : (
                                <div className={styles.proofsGrid}>
                                    {proofs.map((proof) => (
                                        <div key={proof.id} className={styles.proofCard}>
                                            <div className={styles.proofHeader}>
                                                <span className={styles.proofType}>
                                                    {PROOF_TYPES.find(pt => pt.value === proof.proofType)?.label || proof.proofType}
                                                </span>
                                                <span className={styles.proofDate}>
                                                    {new Date(proof.uploadedAt).toLocaleString()}
                                                </span>
                                            </div>
                                            {proof.description && (
                                                <p className={styles.proofDescription}>{proof.description}</p>
                                            )}
                                            <button
                                                className={styles.downloadBtn}
                                                onClick={() => handleDownloadProof(proof.id)}
                                                disabled={downloadingProof === proof.id}
                                            >
                                                {downloadingProof === proof.id ? '⏳ Loading...' : '⬇️ Download Proof'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
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

                        {/* Proof Upload Modal */}
                        {showProofModal && (
                            <div className={styles.modalOverlay} onClick={() => !isUploading && setShowProofModal(false)}>
                                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                                    <div className={styles.modalHeader}>
                                        <h3>📤 Upload Proof</h3>
                                        <button
                                            className={styles.modalClose}
                                            onClick={() => !isUploading && setShowProofModal(false)}
                                            disabled={isUploading}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className={styles.modalBody}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Proof Type</label>
                                            <select
                                                value={proofType}
                                                onChange={(e) => setProofType(e.target.value)}
                                                className={styles.formSelect}
                                                disabled={isUploading}
                                            >
                                                {PROOF_TYPES.map(pt => (
                                                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Description (optional)</label>
                                            <input
                                                type="text"
                                                value={proofDescription}
                                                onChange={(e) => setProofDescription(e.target.value)}
                                                placeholder="Brief description of the proof..."
                                                className={styles.formInput}
                                                disabled={isUploading}
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>File</label>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                                className={styles.formFileInput}
                                                disabled={isUploading}
                                            />
                                            <p className={styles.formHint}>
                                                Accepted: JPEG, PNG, WebP, PDF (max 10MB)
                                            </p>
                                        </div>

                                        {uploadProgress && (
                                            <div className={styles.uploadProgressBar}>
                                                <div className={styles.progressSpinner} />
                                                <span>{uploadProgress}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.modalFooter}>
                                        <button
                                            className={styles.rejectCancelBtn}
                                            onClick={() => setShowProofModal(false)}
                                            disabled={isUploading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className={`${styles.btnAction} ${styles.btnProgress}`}
                                            onClick={handleProofUpload}
                                            disabled={isUploading || !proofFile}
                                        >
                                            {isUploading ? 'Uploading...' : '📤 Upload Proof'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </main>
        </div>
    );
}
