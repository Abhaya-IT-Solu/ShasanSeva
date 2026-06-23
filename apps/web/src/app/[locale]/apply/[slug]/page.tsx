'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './apply.module.css';

interface RequiredDoc {
    type: string;
    label: string;
    required: boolean;
    description?: string;
}

interface CustomField {
    id: string;
    type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'phone';
    label: string;
    label_mr?: string;
    required: boolean;
    placeholder?: string;
    placeholder_mr?: string;
    options?: { label: string; label_mr: string; value: string }[];
}

interface Scheme {
    id: string;
    name: string;
    slug: string;
    requiredDocs: RequiredDoc[];
    serviceFee: number;
    customFields?: CustomField[];
}

interface UploadedDoc {
    documentType: string;
    documentId: string;
    fileKey: string;
    fileName: string;
    status: 'uploading' | 'uploaded' | 'error';
}

type Step = 'details' | 'documents' | 'review' | 'payment' | 'success';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function ApplyPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const t = useTranslations('ApplyPage');
    const locale = useLocale();

    const [scheme, setScheme] = useState<Scheme | null>(null);
    const [currentStep, setCurrentStep] = useState<Step>('documents');
    const [applicationFormData, setApplicationFormData] = useState<Record<string, any>>({});
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderId, setOrderId] = useState<string | null>(null);
    const [downloadingReceipt, setDownloadingReceipt] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push(`/${locale}/login?redirect=/apply/${params.slug}`);
        }
    }, [isAuthenticated, router, params.slug, locale]);

    useEffect(() => {
        if (user?.profileData) {
            setApplicationFormData(prev => ({
                ...user.profileData,
                ...prev
            }));
        }
    }, [user]);

    useEffect(() => {
        const fetchScheme = async () => {
            try {
                const response = await fetch(`/api/schemes/${params.slug}?locale=${locale}`);
                const data = await response.json();
                if (data.success) {
                    setScheme(data.data);
                    if (data.data.customFields && data.data.customFields.length > 0) {
                        setCurrentStep('details');
                    }
                } else {
                    setError(t('schemeNotFound'));
                }
            } catch {
                setError(t('loadFailed'));
            } finally {
                setIsLoading(false);
            }
        };
        if (params.slug) fetchScheme();
    }, [params.slug, locale, t]);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []);

    const readFileAsBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the "data:<mime>;base64," prefix from the data URL
            resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleFileUpload = async (docType: string, file: File) => {
        try {
            setUploadedDocs(prev => [
                ...prev.filter(d => d.documentType !== docType),
                { documentType: docType, documentId: '', fileKey: '', fileName: file.name, status: 'uploading' },
            ]);

            const fileData = await readFileAsBase64(file);

            // Proxy through backend to avoid R2 CORS issues with direct browser PUT
            const uploadResponse = await api.request('/api/documents/upload', {
                method: 'POST',
                body: { documentType: docType, contentType: file.type, fileData },
            });
            if (!uploadResponse.success) throw new Error('Upload failed');

            const { documentId, key } = uploadResponse.data as { documentId: string | null; key: string };
            setUploadedDocs(prev =>
                prev.map(d => d.documentType === docType
                    ? { ...d, documentId: documentId || '', fileKey: key, status: 'uploaded' }
                    : d
                )
            );
        } catch (err) {
            console.error('Upload error:', err);
            setUploadedDocs(prev =>
                prev.map(d => d.documentType === docType ? { ...d, status: 'error' } : d)
            );
        }
    };

    const handlePayment = async () => {
        if (!scheme) return;
        try {
            const orderResponse = await api.request('/api/payments/create-order', {
                method: 'POST',
                body: { schemeId: scheme.id, applicationFormData },
            });
            if (!orderResponse.success) throw new Error('Failed to create payment order');
            const { orderId: newOrderId, razorpayOrderId, razorpayKeyId, amount } = orderResponse.data as any;
            setOrderId(newOrderId);
            const options = {
                key: razorpayKeyId,
                amount,
                currency: 'INR',
                name: 'ShasanSeva',
                description: `${t('applicationFor')} ${scheme.name}`,
                order_id: razorpayOrderId,
                handler: async (response: any) => {
                    const docsToLink = uploadedDocs
                        .filter(d => d.status === 'uploaded' && d.fileKey)
                        .map(d => ({ docType: d.documentType, fileKey: d.fileKey }));
                    const verifyResponse = await api.request('/api/payments/verify', {
                        method: 'POST',
                        body: {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            orderId: newOrderId,
                            documents: docsToLink,
                        },
                    });
                    if (verifyResponse.success) {
                        setCurrentStep('success');
                    } else {
                        setError(t('paymentVerifyFailed'));
                    }
                },
                modal: {
                    ondismiss: () => {
                        // Do NOT delete the order here — this would race with the payment handler callback.
                        // The PENDING_PAYMENT order will be reused on the next attempt (idempotency logic in create-order).
                        setCurrentStep('review');
                    },
                },
                prefill: {
                    contact: user?.phone || '',
                    email: user?.email || '',
                },
                theme: { color: '#1B5E20' },
            };
            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (err) {
            console.error('Payment error:', err);
            setError(t('paymentFailed'));
        }
    };

    const handleCancelPayment = async (cancelOrderId?: string) => {
        const idToCancel = cancelOrderId || orderId;
        if (!idToCancel) { setCurrentStep('review'); return; }
        try {
            await api.request(`/api/payments/cancel-order/${idToCancel}`, { method: 'DELETE' });
        } catch { /* ignore */ }
        setOrderId(null);
        setCurrentStep('review');
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
                <p>{t('loading')}</p>
            </div>
        );
    }

    if (error || !scheme) {
        return (
            <div className={styles.error}>
                <h1>{t('error')}</h1>
                <p>{error || t('schemeNotFound')}</p>
                <Link href="/schemes" className="btn btn-primary">{t('browseSchemes')}</Link>
            </div>
        );
    }

    const STEPS = [
        ...(scheme?.customFields && scheme.customFields.length > 0 ? [{ id: 'details', label: t('stepDetails') || 'Details', icon: 'feed' }] : []),
        { id: 'documents', label: t('stepDocuments') || 'Documents', icon: 'description' },
        { id: 'review',    label: t('stepReview')    || 'Review',    icon: 'rate_review' },
        { id: 'payment',   label: t('stepPayment')   || 'Payment',   icon: 'payments' },
        { id: 'success',   label: t('stepDone')      || 'Done',      icon: 'send' },
    ];
    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
    const trackFillWidth = `${(currentStepIndex / (STEPS.length - 1)) * 100}%`;

    const fee = Number(scheme.serviceFee);
    const baseAmount = fee * (100 / 118);
    const appFee = (baseAmount * 0.8).toFixed(2);
    const processingFee = (baseAmount * 0.2).toFixed(2);
    const gst = (fee - baseAmount).toFixed(2);

    return (
        <div className={styles.page}>
            <main className={styles.main}>

                {/* ── Stepper ── */}
                <div className={styles.stepperWrapper}>
                    <div className={styles.stepperTrack}>
                        <div className={styles.stepperTrackBg} />
                        <div className={styles.stepperTrackFill} style={{ width: trackFillWidth }} />

                        {STEPS.map((step, index) => {
                            const isCompleted = index < currentStepIndex;
                            const isActive    = index === currentStepIndex;
                            return (
                                <div key={step.id} className={styles.stepItem}>
                                    <div className={[
                                        styles.stepBubble,
                                        isCompleted ? styles.stepBubbleCompleted : '',
                                        isActive    ? styles.stepBubbleActive    : '',
                                    ].join(' ')}>
                                        {isCompleted
                                            ? <span className="material-icons" style={{ fontSize: 20 }}>check</span>
                                            : <span className="material-icons" style={{ fontSize: 18 }}>{step.icon}</span>
                                        }
                                    </div>
                                    <span className={[
                                        styles.stepLabel,
                                        isCompleted ? styles.stepLabelCompleted : '',
                                        isActive    ? styles.stepLabelActive    : '',
                                    ].join(' ')}>{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Step: Details ── */}
                {currentStep === 'details' && scheme && scheme.customFields && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h1>{t('applicationDetails') || 'Application Details'}</h1>
                            <p>{t('applicationDetailsSubtitle') || 'Please fill in the required information for this scheme.'}</p>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.formGrid}>
                                {scheme.customFields.map(field => (
                                    <div key={field.id} className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            {locale === 'mr' && field.label_mr ? field.label_mr : field.label}
                                            {field.required && <span className={styles.requiredStar}>*</span>}
                                        </label>
                                        {field.type === 'select' ? (
                                            <select
                                                className={styles.formInput}
                                                required={field.required}
                                                value={applicationFormData[field.id] || ''}
                                                onChange={e => setApplicationFormData({...applicationFormData, [field.id]: e.target.value})}
                                            >
                                                <option value="">{t('selectAnOption') || 'Select an option'}</option>
                                                {field.options?.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {locale === 'mr' && opt.label_mr ? opt.label_mr : opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : field.type === 'textarea' ? (
                                            <textarea
                                                className={styles.formTextarea}
                                                required={field.required}
                                                placeholder={locale === 'mr' && field.placeholder_mr ? field.placeholder_mr : field.placeholder}
                                                value={applicationFormData[field.id] || ''}
                                                onChange={e => setApplicationFormData({...applicationFormData, [field.id]: e.target.value})}
                                            />
                                        ) : (
                                            <input
                                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                                                className={styles.formInput}
                                                required={field.required}
                                                placeholder={locale === 'mr' && field.placeholder_mr ? field.placeholder_mr : field.placeholder}
                                                value={applicationFormData[field.id] || ''}
                                                onChange={e => setApplicationFormData({...applicationFormData, [field.id]: e.target.value})}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className={styles.actions}>
                                <Link href={`/schemes/${scheme.slug}`} className={styles.btnBack}>
                                    <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
                                    {t('backToScheme')}
                                </Link>
                                <button 
                                    className={styles.btnPrimary} 
                                    onClick={() => {
                                        // Validate required fields
                                        const missing = scheme.customFields?.filter(f => f.required && !applicationFormData[f.id]);
                                        if (missing && missing.length > 0) {
                                            alert(`Please fill all required fields: ${missing.map(f => f.label).join(', ')}`);
                                            return;
                                        }
                                        setCurrentStep('documents');
                                    }}
                                >
                                    {t('continueToDocuments') || 'Continue to Documents'}
                                    <span className="material-icons" style={{ fontSize: 16 }}>arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: Documents ── */}
                {currentStep === 'documents' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h1>{t('uploadDocuments')}</h1>
                            <p>{t('uploadSubtitle')}</p>
                        </div>
                        <div className={styles.cardBody}>
                            {scheme.requiredDocs && scheme.requiredDocs.length > 0 ? (
                                <div className={styles.docsList}>
                                    {scheme.requiredDocs.map(doc => {
                                        const uploaded = uploadedDocs.find(d => d.documentType === doc.type);
                                        const isUploaded  = uploaded?.status === 'uploaded';
                                        const isUploading = uploaded?.status === 'uploading';
                                        return (
                                            <div key={doc.type} className={[
                                                styles.docItem,
                                                isUploaded  ? styles.uploaded  : '',
                                                isUploading ? styles.uploading : '',
                                            ].join(' ')}>
                                                <div className={[
                                                    styles.docIconWrap,
                                                    isUploaded  ? styles.uploadedIcon  : '',
                                                    isUploading ? styles.uploadingIcon : '',
                                                ].join(' ')}>
                                                    <span className="material-icons">
                                                        {isUploaded ? 'check_circle' : isUploading ? 'hourglass_empty' : 'upload_file'}
                                                    </span>
                                                </div>
                                                <div className={styles.docInfo}>
                                                    <div className={styles.docLabel}>
                                                        {doc.label}
                                                        {doc.required && <span className={styles.badge}>{t('recommended')}</span>}
                                                    </div>
                                                    {doc.description && <div className={styles.docDesc}>{doc.description}</div>}
                                                    {isUploaded  && <div className={`${styles.docStatus} ${styles.statusUploaded}`}>✓ {uploaded?.fileName}</div>}
                                                    {isUploading && <div className={`${styles.docStatus} ${styles.statusUploading}`}>{t('uploading')}</div>}
                                                </div>
                                                <label className={[
                                                    styles.uploadLabel,
                                                    isUploaded  ? styles.uploadedLabel  : '',
                                                    isUploading ? styles.uploadingLabel : '',
                                                ].join(' ')}>
                                                    <span className="material-icons">
                                                        {isUploaded ? 'refresh' : 'upload'}
                                                    </span>
                                                    {isUploading ? t('uploading') : isUploaded ? 'Replace' : t('chooseFile')}
                                                    <input
                                                        type="file"
                                                        style={{ display: 'none' }}
                                                        disabled={isUploading}
                                                        onChange={e => {
                                                            if (e.target.files?.[0]) handleFileUpload(doc.type, e.target.files[0]);
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className={styles.emptyDocs}>
                                    <span className="material-icons">folder_open</span>
                                    <p>No documents required for this scheme.</p>
                                </div>
                            )}

                            <div className={styles.skipNote}>
                                <span className="material-icons">info</span>
                                <p>{t('skipNote')}</p>
                            </div>

                            <div className={styles.actions}>
                                {scheme.customFields && scheme.customFields.length > 0 ? (
                                    <button className={styles.btnBack} onClick={() => setCurrentStep('details')}>
                                        <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
                                        {t('backToDetails') || 'Back'}
                                    </button>
                                ) : (
                                    <Link href={`/schemes/${scheme.slug}`} className={styles.btnBack}>
                                        <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
                                        {t('backToScheme')}
                                    </Link>
                                )}
                                <button className={styles.btnSecondary} onClick={() => setCurrentStep('review')}>
                                    {t('skipForNow')}
                                    <span className="material-icons" style={{ fontSize: 16 }}>arrow_forward</span>
                                </button>
                                <button className={styles.btnPrimary} onClick={() => setCurrentStep('review')}>
                                    {t('continueToReview')}
                                    <span className="material-icons" style={{ fontSize: 16 }}>arrow_forward</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: Review ── */}
                {currentStep === 'review' && (
                    <div className={styles.reviewGrid}>
                        <div className={styles.reviewLeft}>
                            {/* Scheme Info */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardHeaderRow}>
                                        <span className="material-icons">info</span>
                                        <h2>{t('reviewApplication')}</h2>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.infoRow}>
                                        <span className="material-icons">account_balance</span>
                                        <div>
                                            <div className={styles.infoRowLabel}>{t('scheme')}</div>
                                            <div className={styles.infoRowValue}>{scheme.name}</div>
                                        </div>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span className="material-icons">payments</span>
                                        <div>
                                            <div className={styles.infoRowLabel}>{t('serviceFee')}</div>
                                            <div className={styles.feeValue}>₹{scheme.serviceFee}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Application Details */}
                            {scheme.customFields && scheme.customFields.length > 0 && (
                                <div className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardHeaderRow}>
                                            <span className="material-icons">feed</span>
                                            <h2>{t('applicationDetails') || 'Application Details'}</h2>
                                        </div>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.detailsGrid}>
                                            {scheme.customFields.map(field => (
                                                <div key={field.id} className={styles.detailItem}>
                                                    <div className={styles.detailLabel}>{locale === 'mr' && field.label_mr ? field.label_mr : field.label}</div>
                                                    <div className={styles.detailValue}>{applicationFormData[field.id] || '-'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Documents */}
                            <div className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardHeaderRow}>
                                        <span className="material-icons">folder</span>
                                        <h2>{t('uploadedDocuments')}</h2>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    {uploadedDocs.filter(d => d.status === 'uploaded').length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {uploadedDocs.filter(d => d.status === 'uploaded').map(doc => (
                                                <div key={doc.documentType} className={styles.docChip}>
                                                    <span className="material-icons">check_circle</span>
                                                    <div>
                                                        <div className={styles.docChipName}>{doc.documentType.replace('_', ' ')}</div>
                                                        <div className={styles.docChipFile}>{doc.fileName}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={styles.emptyDocChip}>
                                            <span className="material-icons">folder_off</span>
                                            <p style={{ fontWeight: 700, color: '#334155' }}>No documents uploaded.</p>
                                            <p style={{ fontSize: 13, color: '#94a3b8' }}>Our team will contact you for any missing documents.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Summary */}
                        <div>
                            <div className={styles.summaryCard}>
                                <div className={styles.summaryCardHeader}>
                                    <p>Payment Summary</p>
                                </div>
                                <div className={styles.summaryCardBody}>
                                    <div className={styles.summaryFeeRow}>
                                        <span className={styles.summaryFeeLabel}>{t('serviceFee')}</span>
                                        <span className={styles.summaryFeeAmount}>₹{scheme.serviceFee}</span>
                                    </div>
                                    <button className={styles.btnPayNow} onClick={() => { setCurrentStep('payment'); handlePayment(); }}>
                                        {t('proceedToPayment')}
                                        <span className="material-icons">arrow_forward</span>
                                    </button>
                                    <button className={styles.btnGoBack} onClick={() => setCurrentStep('documents')}>
                                        <span className="material-icons">arrow_back</span>
                                        {t('back')}
                                    </button>
                                    <div className={styles.securityNote}>
                                        <span className="material-icons">security</span>
                                        <p>By proceeding, you agree to governmental standards. Secured via Razorpay. <strong>{t('note')}:</strong> {t('disclaimer')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: Payment (processing) ── */}
                {currentStep === 'payment' && (
                    <div className={styles.paymentCenter}>
                        <div className={styles.paymentBox}>
                            <div className={styles.paymentIcon}>
                                <span className="material-icons">refresh</span>
                            </div>
                            <h2>{t('processingPayment')}</h2>
                            <p>{t('paymentInstructions')}</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                                <button className={styles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }} onClick={() => handlePayment()}>
                                    <span className="material-icons">payment</span>
                                    {t('retryPayment')}
                                </button>
                                <button className={styles.btnGoBack} onClick={() => handleCancelPayment()}>
                                    <span className="material-icons">close</span>
                                    {t('cancelAndGoBack') || 'Cancel & Go Back'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: Success ── */}
                {currentStep === 'success' && (
                    <div className={styles.successWrapper}>
                        <div className={styles.successCard}>
                            {/* Success icon */}
                            <div className={styles.successIcon}>
                                <span className="material-icons">task_alt</span>
                            </div>

                            {/* Print / Download buttons */}
                            <div className={styles.successActions}>
                                <button className={styles.btnOutline} onClick={() => window.print()}>
                                    <span className="material-icons">print</span>
                                    {t('printReceipt') || 'Print Receipt'}
                                </button>
                                <button
                                    className={styles.btnFill}
                                    disabled={downloadingReceipt}
                                    onClick={async () => {
                                        if (!orderId) return;
                                        setDownloadingReceipt(true);
                                        try {
                                            const res = await api.request(`/api/orders/${orderId}/receipt`);
                                            if (res.success) {
                                                const data = res.data as { downloadUrl: string };
                                                window.open(data.downloadUrl, '_blank');
                                            }
                                        } catch { /* ignore */ } finally {
                                            setDownloadingReceipt(false);
                                        }
                                    }}
                                >
                                    <span className="material-icons">{downloadingReceipt ? 'hourglass_empty' : 'download'}</span>
                                    {t('downloadForm') || 'Download Form'}
                                </button>
                            </div>

                            <h1 className={styles.successTitle}>{t('applicationSubmitted')}</h1>
                            <p className={styles.successSubtitle}>{t('successMessage')}</p>

                            {/* Order ID */}
                            <div className={styles.orderIdBox}>
                                <div className={styles.orderIdLabel}>{t('orderId')}</div>
                                <div className={styles.orderIdValue}>#{orderId?.slice(0, 10) || 'PENDING'}</div>
                            </div>

                            {/* Payment Receipt */}
                            <div className={styles.receiptWrap}>
                                <div className={styles.receiptHeader}>
                                    <div className={styles.receiptTitle}>
                                        <span className="material-icons">receipt_long</span>
                                        {t('paymentReceiptTitle') || 'Payment Receipt'}
                                    </div>
                                    <span className={styles.paidBadge}>{t('paidBadge') || 'Paid'}</span>
                                </div>
                                <table className={styles.receiptTable}>
                                    <tbody>
                                        <tr>
                                            <td className={styles.receiptKey}>{t('receiptSchemeName') || 'Scheme Name'}</td>
                                            <td className={styles.receiptVal}>{scheme.name}</td>
                                        </tr>
                                        <tr>
                                            <td className={styles.receiptKey}>{t('receiptAppId') || 'Application ID'}</td>
                                            <td className={styles.receiptVal}>{orderId || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td className={styles.receiptKey}>{t('receiptDateTime') || 'Date & Time'}</td>
                                            <td className={styles.receiptVal}>{new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</td>
                                        </tr>
                                        <tr>
                                            <td className={styles.receiptKey}>{t('receiptTxnId') || 'Transaction ID'}</td>
                                            <td className={styles.receiptVal} style={{ fontFamily: 'monospace', fontSize: 12 }}>TXN_{orderId?.slice(-8).toUpperCase() || 'XXXXXXXX'}</td>
                                        </tr>
                                        <tr>
                                            <td className={styles.receiptKey}>{t('receiptAppFee') || 'Application Fee'}</td>
                                            <td className={styles.receiptVal}>₹ {appFee}</td>
                                        </tr>
                                        <tr>
                                            <td className={styles.receiptKey}>{t('receiptProcessingCharge') || 'Processing Charge'}</td>
                                            <td className={styles.receiptVal}>₹ {processingFee}</td>
                                        </tr>
                                        <tr>
                                            <td className={styles.receiptKey}>{t('receiptGst') || 'GST (18%)'}</td>
                                            <td className={styles.receiptVal}>₹ {gst}</td>
                                        </tr>
                                        <tr className={styles.receiptTotalRow}>
                                            <td className={styles.receiptKey}>{t('receiptTotal') || 'Total Amount Paid'}</td>
                                            <td className={styles.receiptVal}>₹ {fee.toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* What's Next */}
                            <div className={styles.whatsNext}>
                                <div className={styles.whatsNextTitle}>
                                    <span className="material-icons">info</span>
                                    {t('whatsNext')}
                                </div>
                                <ul className={styles.whatsNextList}>
                                    <li className={styles.whatsNextItem}>
                                        <div className={styles.whatsNextNum}>1</div>
                                        <p className={styles.whatsNextText}>{t('nextStep1')}</p>
                                    </li>
                                    <li className={styles.whatsNextItem}>
                                        <div className={styles.whatsNextNum}>2</div>
                                        <p className={styles.whatsNextText}>{t('nextStep2')} <strong>3-5 days</strong>.</p>
                                    </li>
                                    <li className={styles.whatsNextItem}>
                                        <div className={styles.whatsNextNum}>3</div>
                                        <p className={styles.whatsNextText}>{t('nextStep3')}</p>
                                    </li>
                                </ul>
                            </div>

                            {/* CTA */}
                            <div className={styles.ctaRow}>
                                <Link href="/orders" className={styles.btnCtaPrimary}>
                                    <span className="material-icons">visibility</span>
                                    {t('viewApplications')}
                                </Link>
                                <Link href="/" className={styles.btnCtaSecondary}>
                                    <span className="material-icons">home</span>
                                    {t('backToHome')}
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
