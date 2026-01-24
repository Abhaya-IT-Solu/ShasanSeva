'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './schemeDetail.module.css';

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
    description?: string;
    category?: string;
    schemeType?: string;
    eligibility?: string;
    benefits?: string;
    requiredDocs: RequiredDoc[];
    serviceFee: string;
    status: string;
}

export default function SchemeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [scheme, setScheme] = useState<Scheme | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchScheme = async () => {
            try {
                const response = await fetch(`/api/schemes/${params.slug}`);
                const data = await response.json();

                if (data.success) {
                    setScheme(data.data);
                } else {
                    setError(data.error?.message || 'Scheme not found');
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

    const handleApply = () => {
        if (!isAuthenticated) {
            router.push('/login');
            return;
        }
        // Will navigate to order creation in Checkpoint 3
        router.push(`/apply/${scheme?.slug}`);
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
                <p>Loading scheme details...</p>
            </div>
        );
    }

    if (error || !scheme) {
        return (
            <div className={styles.errorPage}>
                <h1>Scheme Not Found</h1>
                <p>{error || 'The scheme you are looking for does not exist.'}</p>
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
                <div className={styles.headerContent}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoIcon}>🏛️</span>
                        ShasanSetu
                    </Link>
                    <nav className={styles.nav}>
                        <Link href="/schemes" className={styles.backLink}>
                            ← Back to Schemes
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.content}>
                    {/* Scheme Header */}
                    <div className={styles.schemeHeader}>
                        <div className={styles.badges}>
                            <span className={`${styles.category} ${styles[`category${scheme.category}`]}`}>
                                {scheme.category}
                            </span>
                            <span className={styles.type}>
                                {scheme.schemeType === 'GOVERNMENT' ? '🏛️ Government' : '🏢 Private'}
                            </span>
                        </div>
                        <h1 className={styles.title}>{scheme.name}</h1>
                        {scheme.description && (
                            <p className={styles.description}>{scheme.description}</p>
                        )}
                    </div>

                    {/* Eligibility */}
                    {scheme.eligibility && (
                        <section className={styles.section}>
                            <h2>Eligibility Criteria</h2>
                            <div className={styles.sectionContent}>
                                {scheme.eligibility}
                            </div>
                        </section>
                    )}

                    {/* Benefits */}
                    {scheme.benefits && (
                        <section className={styles.section}>
                            <h2>Benefits</h2>
                            <div className={styles.sectionContent}>
                                {scheme.benefits}
                            </div>
                        </section>
                    )}

                    {/* Required Documents */}
                    <section className={styles.section}>
                        <h2>Required Documents</h2>
                        <div className={styles.documentsList}>
                            {scheme.requiredDocs && scheme.requiredDocs.length > 0 ? (
                                scheme.requiredDocs.map((doc, index) => (
                                    <div key={index} className={styles.documentItem}>
                                        <div className={styles.docHeader}>
                                            <span className={styles.docLabel}>{doc.label}</span>
                                            {doc.required && (
                                                <span className={styles.required}>Required</span>
                                            )}
                                        </div>
                                        {doc.description && (
                                            <p className={styles.docDescription}>{doc.description}</p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noDocuments}>No specific documents required</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar - Apply Card */}
                <aside className={styles.sidebar}>
                    <div className={styles.applyCard}>
                        <div className={styles.feeSection}>
                            <span className={styles.feeLabel}>Service Fee</span>
                            <span className={styles.feeAmount}>₹{scheme.serviceFee}</span>
                        </div>

                        <div className={styles.disclaimer}>
                            <p>
                                <strong>Note:</strong> This is a professional assistance service.
                                Payment is for document handling and application support.
                                Approval is not guaranteed.
                            </p>
                        </div>

                        <button
                            onClick={handleApply}
                            className="btn btn-primary btn-lg btn-full"
                        >
                            Request Assistance
                        </button>

                        <p className={styles.applyNote}>
                            You'll need to upload the required documents before payment
                        </p>
                    </div>
                </aside>
            </main>
        </div>
    );
}
