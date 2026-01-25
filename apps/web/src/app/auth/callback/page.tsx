'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, refreshUser } = useAuth();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            const token = searchParams.get('token');
            const completeProfile = searchParams.get('complete_profile');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError('Authentication failed. Please try again.');
                setTimeout(() => router.push('/login'), 2000);
                return;
            }

            if (!token) {
                setError('No authentication token received.');
                setTimeout(() => router.push('/login'), 2000);
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
                        router.push('/complete-profile');
                    } else {
                        router.push('/dashboard');
                    }
                } else {
                    throw new Error('Failed to get user data');
                }
            } catch {
                setError('Failed to complete authentication.');
                api.setToken(null);
                setTimeout(() => router.push('/login'), 2000);
            }
        };

        handleCallback();
    }, [searchParams, router, login, refreshUser]);

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
                    <p>Redirecting to login...</p>
                </>
            ) : (
                <>
                    <div className="spinner" />
                    <p>Completing authentication...</p>
                </>
            )}
        </div>
    );
}

export default function AuthCallbackPage() {
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
                <p>Loading...</p>
            </div>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
