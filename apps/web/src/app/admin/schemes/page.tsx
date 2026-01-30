'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from '../dashboard/dashboard.module.css';
import schemeStyles from './schemes.module.css';

interface Scheme {
    id: string;
    name: string;
    slug: string;
    category?: string;
    schemeType?: string;
    serviceFee: string;
    status: string;
}

export default function AdminSchemesPage() {
    const { user, logout } = useAuth();
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchSchemes();
    }, []);

    const fetchSchemes = async () => {
        try {
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
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <Link href="/" className={styles.logo}>
                        <Image src="/logo/logo_icon.png" alt="Logo" width={200} height={100} />
                    </Link>
                    <span className={styles.badge}>
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                </div>

                <nav className={styles.nav}>
                    <Link href="/admin/dashboard" className={styles.navLink}>
                        📊 Dashboard
                    </Link>
                    <Link href="/admin/orders" className={styles.navLink}>
                        📦 Orders
                    </Link>
                    <Link href="/admin/schemes" className={`${styles.navLink} ${styles.active}`}>
                        📋 Schemes
                    </Link>
                    <Link href="/admin/users" className={styles.navLink}>
                        👥 Users
                    </Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={styles.navLink}>
                            🛡️ Manage Admins
                        </Link>
                    )}
                </nav>

                <div className={styles.sidebarFooter}>
                    <span className={styles.userName}>{user?.name || user?.phone}</span>
                    <button onClick={logout} className="btn btn-secondary btn-full">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={styles.pageHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1>Manage Schemes</h1>
                    <Link href="/admin/schemes/new" className="btn btn-primary">
                        + Add Scheme
                    </Link>
                </header>

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
                            <span>Status</span>
                            <span>Actions</span>
                        </div>

                        {schemes.length === 0 ? (
                            <div className={schemeStyles.emptyRow}>
                                No schemes found. Add your first scheme!
                            </div>
                        ) : (
                            schemes.map((scheme) => (
                                <div key={scheme.id} className={schemeStyles.tableRow}>
                                    <span className={schemeStyles.name}>{scheme.name}</span>
                                    <span className={schemeStyles.category}>{scheme.category}</span>
                                    <span>{scheme.schemeType}</span>
                                    <span>₹{scheme.serviceFee}</span>
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
            </main>
        </div>
    );
}
