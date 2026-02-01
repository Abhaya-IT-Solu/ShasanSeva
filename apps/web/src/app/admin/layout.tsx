'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import styles from './admin.module.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.userType !== 'ADMIN') {
                router.push('/dashboard');
            }
        }
    }, [isAuthenticated, isLoading, user, router]);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className="spinner" />
            </div>
        );
    }

    if (!isAuthenticated || user?.userType !== 'ADMIN') {
        return null;
    }

    return (
        <div className={styles.adminLayout}>
            <AdminSidebar />
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
