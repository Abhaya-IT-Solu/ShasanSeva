'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './page.module.css';

interface Scheme {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    schemeType?: string;
    serviceFee: string;
}

const TABS = [
    { id: 'STUDENT', label: 'Student Schemes', icon: '🎓' },
    { id: 'FARMER', label: 'Farmer Schemes', icon: '🌾' },
    { id: 'LOAN', label: 'Loan Schemes', icon: '💰' },
];

export default function HomePage() {
    const { isAuthenticated, user, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('STUDENT');
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Fetch schemes based on active tab
    useEffect(() => {
        const fetchSchemes = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/schemes?category=${activeTab}`);
                const data = await response.json();
                if (data.success) {
                    setSchemes(data.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch schemes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchemes();
    }, [activeTab]);

    const handleSchemeClick = (scheme: Scheme) => {
        router.push(`/schemes/${scheme.slug}`);
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <Link href="/" className={styles.logo}>
                        <span className={styles.logoIcon}>🏛️</span>
                        ShasanSetu
                    </Link>

                    <nav className={styles.nav}>
                        {authLoading ? (
                            <div className="spinner" style={{ width: 20, height: 20 }} />
                        ) : isAuthenticated ? (
                            <div className={styles.userMenuWrapper}>
                                <button
                                    className={styles.userMenuBtn}
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                >
                                    <div className={styles.avatar}>
                                        {user?.name?.charAt(0).toUpperCase() || '👤'}
                                    </div>
                                    <span className={styles.userName}>{user?.name || user?.phone}</span>
                                    <span className={styles.chevron}>▼</span>
                                </button>

                                {showUserMenu && (
                                    <div className={styles.dropdown}>
                                        <Link href="/dashboard" className={styles.dropdownItem}>
                                            📊 Dashboard
                                        </Link>
                                        <Link href="/profile" className={styles.dropdownItem}>
                                            👤 View Profile
                                        </Link>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setShowUserMenu(false);
                                            }}
                                            className={styles.dropdownItem}
                                        >
                                            🚪 Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/login" className="btn btn-primary">
                                Login / Register
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            {/* Hero Section - Minimal */}
            <section className={styles.hero}>
                <h1>Government & Private Scheme Assistance</h1>
                <p>Professional help for your scheme applications. Browse available schemes below.</p>
            </section>

            {/* Tabs */}
            <div className={styles.tabsContainer}>
                <div className={styles.tabs}>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className={styles.tabIcon}>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Schemes Grid */}
            <main className={styles.main}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className="spinner" />
                        <p>Loading schemes...</p>
                    </div>
                ) : schemes.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📋</span>
                        <p>No schemes available in this category yet</p>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {schemes.map((scheme) => (
                            <div
                                key={scheme.id}
                                className={styles.card}
                                onClick={() => handleSchemeClick(scheme)}
                            >
                                <div className={styles.cardHeader}>
                                    <span className={styles.schemeType}>
                                        {scheme.schemeType === 'GOVERNMENT' ? '🏛️ Government' : '🏢 Private'}
                                    </span>
                                </div>
                                <h3 className={styles.cardTitle}>{scheme.name}</h3>
                                {scheme.description && (
                                    <p className={styles.cardDesc}>
                                        {scheme.description.length > 80
                                            ? scheme.description.slice(0, 80) + '...'
                                            : scheme.description}
                                    </p>
                                )}
                                <div className={styles.cardFooter}>
                                    <span className={styles.fee}>₹{scheme.serviceFee}</span>
                                    <span className={styles.viewMore}>View Details →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Disclaimer */}
            <section className={styles.disclaimer}>
                <p>
                    <strong>Disclaimer:</strong> This is a professional assistance service for scheme applications.
                    We help with documentation and application process. Scheme approval is subject to government/company policies.
                    Service fee is for assistance only, not for scheme benefits.
                </p>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <p>© 2024 ShasanSetu. All rights reserved.</p>
            </footer>
        </div>
    );
}
