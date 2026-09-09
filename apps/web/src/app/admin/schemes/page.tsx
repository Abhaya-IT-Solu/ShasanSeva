'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isMissingGovernmentSource } from '@/lib/sourceUrl';
import styles from '../admin.module.css';
import schemeStyles from './schemes.module.css';

interface Scheme {
    id: string;
    name: string;
    slug: string;
    category?: string;
    schemeType?: string;
    serviceFee: string;
    status: string;
    displayOrder?: number;
    sourceUrl?: string | null;
}

const CATEGORIES = [
    'STUDENT', 'FARMER', 'LOAN', 'CERTIFICATE', 'JOBS',
    'HEALTH', 'GOVT_CARD', 'LICENCE', 'TAX', 'OTHER',
];

export default function AdminSchemesPage() {
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchSchemes();
    }, []);

    const fetchSchemes = async () => {
        try {
            // No query params: the endpoint is unpaginated and the admin token makes
            // it return INACTIVE schemes too, so the whole set is already in hand and
            // every filter below can run client-side with no extra round trips.
            const response = await api.request('/api/schemes');
            if (response.success) {
                setSchemes(response.data as Scheme[]);
            } else {
                setError(response.error?.message || 'Failed to load schemes');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSchemes = useMemo(() => {
        const term = search.trim().toLowerCase();
        return schemes.filter((s) => {
            const matchesSearch = term === ''
                || (s.name || '').toLowerCase().includes(term)
                || (s.slug || '').toLowerCase().includes(term);
            const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
            const matchesType = typeFilter === 'ALL' || s.schemeType === typeFilter;
            const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
            return matchesSearch && matchesCategory && matchesType && matchesStatus;
        });
    }, [schemes, search, categoryFilter, typeFilter, statusFilter]);

    const hasFilters = search.trim() !== '' || categoryFilter !== 'ALL'
        || typeFilter !== 'ALL' || statusFilter !== 'ALL';

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('ALL');
        setTypeFilter('ALL');
        setStatusFilter('ALL');
    };

    const toggleStatus = async (schemeId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

        try {
            const response = await api.request(`/api/schemes/${schemeId}`, {
                method: 'PATCH',
                body: { status: newStatus },
            });

            if (response.success) {
                setSchemes(schemes.map(s =>
                    s.id === schemeId ? { ...s, status: newStatus } : s
                ));
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    return (
        <>
            <header className={styles.pageHeader}>
                <h1>Manage Schemes</h1>
                <div className={schemeStyles.headerActions}>
                    <input
                        type="search"
                        className={schemeStyles.searchInput}
                        placeholder="Search name or slug..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Link href="/admin/schemes/new" className="btn btn-primary">
                        + Add Scheme
                    </Link>
                </div>
            </header>

            <div className={schemeStyles.filterBar}>
                <select
                    className={schemeStyles.filterSelect}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="ALL">All categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                </select>

                <select
                    className={schemeStyles.filterSelect}
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="ALL">All types</option>
                    <option value="GOVERNMENT">Government</option>
                    <option value="PRIVATE">Private</option>
                </select>

                <select
                    className={schemeStyles.filterSelect}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                </select>

                <span className={schemeStyles.resultCount}>
                    {filteredSchemes.length} of {schemes.length}
                </span>

                {hasFilters && (
                    <button type="button" className={schemeStyles.clearBtn} onClick={clearFilters}>
                        Clear
                    </button>
                )}
            </div>

            {error && (
                <div className={schemeStyles.error}>{error}</div>
            )}

            {isLoading ? (
                <div className={schemeStyles.loading}>
                    <div className="spinner" />
                </div>
            ) : (
                <div className={schemeStyles.table}>
                    <div className={schemeStyles.tableHeader}>
                        <span>Name</span>
                        <span>Category</span>
                        <span>Type</span>
                        <span>Fee</span>
                        <span>Order</span>
                        <span>Status</span>
                        <span>Actions</span>
                    </div>

                    {filteredSchemes.length === 0 ? (
                        <div className={schemeStyles.emptyRow}>
                            {schemes.length === 0
                                ? 'No schemes found. Add your first scheme!'
                                : 'No schemes match these filters.'}
                        </div>
                    ) : (
                        filteredSchemes.map((scheme) => (
                            <div key={scheme.id} className={schemeStyles.tableRow}>
                                <span className={schemeStyles.name}>
                                    {scheme.name}
                                    {/* Google Play's Misleading Claims policy requires a
                                        verifiable source for government scheme information.
                                        Flagged here so the backfill is visible in the list
                                        rather than tracked in a spreadsheet. */}
                                    {isMissingGovernmentSource(scheme) && (
                                        <span
                                            title="No official government source URL. Required for the Play Store policy — add one in Edit."
                                            style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#b45309', whiteSpace: 'nowrap' }}
                                        >
                                            ⚠️ no source
                                        </span>
                                    )}
                                </span>
                                <span className={schemeStyles.category}>{scheme.category}</span>
                                <span>{scheme.schemeType}</span>
                                <span>₹{scheme.serviceFee}</span>
                                <span className={schemeStyles.order}>
                                    {/* 0 means "no preference" — show a dash rather than a
                                        misleading rank the admin never set. */}
                                    {scheme.displayOrder ? scheme.displayOrder : '—'}
                                </span>
                                <span>
                                    <button
                                        onClick={() => toggleStatus(scheme.id, scheme.status)}
                                        className={`${schemeStyles.statusBtn} ${scheme.status === 'ACTIVE' ? schemeStyles.active : schemeStyles.inactive
                                            }`}
                                    >
                                        {scheme.status}
                                    </button>
                                </span>
                                <span className={schemeStyles.actions}>
                                    <Link
                                        href={`/admin/schemes/${scheme.id}/edit`}
                                        className={schemeStyles.editBtn}
                                    >
                                        Edit
                                    </Link>
                                    <Link
                                        href={`/schemes/${scheme.slug}`}
                                        className={schemeStyles.viewBtn}
                                        target="_blank"
                                    >
                                        View
                                    </Link>
                                </span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );
}
