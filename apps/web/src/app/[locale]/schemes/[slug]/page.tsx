'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
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
    const t = useTranslations('SchemePage');
    const tCat = useTranslations('Categories');
    const tCommon = useTranslations('Common');
    const locale = useLocale();

    const { isAuthenticated } = useAuth();
    const [scheme, setScheme] = useState<Scheme | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchScheme = async () => {
            try {
                const response = await fetch(`/api/schemes/${params.slug}?locale=${locale}`);
                const data = await response.json();

                if (data.success) {
                    setScheme(data.data);
                } else {
                    setError(data.error?.message || t('notFound'));
                }
            } catch {
                setError(t('loadError'));
            } finally {
                setIsLoading(false);
            }
        };

        if (params.slug) {
            fetchScheme();
        }
    }, [params.slug, locale, t]);

    const handleApply = () => {
        if (!isAuthenticated) {
            router.push(`/${locale}/login`);
            return;
        }
        router.push(`/${locale}/apply/${scheme?.slug}`);
    };

    const getCategoryName = (cat?: string) => {
        if (!cat) return '';
        try {
            return tCat(`${cat}.name` as any);
        } catch {
            return cat;
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
                <p>{tCommon('loading')}</p>
            </div>
        );
    }

    if (error || !scheme) {
        return (
            <div className={styles.errorPage}>
                <h1>{t('notFound')}</h1>
                <p>{error || t('schemeNotExist')}</p>
                <Link href="/schemes" className="btn btn-primary">
                    {t('browseSchemes')}
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.content}>
                    {/* Scheme Header */}
                    <div className={styles.schemeHeader}>
                        <div className={styles.badges}>
                            <span className={`${styles.category} ${styles[`category${scheme.category}`]}`}>
                                {getCategoryName(scheme.category)}
                            </span>
                            <span className={styles.type}>
                                {scheme.schemeType === 'GOVERNMENT' ? `🏛️ ${t('government')}` : `🏢 ${t('private')}`}
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
                            <h2>{t('eligibility')}</h2>
                            <div className={styles.sectionContent}>
                                {scheme.eligibility}
                            </div>
                        </section>
                    )}

                    {/* Benefits */}
                    {scheme.benefits && (
                        <section className={styles.section}>
                            <h2>{t('benefits')}</h2>
                            <div className={styles.sectionContent}>
                                {scheme.benefits}
                            </div>
                        </section>
                    )}

                    {/* Required Documents */}
                    <section className={styles.section}>
                        <h2>{t('requiredDocs')}</h2>
                        <div className={styles.documentsList}>
                            {scheme.requiredDocs && scheme.requiredDocs.length > 0 ? (
                                scheme.requiredDocs.map((doc, index) => (
                                    <div key={index} className={styles.documentItem}>
                                        <div className={styles.docHeader}>
                                            <span className={styles.docLabel}>{doc.label}</span>
                                            {doc.required && (
                                                <span className={styles.required}>{t('required')}</span>
                                            )}
                                        </div>
                                        {doc.description && (
                                            <p className={styles.docDescription}>{doc.description}</p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noDocuments}>{t('noDocsRequired')}</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Sidebar - Apply Card */}
                <aside className={styles.sidebar}>
                    <div className={styles.applyCard}>
                        <div className={styles.feeSection}>
                            <span className={styles.feeLabel}>{t('serviceFee')}</span>
                            <span className={styles.feeAmount}>₹{scheme.serviceFee}</span>
                        </div>

                        <div className={styles.disclaimer}>
                            <p>
                                <strong>{t('note')}:</strong> {t('disclaimer')}
                            </p>
                        </div>

                        <button
                            onClick={handleApply}
                            className="btn btn-primary btn-lg btn-full"
                        >
                            {t('applyButton')}
                        </button>

                        <p className={styles.applyNote}>
                            {t('applyNote')}
                        </p>
                    </div>
                </aside>
            </main>
        </div>
    );
}
