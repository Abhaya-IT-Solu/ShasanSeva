'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function UserLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.userType === 'ADMIN') {
                router.push('/admin/dashboard');
            }
        }
    }, [isAuthenticated, isLoading, user, router]);

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div className="spinner" />
            </div>
        );
    }

    if (!isAuthenticated || user?.userType === 'ADMIN') {
        return null;
    }

    return <>{children}</>;
}
