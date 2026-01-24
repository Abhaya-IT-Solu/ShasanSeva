'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

    const [scheme, setScheme] = useState<Scheme | null>(null);
    const [currentStep, setCurrentStep] = useState<Step>('documents');
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [orderId, setOrderId] = useState<string | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            router.push(`/login?redirect=/apply/${params.slug}`);
        }
    }, [isAuthenticated, router, params.slug]);

    // Fetch scheme details
    useEffect(() => {
        const fetchScheme = async () => {
            try {
                const response = await fetch(`/api/schemes/${params.slug}`);
                const data = await response.json();
                if (data.success) {
                    setScheme(data.data);
                } else {
                    setError('Scheme not found');
                }
            } catch {
                setError('Failed to load scheme');
            } finally {
                setIsLoading(false);
            }
        };

        if (params.slug) {
            fetchScheme();
        }
    }, [params.slug]);

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

    // Check if all required docs are uploaded
    const allRequiredDocsUploaded = useCallback(() => {
        if (!scheme) return false;
        const requiredTypes = scheme.requiredDocs
            .filter(d => d.required)
            .map(d => d.type);

        return requiredTypes.every(type =>
            uploadedDocs.some(d => d.documentType === type && d.status === 'uploaded')
        );
    }, [scheme, uploadedDocs]);

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
                description: `Application for ${scheme.name}`,
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
                        setError('Payment verification failed');
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
            setError('Payment failed. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
                <p>Loading...</p>
            </div>
        );
    }

    if (error || !scheme) {
        return (
            <div className={styles.error}>
                <h1>Error</h1>
                <p>{error || 'Scheme not found'}</p>
                <Link href="/schemes" className="btn btn-primary">
                    Browse Schemes
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link href={`/schemes/${scheme.slug}`} className={styles.backLink}>
                    ← Back to Scheme
                </Link>
                <h1>Apply for {scheme.name}</h1>
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
                        <span className={styles.stepLabel}>
                            {step === 'documents' ? 'Documents' :
                                step === 'review' ? 'Review' :
                                    step === 'payment' ? 'Payment' : 'Done'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <main className={styles.main}>
                {currentStep === 'documents' && (
                    <div className={styles.documentsStep}>
                        <h2>Upload Required Documents</h2>
                        <p className={styles.subtitle}>Please upload clear, readable copies of the following documents</p>

                        <div className={styles.docsList}>
                            {scheme.requiredDocs.map((doc) => {
                                const uploaded = uploadedDocs.find(d => d.documentType === doc.type);

                                return (
                                    <div key={doc.type} className={styles.docItem}>
                                        <div className={styles.docInfo}>
                                            <span className={styles.docLabel}>
                                                {doc.label}
                                                {doc.required && <span className={styles.required}>*</span>}
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
                                                    <span className="spinner" /> Uploading...
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
                                                    Choose File
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.actions}>
                            <button
                                className="btn btn-primary btn-lg"
                                disabled={!allRequiredDocsUploaded()}
                                onClick={() => setCurrentStep('review')}
                            >
                                Continue to Review
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'review' && (
                    <div className={styles.reviewStep}>
                        <h2>Review Your Application</h2>

                        <div className={styles.reviewCard}>
                            <h3>Scheme</h3>
                            <p>{scheme.name}</p>
                        </div>

                        <div className={styles.reviewCard}>
                            <h3>Uploaded Documents</h3>
                            <ul>
                                {uploadedDocs.filter(d => d.status === 'uploaded').map(doc => (
                                    <li key={doc.documentType}>
                                        <span>✓</span> {doc.fileName}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.reviewCard}>
                            <h3>Service Fee</h3>
                            <p className={styles.fee}>₹{scheme.serviceFee}</p>
                        </div>

                        <div className={styles.disclaimer}>
                            <p>
                                <strong>Note:</strong> By proceeding, you agree that you have provided accurate documents.
                                The service fee is for application assistance only. Scheme approval depends on eligibility criteria.
                            </p>
                        </div>

                        <div className={styles.actions}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCurrentStep('documents')}
                            >
                                ← Back
                            </button>
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => {
                                    setCurrentStep('payment');
                                    handlePayment();
                                }}
                            >
                                Proceed to Payment - ₹{scheme.serviceFee}
                            </button>
                        </div>
                    </div>
                )}

                {currentStep === 'payment' && (
                    <div className={styles.paymentStep}>
                        <h2>Processing Payment</h2>
                        <div className="spinner" />
                        <p>Please complete the payment in the Razorpay window...</p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => handlePayment()}
                        >
                            Retry Payment
                        </button>
                    </div>
                )}

                {currentStep === 'success' && (
                    <div className={styles.successStep}>
                        <div className={styles.successIcon}>✓</div>
                        <h2>Application Submitted!</h2>
                        <p>Your payment was successful and your application is now being processed.</p>
                        <p className={styles.orderId}>Order ID: {orderId}</p>

                        <div className={styles.nextSteps}>
                            <h3>What's Next?</h3>
                            <ul>
                                <li>Our team will verify your documents</li>
                                <li>You'll receive updates on your application status</li>
                                <li>Track your application in your dashboard</li>
                            </ul>
                        </div>

                        <div className={styles.actions}>
                            <Link href="/orders" className="btn btn-primary">
                                View My Applications
                            </Link>
                            <Link href="/" className="btn btn-secondary">
                                Back to Home
                            </Link>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
