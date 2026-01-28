'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import styles from './Header.module.css';

export function Header() {
    const { isAuthenticated, user, isLoading: authLoading, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        const handleClick = () => setShowUserMenu(false);
        if (showUserMenu) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [showUserMenu]);

    return (
        <>
            {/* Utility Top Bar */}
            <div className={styles.utilityBar}>
                <div className={styles.container}>
                    <div className={styles.utilityContent}>
                        <div className={styles.utilityLeft}>
                            <a href="https://wa.me/919876543210" className={styles.utilityLink}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                +91 98765 43210
                            </a>
                            <a href="tel:1800123456" className={styles.utilityLink}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                Helpline: 1800-123-456
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Navigation */}
            <nav className={styles.navbar}>
                <div className={styles.container}>
                    <div className={styles.navContent}>
                        <Link href="/" className={styles.logo}>
                            ShasanSetu
                        </Link>
                        <div className={styles.navActions}>
                            {authLoading ? (
                                <div className="spinner" style={{ width: 20, height: 20 }} />
                            ) : isAuthenticated ? (
                                <div className={styles.userMenuWrapper}>
                                    <button
                                        className={styles.userBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowUserMenu(!showUserMenu);
                                        }}
                                    >
                                        <div className={styles.avatar}>
                                            {user?.name?.charAt(0).toUpperCase() || '👤'}
                                        </div>
                                    </button>
                                    {showUserMenu && (
                                        <div className={styles.dropdown}>
                                            <Link href="/dashboard" className={styles.dropdownItem}>📊 Dashboard</Link>
                                            <Link href="/profile" className={styles.dropdownItem}>👤 Profile</Link>
                                            <button onClick={logout} className={styles.dropdownItem}>🚪 Logout</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Link href="/login" className={styles.secondaryBtn}>
                                        Login
                                    </Link>
                                    <Link href="/login" className={styles.primaryBtn}>
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}
