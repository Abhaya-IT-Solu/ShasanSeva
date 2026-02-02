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

interface Scheme {
    id: string;
    name: string;
    slug: string;
    requiredDocs: RequiredDoc[];
    serviceFee: string;
}

interface UploadedDoc {
    documentType: string;
    documentId: string;
    fileName: string;
    status: 'uploading' | 'uploaded' | 'error';
}

type Step = 'documents' | 'review' | 'payment' | 'success';

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
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderId, setOrderId] = useState<string | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push(`/${locale}/login?redirect=/apply/${params.slug}`);
        }
    }, [isAuthenticated, router, params.slug, locale]);

    // Fetch scheme details
    useEffect(() => {
        const fetchScheme = async () => {
            try {
                const response = await fetch(`/api/schemes/${params.slug}?locale=${locale}`);
                const data = await response.json();
                if (data.success) {
                    setScheme(data.data);
                } else {
                    setError(t('schemeNotFound'));
                }
            } catch {
                setError(t('loadFailed'));
            } finally {
                setIsLoading(false);
            }
        };

        if (params.slug) {
            fetchScheme();
        }
    }, [params.slug, locale, t]);

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Handle file upload
    const handleFileUpload = async (docType: string, file: File) => {
        try {
            // Update state to show uploading
            setUploadedDocs(prev => [
                ...prev.filter(d => d.documentType !== docType),
                { documentType: docType, documentId: '', fileName: file.name, status: 'uploading' },
            ]);

            // Get signed upload URL
            const urlResponse = await api.request('/api/documents/upload-url', {
                method: 'POST',
                body: {
                    documentType: docType,
                    contentType: file.type,
                },
            });

            if (!urlResponse.success) {
                throw new Error('Failed to get upload URL');
            }

            const { uploadUrl, documentId } = urlResponse.data as any;

            // Upload file directly to R2
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error('Upload failed');
            }

            // Confirm upload
            await api.request(`/api/documents/${documentId}/confirm-upload`, {
                method: 'POST',
            });

            // Update state
            setUploadedDocs(prev =>
                prev.map(d =>
                    d.documentType === docType
                        ? { ...d, documentId, status: 'uploaded' }
                        : d
                )
            );
        } catch (error) {
            console.error('Upload error:', error);
            setUploadedDocs(prev =>
                prev.map(d =>
                    d.documentType === docType
                        ? { ...d, status: 'error' }
                        : d
                )
            );
        }
    };

    // Handle payment
    const handlePayment = async () => {
        if (!scheme) return;

        try {
            // Create payment order
            const orderResponse = await api.request('/api/payments/create-order', {
                method: 'POST',
                body: { schemeId: scheme.id },
            });

            if (!orderResponse.success) {
                throw new Error('Failed to create payment order');
            }

            const { orderId: newOrderId, razorpayOrderId, razorpayKeyId, amount } = orderResponse.data as any;
            setOrderId(newOrderId);

            // Open Razorpay checkout
            const options = {
                key: razorpayKeyId,
                amount,
                currency: 'INR',
                name: 'ShasanSetu',
                description: `${t('applicationFor')} ${scheme.name}`,
                order_id: razorpayOrderId,
                handler: async (response: any) => {
                    // Verify payment
                    const verifyResponse = await api.request('/api/payments/verify', {
                        method: 'POST',
                        body: {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            orderId: newOrderId,
                        },
                    });

                    if (verifyResponse.success) {
                        setCurrentStep('success');
                    } else {
                        setError(t('paymentVerifyFailed'));
                    }
                },
                prefill: {
                    contact: user?.phone || '',
                    email: user?.email || '',
                },
                theme: {
                    color: '#2563eb',
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error('Payment error:', error);
            setError(t('paymentFailed'));
        }
    };

    const getStepLabel = (step: string) => {
        switch (step) {
            case 'documents': return t('stepDocuments');
            case 'review': return t('stepReview');
            case 'payment': return t('stepPayment');
            case 'success': return t('stepDone');
            default: return step;
        }
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
                <Link href="/schemes" className="btn btn-primary">
                    {t('browseSchemes')}
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href={`/schemes/${scheme.slug}`} className={styles.backLink}>
                    ← {t('backToScheme')}
                </Link>
                <h1>{t('applyFor')} {scheme.name}</h1>
            </header>

            {/* Progress Steps */}
            <div className={styles.progress}>
                {['documents', 'review', 'payment', 'success'].map((step, index) => (
                    <div
                        key={step}
                        className={`${styles.step} ${currentStep === step ? styles.active : ''
                            } ${['documents', 'review', 'payment', 'success'].indexOf(currentStep) > index
                                ? styles.completed
                                : ''
                            }`}
                    >
                        <span className={styles.stepNumber}>{index + 1}</span>
                        <span className={styles.stepLabel}>{getStepLabel(step)}</span>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <main className={styles.main}>
                {currentStep === 'documents' && (
                    <div className={styles.documentsStep}>
                        <h2>{t('uploadDocuments')}</h2>
                        <p className={styles.subtitle}>{t('uploadSubtitle')}</p>

                        <div className={styles.skipNote}>
                            💡 {t('skipNote')}
                        </div>

                        <div className={styles.docsList}>
                            {scheme.requiredDocs.map((doc) => {
                                const uploaded = uploadedDocs.find(d => d.documentType === doc.type);

                                return (
                                    <div key={doc.type} className={styles.docItem}>
                                        <div className={styles.docInfo}>
                                            <span className={styles.docLabel}>
                                                {doc.label}
                                                {doc.required && <span className={styles.recommended}>{t('recommended')}</span>}
                                            </span>
                                            {doc.description && (
                                                <span className={styles.docDesc}>{doc.description}</span>
                                            )}
                                        </div>

                                        <div className={styles.docUpload}>
                                            {uploaded?.status === 'uploaded' ? (
                                                <div className={styles.uploadSuccess}>
                                                    ✓ {uploaded.fileName}
                                                </div>
                                            ) : uploaded?.status === 'uploading' ? (
                                                <div className={styles.uploading}>
                                                    <span className="spinner" /> {t('uploading')}
                                                </div>
                                            ) : (
                                                <label className={styles.uploadBtn}>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileUpload(doc.type, file);
                                                        }}
                                                    />
                                                    {t('chooseFile')}
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.actions}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentStep('review')}
                            >
                                {t('skipForNow')}
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => setCurrentStep('review')}
                            >
                                {t('continueToReview')}
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'review' && (
                    <div className={styles.reviewStep}>
                        <h2>{t('reviewApplication')}</h2>

                        <div className={styles.reviewCard}>
                            <h3>{t('scheme')}</h3>
                            <p>{scheme.name}</p>
                        </div>

                        <div className={styles.reviewCard}>
                            <h3>{t('uploadedDocuments')}</h3>
                            <ul>
                                {uploadedDocs.filter(d => d.status === 'uploaded').map(doc => (
                                    <li key={doc.documentType}>
                                        <span>✓</span> {doc.fileName}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.reviewCard}>
                            <h3>{t('serviceFee')}</h3>
                            <p className={styles.fee}>₹{scheme.serviceFee}</p>
                        </div>

                        <div className={styles.disclaimer}>
                            <p>
                                <strong>{t('note')}:</strong> {t('disclaimer')}
                            </p>
                        </div>

                        <div className={styles.actions}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentStep('documents')}
                            >
                                ← {t('back')}
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => {
                                    setCurrentStep('payment');
                                    handlePayment();
                                }}
                            >
                                {t('proceedToPayment')} - ₹{scheme.serviceFee}
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'payment' && (
                    <div className={styles.paymentStep}>
                        <h2>{t('processingPayment')}</h2>
                        <div className="spinner" />
                        <p>{t('paymentInstructions')}</p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handlePayment()}
                        >
                            {t('retryPayment')}
                        </button>
                    </div>
                )}

                {currentStep === 'success' && (
                    <div className={styles.successStep}>
                        <div className={styles.successIcon}>✓</div>
                        <h2>{t('applicationSubmitted')}</h2>
                        <p>{t('successMessage')}</p>
                        <p className={styles.orderId}>{t('orderId')}: {orderId}</p>

                        <div className={styles.nextSteps}>
                            <h3>{t('whatsNext')}</h3>
                            <ul>
                                <li>{t('nextStep1')}</li>
                                <li>{t('nextStep2')}</li>
                                <li>{t('nextStep3')}</li>
                            </ul>
                        </div>

                        <div className={styles.actions}>
                            <Link href="/orders" className="btn btn-primary">
                                {t('viewApplications')}
                            </Link>
                            <Link href="/" className="btn btn-secondary">
                                {t('backToHome')}
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
