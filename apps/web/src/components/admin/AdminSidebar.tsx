'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './adminSidebar.module.css';

interface AdminSidebarProps {
    activePage?: string;
}

export default function AdminSidebar({ activePage }: AdminSidebarProps) {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    // Close sidebar when route changes (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Close sidebar on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const isActive = (path: string) => {
        if (activePage) return activePage === path;
        return pathname.startsWith(path);
    };

    const navLinks = [
        { href: '/admin/dashboard', label: '📊 Dashboard', key: 'dashboard' },
        { href: '/admin/orders', label: '📦 Orders', key: 'orders' },
        { href: '/admin/schemes', label: '📋 Schemes', key: 'schemes' },
        { href: '/admin/users', label: '👥 Users', key: 'users' },
    ];

    if (isSuperAdmin) {
        navLinks.push({ href: '/admin/admins', label: '🛡️ Manage Admins', key: 'admins' });
    }

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                className={styles.hamburger}
                onClick={() => setIsOpen(true)}
                aria-label="Open menu"
            >
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
                <span className={styles.hamburgerLine}></span>
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className={styles.overlay}
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                {/* Close button for mobile */}
                <button
                    className={styles.closeBtn}
                    onClick={() => setIsOpen(false)}
                    aria-label="Close menu"
                >
                    ✕
                </button>

                <div className={styles.sidebarHeader}>
                    <Link href="/" className={styles.logo}>
                        <Image src="/logo/logo_icon.png" alt="Logo" width={200} height={100} />
                    </Link>
                    <span className={styles.badge}>
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                </div>

                <nav className={styles.nav}>
                    {navLinks.map((link) => (
                        <Link
                            key={link.key}
                            href={link.href}
                            className={`${styles.navLink} ${isActive(link.href) ? styles.active : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <span className={styles.userName}>{user?.name || user?.phone}</span>
                    <button onClick={logout} className="btn btn-secondary btn-full">
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
