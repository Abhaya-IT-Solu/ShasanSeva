'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './login.module.css';

type Tab = 'login' | 'register';

export default function LoginPage() {
    const t = useTranslations('LoginPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();

    const [tab, setTab] = useState<Tab>('login');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            if (user?.userType === 'ADMIN') {
                router.replace('/admin/dashboard');
            } else {
                router.replace(`/${locale}/orders`);
            }
        }
    }, [isAuthenticated, authLoading, user, router, locale]);

    // Show loading while checking auth
    if (authLoading) {
        return (
            <main className={styles.main}>
                <div className={styles.container}>
                    <div className="spinner" />
                </div>
            </main>
        );
    }

    // Don't render login form if authenticated
    if (isAuthenticated) {
        return null;
    }

    const validateForm = (): boolean => {
        setError('');

        // Validate phone
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError(t('invalidPhone'));
            return false;
        }

        // Validate password
        if (password.length < 8) {
            setError(t('passwordMinLength'));
            return false;
        }

        if (!/\d/.test(password)) {
            setError(t('passwordNeedNumber'));
            return false;
        }

        // For register, check confirm password
        if (tab === 'register' && password !== confirmPassword) {
            setError(t('passwordMismatch'));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setError('');

        try {
            const response = tab === 'login'
                ? await api.login(phone, password)
                : await api.register(phone, password, name || undefined);

            if (response.success && response.data) {
                login(response.data.token, {
                    userId: (response.data.user as any).id,
                    userType: response.data.userType,
                    role: (response.data.user as any).role,
                    phone: phone,
                    email: (response.data.user as any).email,
                    name: (response.data.user as any).name,
                });

                // Redirect based on user type and profile completion
                if (response.data.userType === 'ADMIN') {
                    router.push('/admin/dashboard');
                } else {
                    const userData = response.data.user as any;
                    if (userData.profileComplete) {
                        router.push(`/${locale}/orders`);
                    } else {
                        router.push(`/${locale}/complete-profile`);
                    }
                }
            } else {
                setError(response.error?.message || t('authFailed'));
            }
        } catch {
            setError(tCommon('error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <Image src="/logo/logo_text.png" alt="Logo" width={200} height={50} />
                </Link>

                {/* Login Card */}
                <div className={styles.card}>
                    {/* Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tab} ${tab === 'login' ? styles.activeTab : ''}`}
                            onClick={() => { setTab('login'); setError(''); }}
                        >
                            {t('loginTab')}
                        </button>
                        <button
                            className={`${styles.tab} ${tab === 'register' ? styles.activeTab : ''}`}
                            onClick={() => { setTab('register'); setError(''); }}
                        >
                            {t('registerTab')}
                        </button>
                    </div>

                    <p className={styles.subtitle}>
                        {tab === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
                    </p>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Name Input (Register only) */}
                        {tab === 'register' && (
                            <div className="input-group">
                                <label htmlFor="name" className="input-label">
                                    {t('nameLabel')}
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    className="input"
                                    placeholder={t('namePlaceholder')}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        {/* Phone Input */}
                        <div className="input-group">
                            <label htmlFor="phone" className="input-label">
                                {t('phoneLabel')}
                            </label>
                            <div className={styles.phoneInput}>
                                <span className={styles.countryCode}>+91</span>
                                <input
                                    id="phone"
                                    type="tel"
                                    className="input"
                                    placeholder={t('phonePlaceholder')}
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    maxLength={10}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="input-group">
                            <label htmlFor="password" className="input-label">
                                {t('passwordLabel')}
                            </label>
                            <div className={styles.passwordInput}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder={t('passwordPlaceholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    className={styles.togglePassword}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                            {tab === 'register' && (
                                <p className={styles.hint}>
                                    {t('passwordHint')}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password (Register only) */}
                        {tab === 'register' && (
                            <div className="input-group">
                                <label htmlFor="confirmPassword" className="input-label">
                                    {t('confirmPasswordLabel')}
                                </label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder={t('confirmPasswordPlaceholder')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg btn-full"
                            disabled={isLoading || phone.length !== 10 || password.length < 8}
                        >
                            {isLoading ? (
                                <span className="spinner" />
                            ) : (
                                tab === 'login' ? t('loginButton') : t('registerButton')
                            )}
                        </button>

                        {/* Divider */}
                        <div className={styles.divider}>
                            <span>{t('orContinueWith')}</span>
                        </div>

                        {/* Google Sign-In */}
                        <a
                            href="/api/auth/google"
                            className={styles.googleBtn}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {t('googleSignIn')}
                        </a>
                    </form>
                </div>

                {/* Footer */}
                <p className={styles.footer}>
                    {t('termsFooter')}
                </p>
            </div>
        </main>
    );
}
