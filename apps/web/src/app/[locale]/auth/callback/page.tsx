'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, refreshUser } = useAuth();
    const t = useTranslations('AuthCallback');
    const locale = useLocale();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token');
            const completeProfile = searchParams.get('complete_profile');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError(t('authFailed'));
                setTimeout(() => router.push(`/${locale}/login`), 2000);
                return;
            }

            if (!token) {
                setError(t('noToken'));
                setTimeout(() => router.push(`/${locale}/login`), 2000);
                return;
            }

            // Save token and refresh user data
            api.setToken(token);

            try {
                const response = await api.getMe();
                if (response.success && response.data) {
                    const userData = response.data as any;
                    login(token, {
                        userId: userData.userId,
                        userType: userData.userType,
                        role: userData.role,
                        phone: userData.phone,
                        email: userData.email,
                        name: userData.name,
                    });

                    // Redirect based on profile completion
                    if (completeProfile === 'true' || !userData.profileComplete) {
                        router.push(`/${locale}/complete-profile`);
                    } else {
                        router.push(`/${locale}/orders`);
                    }
                } else {
                    throw new Error('Failed to get user data');
                }
            } catch {
                setError(t('completionFailed'));
                api.setToken(null);
                setTimeout(() => router.push(`/${locale}/login`), 2000);
            }
        };

        handleCallback();
    }, [searchParams, router, login, refreshUser, t, locale]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
        }}>
            {error ? (
                <>
                    <p style={{ color: 'red' }}>{error}</p>
                    <p>{t('redirecting')}</p>
                </>
            ) : (
                <>
                    <div className="spinner" />
                    <p>{t('completing')}</p>
                </>
            )}
        </div>
    );
}

export default function AuthCallbackPage() {
    const t = useTranslations('AuthCallback');

    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
            }}>
                <div className="spinner" />
                <p>{t('loading')}</p>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
