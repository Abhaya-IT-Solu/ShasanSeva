'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Pagination from '@/components/Pagination';
import styles from './enquiries.module.css';

type EnquiryStatus = 'NEW' | 'CONTACTED' | 'CLOSED';

interface Enquiry {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    message: string;
    schemeId: string | null;
    schemeName: string | null;
    status: EnquiryStatus;
    adminNote: string | null;
    handledBy: string | null;
    handledByName: string | null;
    handledAt: string | null;
    createdAt: string;
}

interface PaginationData {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const STATUS_TABS: { label: string; value: EnquiryStatus | 'ALL' }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'New', value: 'NEW' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Closed', value: 'CLOSED' },
];

const STATUS_CLASS: Record<EnquiryStatus, string> = {
    NEW: styles.statusNew,
    CONTACTED: styles.statusContacted,
    CLOSED: styles.statusClosed,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function EnquiriesPage() {
    const { token } = useAuth();
    const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<EnquiryStatus | 'ALL'>('ALL');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    // Note drafts are held per-enquiry so switching rows does not lose typing.
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationData>({
        page: 1, limit: 20, total: 0, totalPages: 1,
    });

    useEffect(() => {
        if (token) fetchEnquiries(activeTab, 1, search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const fetchEnquiries = async (
        status: EnquiryStatus | 'ALL' = activeTab,
        pageNum: number = page,
        searchTerm: string = search,
    ) => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (status !== 'ALL') params.append('status', status);
            if (searchTerm.trim()) params.append('search', searchTerm.trim());
            params.append('page', String(pageNum));
            params.append('limit', '20');

            const res = await fetch(`${API_URL}/api/enquiries?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setEnquiries(data.data.data);
                setPagination(data.data.pagination);
                setPage(pageNum);
            } else {
                setError(data.error?.message || 'Failed to load enquiries');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const updateEnquiry = async (id: string, body: Record<string, unknown>) => {
        setUpdating(id);
        setError('');
        try {
            const res = await fetch(`${API_URL}/api/enquiries/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error?.message || 'Failed to update enquiry');
                return;
            }
            // Refetch rather than patching local state: a status change can move
            // the row out of the active tab entirely.
            await fetchEnquiries(activeTab, page, search);
        } catch {
            setError('Failed to connect to server');
        } finally {
            setUpdating(null);
        }
    };

    const handleTabChange = (tab: EnquiryStatus | 'ALL') => {
        setActiveTab(tab);
        setExpandedId(null);
        fetchEnquiries(tab, 1, search);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchEnquiries(activeTab, 1, search);
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    return (
        <>
            <header className={styles.pageHeader}>
                <div>
                    <h1>Enquiries</h1>
                    <p className={styles.subtitle}>
                        Questions from visitors who have not applied yet. Call them back, then mark the enquiry.
                    </p>
                </div>
            </header>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.tabs}>
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        className={`${styles.tab} ${activeTab === tab.value ? styles.tabActive : ''}`}
                        onClick={() => handleTabChange(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search by name, phone, email or scheme…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button type="submit" className={styles.searchBtn}>Search</button>
                {search && (
                    <button
                        type="button"
                        className={styles.searchClear}
                        onClick={() => { setSearch(''); fetchEnquiries(activeTab, 1, ''); }}
                    >
                        Clear
                    </button>
                )}
            </form>

            {loading ? (
                <div className={styles.loading}><span className="spinner" /></div>
            ) : enquiries.length === 0 ? (
                <div className={styles.empty}>
                    <p>No enquiries{activeTab !== 'ALL' ? ` marked ${activeTab.toLowerCase()}` : ''} yet.</p>
                </div>
            ) : (
                <>
                    <div className={styles.list}>
                        {enquiries.map((enq) => {
                            const isExpanded = expandedId === enq.id;
                            const draft = noteDrafts[enq.id] ?? (enq.adminNote || '');
                            return (
                                <div key={enq.id} className={styles.row}>
                                    <button
                                        type="button"
                                        className={styles.rowHead}
                                        onClick={() => setExpandedId(isExpanded ? null : enq.id)}
                                        aria-expanded={isExpanded}
                                    >
                                        <span className={styles.rowMain}>
                                            <span className={styles.rowName}>{enq.name}</span>
                                            <span className={styles.rowScheme}>
                                                {enq.schemeName || 'General enquiry'}
                                            </span>
                                        </span>
                                        <span className={styles.rowMeta}>
                                            <span className={`${styles.statusBadge} ${STATUS_CLASS[enq.status]}`}>
                                                {enq.status}
                                            </span>
                                            <span className={styles.rowDate}>{formatDate(enq.createdAt)}</span>
                                            <span className={styles.chevron}>{isExpanded ? '▲' : '▼'}</span>
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div className={styles.rowBody}>
                                            <div className={styles.contactRow}>
                                                {/* A phone link, because ringing them is the next action. */}
                                                <a href={`tel:+91${enq.phone}`} className={styles.phoneLink}>
                                                    📞 +91 {enq.phone}
                                                </a>
                                                {enq.email && (
                                                    <a href={`mailto:${enq.email}`} className={styles.emailLink}>
                                                        ✉️ {enq.email}
                                                    </a>
                                                )}
                                            </div>

                                            <div className={styles.message}>{enq.message}</div>

                                            {enq.handledByName && enq.handledAt && (
                                                <p className={styles.handled}>
                                                    Last updated by {enq.handledByName} on {formatDate(enq.handledAt)}
                                                </p>
                                            )}

                                            <label className={styles.noteLabel}>
                                                Internal note
                                                <textarea
                                                    className={styles.noteInput}
                                                    rows={2}
                                                    maxLength={2000}
                                                    placeholder="What happened when you called?"
                                                    value={draft}
                                                    onChange={(e) => setNoteDrafts((p) => ({ ...p, [enq.id]: e.target.value }))}
                                                />
                                            </label>

                                            <div className={styles.actions}>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary btn-sm"
                                                    disabled={updating === enq.id || draft === (enq.adminNote || '')}
                                                    onClick={() => updateEnquiry(enq.id, { adminNote: draft })}
                                                >
                                                    Save note
                                                </button>
                                                {enq.status !== 'CONTACTED' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        disabled={updating === enq.id}
                                                        onClick={() => updateEnquiry(enq.id, { status: 'CONTACTED', adminNote: draft })}
                                                    >
                                                        Mark contacted
                                                    </button>
                                                )}
                                                {enq.status !== 'CLOSED' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary btn-sm"
                                                        disabled={updating === enq.id}
                                                        onClick={() => updateEnquiry(enq.id, { status: 'CLOSED', adminNote: draft })}
                                                    >
                                                        Close
                                                    </button>
                                                )}
                                                {enq.status !== 'NEW' && (
                                                    <button
                                                        type="button"
                                                        className={styles.reopenBtn}
                                                        disabled={updating === enq.id}
                                                        onClick={() => updateEnquiry(enq.id, { status: 'NEW' })}
                                                    >
                                                        Reopen
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <Pagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        loading={loading}
                        onPageChange={(p) => fetchEnquiries(activeTab, p, search)}
                    />
                </>
            )}
        </>
    );
}
