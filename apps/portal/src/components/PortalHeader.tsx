'use client';

import Link from 'next/link';
import { usePortalAuth } from '@/lib/auth';
import styles from './portalHeader.module.css';

export default function PortalHeader() {
    const { username, logout } = usePortalAuth();

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand}>
                    <span className={styles.brandName}>ShasanSeva</span>
                    <span className={styles.brandTag}>Developer Portal</span>
                </Link>

                <div className={styles.right}>
                    {username && <span className={styles.user}>{username}</span>}
                    <button onClick={logout} className="btn btn-secondary btn-sm">
                        Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
