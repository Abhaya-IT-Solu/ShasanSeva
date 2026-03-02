'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useAuth } from '@/lib/auth';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import styles from './Header.module.css';

export function Header() {
    const pathname = usePathname();
    const t = useTranslations('Header');
    const { isAuthenticated, user, isLoading: authLoading, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        const handleClick = () => setShowUserMenu(false);

        if (!showUserMenu) return;

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showUserMenu]);

    // Don't show header on admin pages
    if (pathname?.startsWith('/admin')) {
        return null;
    }

    return (
        <>
            {/* Utility Top Bar */}
            <div className={styles.utilityBar}>
                <div className={styles.container}>
                    <div className={styles.utilityContent}>
                        <div className={styles.utilityLeft}>
                            <a href="https://wa.me/919876543210" className={styles.utilityLink}>
                                <span className="material-icons" style={{ fontSize: 14 }}>chat</span>
                                WhatsApp Support
                            </a>
                            <a href="tel:1800123456" className={styles.utilityLink}>
                                <span className="material-icons" style={{ fontSize: 14 }}>support_agent</span>
                                Helpline: 1800-123-456
                            </a>
                        </div>
                        <div className={styles.utilityRight}>
                            <LocaleSwitcher />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Navigation */}
            <nav className={styles.navbar}>
                <div className={styles.container}>
                    <div className={styles.navContent}>
                        <Link href="/" className={`${styles.logo} h-sm w-sm`}>
                            <Image src="/logo/logo_icon.png" alt="Logo" width={100} height={50} />
                        </Link>
                        <div className={styles.navLinks}>
                            <Link href="/" className={styles.navLink}>Home</Link>
                            <Link href="/schemes" className={styles.navLink}>Schemes</Link>
                        </div>
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
                                            <Link href="/dashboard" className={styles.dropdownItem}>
                                                <span className="material-icons" style={{ fontSize: 18 }}>home</span> {t('dashboard')}
                                            </Link>
                                            <Link href="/orders" className={styles.dropdownItem}>
                                                <span className="material-icons" style={{ fontSize: 18 }}>inventory_2</span> {t('myOrders')}
                                            </Link>
                                            <Link href="/profile" className={styles.dropdownItem}>
                                                <span className="material-icons" style={{ fontSize: 18 }}>person</span> {t('profile')}
                                            </Link>
                                            <button onClick={logout} className={styles.dropdownItem}>
                                                <span className="material-icons" style={{ fontSize: 18 }}>logout</span> {t('logout')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Link href="/login" className={styles.secondaryBtn}>
                                        {t('login')}
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
