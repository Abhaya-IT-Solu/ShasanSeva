'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, PortalSchemeListItem } from '@/lib/api';
import { usePortalAuth } from '@/lib/auth';
import PortalHeader from '@/components/PortalHeader';
import styles from './schemes.module.css';

export default function SchemesListPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading } = usePortalAuth();

    const [schemes, setSchemes] = useState<PortalSchemeListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');

    // Redirect unauthenticated users to login
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const load = async () => {
            setLoading(true);
            const res = await api.listSchemes();
            if (res.success && res.data) {
                setSchemes(res.data);
            } else {
                setError(res.error?.message || 'Failed to load schemes');
            }
            setLoading(false);
        };
        load();
    }, [isAuthenticated]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return schemes;
        return schemes.filter(
            (s) =>
                (s.name || '').toLowerCase().includes(q) ||
                s.slug.toLowerCase().includes(q) ||
                (s.category || '').toLowerCase().includes(q)
        );
    }, [schemes, search]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className={styles.centered}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return (
        <>
            <PortalHeader />
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.title}>Schemes</h1>
                        <p className={styles.subtitle}>Select a scheme to manage its custom application form fields.</p>
                    </div>
                </div>

                <input
                    type="text"
                    className={`input ${styles.search}`}
                    placeholder="Search by name, slug, or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {error && <div className={styles.error}>{error}</div>}

                {loading ? (
                    <div className={styles.centered}>
                        <div className="spinner spinner-lg" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>No schemes found.</div>
                ) : (
                    <div className={styles.list}>
                        {filtered.map((scheme) => (
                            <Link key={scheme.id} href={`/schemes/${scheme.id}`} className={styles.row}>
                                <div className={styles.rowMain}>
                                    <span className={styles.rowName}>{scheme.name || scheme.slug}</span>
                                    <span className={styles.rowSlug}>{scheme.slug}</span>
                                </div>
                                <div className={styles.rowMeta}>
                                    {scheme.category && <span className={styles.category}>{scheme.category}</span>}
                                    <span
                                        className={`badge ${scheme.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}
                                    >
                                        {scheme.status}
                                    </span>
                                    <span className={styles.fieldCount}>
                                        {scheme.fieldCount} {scheme.fieldCount === 1 ? 'field' : 'fields'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
