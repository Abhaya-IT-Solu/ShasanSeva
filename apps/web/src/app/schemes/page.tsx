'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
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

const CATEGORY_LABELS: Record<string, string> = {
    STUDENT: 'Student Schemes',
    FARMER: 'Farmer Schemes',
    LOAN: 'Loan Schemes',
    CERTIFICATE: 'Important Certificates',
    EMPLOYMENT: 'Employment Schemes',
    HEALTH: 'Health Schemes',
    WOMEN: 'Women Welfare',
    SENIOR: 'Senior Citizens',
    OTHER: 'Other Services',
};

function SchemesContent() {
    const searchParams = useSearchParams();
    const categoryFromUrl = searchParams.get('category') || '';

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

            const response = await fetch(`/api/schemes?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setSchemes(data.data || []);
            } else {
                setError(data.error?.message || 'Failed to load schemes');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSchemes();
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

    const pageTitle = categoryFromUrl
        ? CATEGORY_LABELS[categoryFromUrl] || 'Schemes'
        : 'All Schemes';

    return (
        <div className={styles.container}>
            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.titleRow}>
                    <div>
                        <h1 className={styles.title}>{pageTitle}</h1>
                        <p className={styles.subtitle}>
                            {categoryFromUrl
                                ? `Showing all ${pageTitle.toLowerCase()}`
                                : 'Find government and private schemes you\'re eligible for'}
                        </p>
                    </div>
                    <div className={styles.titleActions}>
                        {categoryFromUrl && (
                            <Link href="/schemes" className={styles.viewAllLink}>
                                ← View All
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
                            Search
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
                                placeholder="Search schemes by name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className={styles.searchBtn}>
                                Search
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
                        <p>Loading schemes...</p>
                    </div>
                )}

                {/* Schemes Grid */}
                {!isLoading && !error && (
                    <>
                        {schemes.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>No schemes found{search ? ` for "${search}"` : ''}</p>
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
                                                {scheme.category}
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
                                                Service Fee: ₹{scheme.serviceFee}
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
    return (
        <Suspense fallback={<div className={styles.loading}><div className="spinner" /><p>Loading...</p></div>}>
            <SchemesContent />
        </Suspense>
    );
}
