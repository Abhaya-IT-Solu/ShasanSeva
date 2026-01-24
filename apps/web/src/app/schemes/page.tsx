'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
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

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'STUDENT', label: 'Student' },
    { value: 'FARMER', label: 'Farmer' },
    { value: 'LOAN', label: 'Loan' },
];

const SCHEME_TYPES = [
    { value: '', label: 'All Types' },
    { value: 'GOVERNMENT', label: 'Government' },
    { value: 'PRIVATE', label: 'Private' },
];

export default function SchemesPage() {
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('');
    const [schemeType, setSchemeType] = useState('');
    const [search, setSearch] = useState('');

    const fetchSchemes = async () => {
        setIsLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (schemeType) params.append('schemeType', schemeType);
            if (search) params.append('search', search);

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
    }, [category, schemeType]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchSchemes();
    };

    const getCategoryColor = (cat?: string) => {
        switch (cat) {
            case 'STUDENT': return styles.categoryStudent;
            case 'FARMER': return styles.categoryFarmer;
            case 'LOAN': return styles.categoryLoan;
            default: return '';
        }
    };

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
                        <Link href="/dashboard" className="btn btn-primary">
                            Dashboard
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className={styles.main}>
                <h1 className={styles.title}>Browse Schemes</h1>
                <p className={styles.subtitle}>
                    Find government and private schemes you're eligible for
                </p>

                {/* Filters */}
                <div className={styles.filters}>
                    <div className={styles.filterRow}>
                        <select
                            className={styles.select}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>

                        <select
                            className={styles.select}
                            value={schemeType}
                            onChange={(e) => setSchemeType(e.target.value)}
                        >
                            {SCHEME_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    <form onSubmit={handleSearch} className={styles.searchForm}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search schemes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary">
                            Search
                        </button>
                    </form>
                </div>

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
                                <p>No schemes found matching your criteria</p>
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
