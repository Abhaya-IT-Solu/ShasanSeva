'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import styles from './schemes.module.css';

interface Scheme {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    schemeType?: string;
    serviceFee: string;
    status: string;
}

function SchemesContent() {
    const searchParams = useSearchParams();
    const categoryFromUrl = searchParams.get('category') || '';
    const t = useTranslations('SchemesPage');
    const tCat = useTranslations('Categories');
    const tCommon = useTranslations('Common');
    const locale = useLocale();

    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const fetchSchemes = async (searchTerm?: string) => {
        setIsLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (categoryFromUrl) params.append('category', categoryFromUrl);
            if (searchTerm) params.append('search', searchTerm);
            params.append('locale', locale);

            const response = await fetch(`/api/schemes?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setSchemes(data.data || []);
            } else {
                setError(data.error?.message || t('loadError'));
            }
        } catch {
            setError(t('connectionError'));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchemes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryFromUrl]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSchemes(search);
    };

    const getCategoryColor = (cat?: string) => {
        switch (cat) {
            case 'STUDENT': return styles.categoryStudent;
            case 'FARMER': return styles.categoryFarmer;
            case 'LOAN': return styles.categoryLoan;
            case 'CERTIFICATE': return styles.categoryCertificate;
            case 'EMPLOYMENT': return styles.categoryEmployment;
            case 'HEALTH': return styles.categoryHealth;
            case 'WOMEN': return styles.categoryWomen;
            case 'SENIOR': return styles.categorySenior;
            case 'OTHER': return styles.categoryOther;
            default: return '';
        }
    };

    const getCategoryName = (cat?: string) => {
        if (!cat) return '';
        try {
            return tCat(`${cat}.name` as any);
        } catch {
            return cat;
        }
    };

    const pageTitle = categoryFromUrl
        ? getCategoryName(categoryFromUrl)
        : t('allSchemes');

    return (
        <div className={styles.container}>
            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.titleRow}>
                    <div>
                        <h1 className={styles.title}>{pageTitle}</h1>
                        <p className={styles.subtitle}>
                            {categoryFromUrl
                                ? t('showingCategory', { category: pageTitle.toLowerCase() })
                                : t('subtitle')}
                        </p>
                    </div>
                    <div className={styles.titleActions}>
                        {categoryFromUrl && (
                            <Link href="/schemes" className={styles.viewAllLink}>
                                ← {tCommon('viewAll')}
                            </Link>
                        )}
                        {/* Search Icon */}
                        <button
                            className={styles.searchToggle}
                            onClick={() => setShowSearch(!showSearch)}
                            aria-label="Toggle search"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            {tCommon('search')}
                        </button>
                    </div>
                </div>

                {/* Expandable Search Bar */}
                {showSearch && (
                    <div className={styles.searchBarWrapper}>
                        <form onSubmit={handleSearch} className={styles.searchForm}>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder={t('searchPlaceholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className={styles.searchBtn}>
                                {tCommon('search')}
                            </button>
                            <button
                                type="button"
                                className={styles.closeBtn}
                                onClick={() => { setShowSearch(false); setSearch(''); fetchSchemes(); }}
                            >
                                ✕
                            </button>
                        </form>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className={styles.error}>{error}</div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className={styles.loading}>
                        <div className="spinner" />
                        <p>{tCommon('loading')}</p>
                    </div>
                )}

                {/* Schemes Grid */}
                {!isLoading && !error && (
                    <>
                        {schemes.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>{t('noSchemes')}{search ? ` "${search}"` : ''}</p>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {schemes.map((scheme) => (
                                    <Link
                                        key={scheme.id}
                                        href={`/schemes/${scheme.slug}`}
                                        className={styles.card}
                                    >
                                        <div className={styles.cardHeader}>
                                            <span className={`${styles.category} ${getCategoryColor(scheme.category)}`}>
                                                {getCategoryName(scheme.category)}
                                            </span>
                                            <span className={styles.type}>
                                                {scheme.schemeType === 'GOVERNMENT' ? '🏛️' : '🏢'} {scheme.schemeType}
                                            </span>
                                        </div>

                                        <h3 className={styles.cardTitle}>{scheme.name}</h3>

                                        {scheme.description && (
                                            <p className={styles.cardDescription}>
                                                {scheme.description.length > 100
                                                    ? scheme.description.slice(0, 100) + '...'
                                                    : scheme.description}
                                            </p>
                                        )}

                                        <div className={styles.cardFooter}>
                                            <span className={styles.fee}>
                                                {t('serviceFee')}: ₹{scheme.serviceFee}
                                            </span>
                                            <span className={styles.arrow}>→</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default function SchemesPage() {
    const t = useTranslations('Common');

    return (
        <Suspense fallback={<div className={styles.loading}><div className="spinner" /><p>{t('loading')}</p></div>}>
            <SchemesContent />
        </Suspense>
    );
}
