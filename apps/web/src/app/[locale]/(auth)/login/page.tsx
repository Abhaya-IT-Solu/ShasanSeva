'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type ConfirmationResult,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './login.module.css';

type Tab = 'login' | 'register';
type FpStep = 'phone' | 'otp' | 'password';

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
    }
}

export default function LoginPage() {
    const t = useTranslations('LoginPage');
    const tCommon = useTranslations('Common');
    const locale = useLocale();

    // ── Login / Register state ────────────────────────────────────────────
    const [tab, setTab] = useState<Tab>('login');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // ── Forgot-password state ─────────────────────────────────────────────
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [fpStep, setFpStep] = useState<FpStep>('phone');
    const [fpPhone, setFpPhone] = useState('');
    const [fpOtp, setFpOtp] = useState('');
    const [fpNewPassword, setFpNewPassword] = useState('');
    const [fpConfirmPassword, setFpConfirmPassword] = useState('');
    const [fpShowPassword, setFpShowPassword] = useState(false);
    const [fpLoading, setFpLoading] = useState(false);
    const [fpError, setFpError] = useState('');
    const [fpSuccess, setFpSuccess] = useState('');
    const [fpIdToken, setFpIdToken] = useState('');
    const [resendTimer, setResendTimer] = useState(0);
    const confirmationRef = useRef<ConfirmationResult | null>(null);
    const recaptchaAnchorRef = useRef<HTMLDivElement>(null); // permanent mount point
    const recaptchaElRef = useRef<HTMLDivElement | null>(null); // dynamic child element

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

    // Resend OTP countdown
    useEffect(() => {
        if (resendTimer <= 0) return;
        const id = setTimeout(() => setResendTimer(s => s - 1), 1000);
        return () => clearTimeout(id);
    }, [resendTimer]);

    // Clean up reCAPTCHA when leaving forgot-password mode
    useEffect(() => {
        if (!isForgotMode) {
            clearRecaptcha();
        }
    }, [isForgotMode]);

    // ── Helpers ───────────────────────────────────────────────────────────

    // Destroys the verifier and removes the dynamic reCAPTCHA DOM element entirely.
    // Creating a brand-new element each time is the only reliable way to avoid
    // "reCAPTCHA has already been rendered in this element" because grecaptcha's
    // internal widget registry is keyed to the element reference, not its id.
    const clearRecaptcha = () => {
        const v = window.recaptchaVerifier;
        if (v) { try { v.clear(); } catch (_) {} }
        window.recaptchaVerifier = undefined;
        if (recaptchaElRef.current && recaptchaAnchorRef.current) {
            try { recaptchaAnchorRef.current.removeChild(recaptchaElRef.current); } catch (_) {}
        }
        recaptchaElRef.current = null;
    };

    // Creates a fresh DOM element + RecaptchaVerifier every time.
    const getOrCreateRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            console.debug('[Firebase] Creating fresh RecaptchaVerifier...');
            const anchor = recaptchaAnchorRef.current;
            if (!anchor) throw new Error('reCAPTCHA anchor not mounted');
            // Always create a brand-new child div
            const el = document.createElement('div');
            anchor.appendChild(el);
            recaptchaElRef.current = el;
            const auth = getFirebaseAuth();
            window.recaptchaVerifier = new RecaptchaVerifier(
                auth,
                el,
                {
                    size: 'invisible',
                    callback: () => console.debug('[Firebase] reCAPTCHA solved.'),
                    'expired-callback': () => {
                        console.debug('[Firebase] reCAPTCHA expired — clearing.');
                        clearRecaptcha();
                    },
                }
            );
        }
        return window.recaptchaVerifier!;
    };

    // ── Login / Register ──────────────────────────────────────────────────
    const validateLoginForm = (): boolean => {
        setError('');
        if (!/^[6-9]\d{9}$/.test(phone)) { setError(t('invalidPhone')); return false; }
        if (password.length < 8) { setError(t('passwordMinLength')); return false; }
        if (!/\d/.test(password)) { setError(t('passwordNeedNumber')); return false; }
        if (tab === 'register' && password !== confirmPassword) { setError(t('passwordMismatch')); return false; }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateLoginForm()) return;
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
                    phone,
                    email: (response.data.user as any).email,
                    name: (response.data.user as any).name,
                });
                if (response.data.userType === 'ADMIN') {
                    router.push('/admin/dashboard');
                } else {
                    const userData = response.data.user as any;
                    router.push(userData.profileComplete ? `/${locale}/orders` : `/${locale}/complete-profile`);
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

    // ── Forgot password — Step 1: Send OTP ───────────────────────────────
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[6-9]\d{9}$/.test(fpPhone)) {
            setFpError(t('invalidPhone'));
            return;
        }
        setFpLoading(true);
        setFpError('');
        try {
            console.debug('[Firebase] Requesting OTP for +91' + fpPhone);
            const verifier = getOrCreateRecaptcha();
            const confirmation = await signInWithPhoneNumber(
                getFirebaseAuth(),
                `+91${fpPhone}`,
                verifier
            );
            confirmationRef.current = confirmation;
            console.debug('[Firebase] OTP sent successfully.');
            setFpStep('otp');
            setResendTimer(60);
            setFpSuccess(t('fpOtpSent', { phone: fpPhone }));
        } catch (err: any) {
            console.error('[Firebase] sendOtp error:', err?.code, err?.message);
            clearRecaptcha();
            const code = err?.code || '';
            if (code === 'auth/invalid-phone-number') {
                setFpError(t('invalidPhone'));
            } else if (code === 'auth/invalid-app-credential') {
                setFpError('reCAPTCHA verification failed. Please refresh the page and try again.');
            } else if (code === 'auth/quota-exceeded') {
                setFpError('SMS quota exceeded for this number. Please try again later.');
            } else if (code === 'auth/too-many-requests') {
                setFpError('Too many attempts. Please wait a few minutes before trying again.');
            } else {
                setFpError(err?.message || tCommon('error'));
            }
        } finally {
            setFpLoading(false);
        }
    };

    // ── Forgot password — Step 2: Verify OTP ─────────────────────────────
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fpOtp || fpOtp.length < 6) { setFpError(t('fpInvalidOtp')); return; }
        setFpLoading(true);
        setFpError('');
        setFpSuccess('');
        try {
            if (!confirmationRef.current) throw new Error('No confirmation result');
            const result = await confirmationRef.current.confirm(fpOtp);
            const idToken = await result.user.getIdToken();
            setFpIdToken(idToken);
            setFpStep('password');
        } catch {
            setFpError(t('fpInvalidOtp'));
        } finally {
            setFpLoading(false);
        }
    };

    // ── Forgot password — Step 3: Reset password ──────────────────────────
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fpNewPassword.length < 8) { setFpError(t('passwordMinLength')); return; }
        if (!/\d/.test(fpNewPassword)) { setFpError(t('passwordNeedNumber')); return; }
        if (fpNewPassword !== fpConfirmPassword) { setFpError(t('passwordMismatch')); return; }
        setFpLoading(true);
        setFpError('');
        try {
            const response = await api.resetPassword(fpIdToken, fpNewPassword);
            if (response.success && response.data) {
                setFpSuccess(t('fpResetSuccess'));
                login(response.data.token, {
                    userId: (response.data.user as any).id,
                    userType: response.data.userType,
                    role: (response.data.user as any).role,
                    phone: fpPhone,
                    email: (response.data.user as any).email,
                    name: (response.data.user as any).name,
                });
                setTimeout(() => {
                    const userData = response.data!.user as any;
                    router.push(userData.profileComplete ? `/${locale}/orders` : `/${locale}/complete-profile`);
                }, 1500);
            } else {
                setFpError(response.error?.message || tCommon('error'));
            }
        } catch {
            setFpError(tCommon('error'));
        } finally {
            setFpLoading(false);
        }
    };

    // ── Resend OTP ────────────────────────────────────────────────────────
    const handleResend = async () => {
        if (resendTimer > 0) return;
        setFpError('');
        setFpSuccess('');
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = undefined;
        }
        setFpLoading(true);
        try {
            console.debug('[Firebase] Resending OTP for +91' + fpPhone);
            const verifier = getOrCreateRecaptcha();
            const confirmation = await signInWithPhoneNumber(
                getFirebaseAuth(),
                `+91${fpPhone}`,
                verifier
            );
            confirmationRef.current = confirmation;
            console.debug('[Firebase] OTP resent successfully.');
            setResendTimer(60);
            setFpSuccess(t('fpOtpSent', { phone: fpPhone }));
        } catch (err: any) {
            console.error('[Firebase] resendOtp error:', err?.code, err?.message);
            clearRecaptcha();
            setFpError(err?.message || tCommon('error'));
        } finally {
            setFpLoading(false);
        }
    };


    const enterForgotMode = () => {
        setIsForgotMode(true);
        setFpStep('phone');
        setFpPhone('');
        setFpOtp('');
        setFpNewPassword('');
        setFpConfirmPassword('');
        setFpError('');
        setFpSuccess('');
        setFpIdToken('');
    };

    const exitForgotMode = () => {
        setIsForgotMode(false);
        setFpStep('phone');
        setFpError('');
        setFpSuccess('');
    };

    // ── Loading / auth guard ──────────────────────────────────────────────
    if (authLoading) {
        return (
            <main className={styles.main}>
                <div className={styles.card}><div className="spinner" /></div>
            </main>
        );
    }
    if (isAuthenticated) return null;

    // ── Render: Forgot Password ───────────────────────────────────────────
    if (isForgotMode) {
        const stepNum = fpStep === 'phone' ? 1 : fpStep === 'otp' ? 2 : 3;
        return (
            <main className={styles.main}>
                {/* reCAPTCHA anchor — child elements created/destroyed dynamically */}
                <div ref={recaptchaAnchorRef} style={{ position: 'absolute', top: 0, left: 0 }} />

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.headerIcon}>
                            <span className="material-icons">lock_reset</span>
                        </div>
                        <h1 className={styles.headerTitle}>{t('fpTitle')}</h1>
                        <p className={styles.headerSubtitle}>{t('fpSubtitle')}</p>
                    </div>

                    {/* Step indicator */}
                    <div className={styles.fpSteps}>
                        {[1, 2, 3].map(n => (
                            <div key={n} className={styles.fpStepItem}>
                                <div className={`${styles.fpStepDot} ${stepNum >= n ? styles.fpStepDotActive : ''} ${stepNum > n ? styles.fpStepDotDone : ''}`}>
                                    {stepNum > n
                                        ? <span className="material-icons" style={{ fontSize: 14 }}>check</span>
                                        : n}
                                </div>
                                <span className={`${styles.fpStepLabel} ${stepNum >= n ? styles.fpStepLabelActive : ''}`}>
                                    {t(n === 1 ? 'fpStep1' : n === 2 ? 'fpStep2' : 'fpStep3')}
                                </span>
                                {n < 3 && <div className={`${styles.fpStepLine} ${stepNum > n ? styles.fpStepLineDone : ''}`} />}
                            </div>
                        ))}
                    </div>

                    <div className={styles.formWrapper}>
                        {/* Error / Success messages */}
                        {fpError && (
                            <div className={styles.error}>
                                <span className="material-icons" style={{ fontSize: 16 }}>error_outline</span>
                                {fpError}
                            </div>
                        )}
                        {fpSuccess && (
                            <div className={styles.fpSuccess}>
                                <span className="material-icons" style={{ fontSize: 16 }}>check_circle</span>
                                {fpSuccess}
                            </div>
                        )}

                        {/* Step 1 — Enter phone */}
                        {fpStep === 'phone' && (
                            <form onSubmit={handleSendOtp} className={styles.form}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="fp-phone" className={styles.label}>{t('fpPhoneLabel')}</label>
                                    <div className={styles.inputWithIcon}>
                                        <span className={`material-icons ${styles.inputIcon}`}>phone</span>
                                        <span className={styles.countryCode}>+91</span>
                                        <input
                                            id="fp-phone"
                                            type="tel"
                                            className={`${styles.input} ${styles.phoneInput}`}
                                            placeholder={t('phonePlaceholder')}
                                            value={fpPhone}
                                            onChange={e => setFpPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            maxLength={10}
                                            disabled={fpLoading}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={fpLoading || fpPhone.length !== 10}
                                >
                                    {fpLoading ? <span className="spinner" /> : t('fpSendOtp')}
                                </button>
                            </form>
                        )}

                        {/* Step 2 — Enter OTP */}
                        {fpStep === 'otp' && (
                            <form onSubmit={handleVerifyOtp} className={styles.form}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="fp-otp" className={styles.label}>{t('fpOtpLabel')}</label>
                                    <div className={styles.inputWithIcon}>
                                        <span className={`material-icons ${styles.inputIcon}`}>sms</span>
                                        <input
                                            id="fp-otp"
                                            type="text"
                                            inputMode="numeric"
                                            className={styles.input}
                                            placeholder={t('fpOtpPlaceholder')}
                                            value={fpOtp}
                                            onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            maxLength={6}
                                            disabled={fpLoading}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={fpLoading || fpOtp.length < 6}
                                >
                                    {fpLoading ? <span className="spinner" /> : t('fpVerifyOtp')}
                                </button>
                                <button type="button" className={styles.fpResendBtn} onClick={handleResend} disabled={resendTimer > 0 || fpLoading}>
                                    {resendTimer > 0 ? t('fpResendIn', { seconds: resendTimer }) : t('fpResend')}
                                </button>
                            </form>
                        )}

                        {/* Step 3 — New password */}
                        {fpStep === 'password' && (
                            <form onSubmit={handleResetPassword} className={styles.form}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="fp-new-pw" className={styles.label}>{t('fpNewPasswordLabel')}</label>
                                    <div className={styles.inputWithIcon}>
                                        <span className={`material-icons ${styles.inputIcon}`}>lock</span>
                                        <input
                                            id="fp-new-pw"
                                            type={fpShowPassword ? 'text' : 'password'}
                                            className={styles.input}
                                            placeholder={t('passwordPlaceholder')}
                                            value={fpNewPassword}
                                            onChange={e => setFpNewPassword(e.target.value)}
                                            disabled={fpLoading}
                                            autoFocus
                                        />
                                        <button type="button" className={styles.togglePassword} onClick={() => setFpShowPassword(v => !v)}>
                                            <span className="material-icons" style={{ fontSize: 18 }}>{fpShowPassword ? 'visibility' : 'visibility_off'}</span>
                                        </button>
                                    </div>
                                    <p className={styles.hint}>{t('passwordHint')}</p>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="fp-confirm-pw" className={styles.label}>{t('fpConfirmPasswordLabel')}</label>
                                    <div className={styles.inputWithIcon}>
                                        <span className={`material-icons ${styles.inputIcon}`}>lock_outline</span>
                                        <input
                                            id="fp-confirm-pw"
                                            type={fpShowPassword ? 'text' : 'password'}
                                            className={styles.input}
                                            placeholder={t('confirmPasswordPlaceholder')}
                                            value={fpConfirmPassword}
                                            onChange={e => setFpConfirmPassword(e.target.value)}
                                            disabled={fpLoading}
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={fpLoading || fpNewPassword.length < 8 || fpConfirmPassword.length < 8}
                                >
                                    {fpLoading ? <span className="spinner" /> : t('fpResetButton')}
                                </button>
                            </form>
                        )}

                        {/* Back to login link */}
                        <button type="button" className={styles.fpBackBtn} onClick={exitForgotMode}>
                            <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
                            {t('fpBackToLogin')}
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    // ── Render: Login / Register ──────────────────────────────────────────
    return (
        <main className={styles.main}>
            <div className={styles.card}>
                {/* Header with Icon */}
                <div className={styles.cardHeader}>
                    <div className={styles.headerIcon}>
                        <span className="material-icons">verified_user</span>
                    </div>
                    <h1 className={styles.headerTitle}>{tCommon('appName')}</h1>
                    <p className={styles.headerSubtitle}>{t('loginSubtitle')}</p>
                </div>

                {/* Tabs with bottom indicator */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${tab === 'login' ? styles.activeTab : ''}`}
                        onClick={() => { setTab('login'); setError(''); }}
                    >
                        {t('loginTab')}
                        <div className={`${styles.tabIndicator} ${tab === 'login' ? styles.activeIndicator : ''}`} />
                    </button>
                    <button
                        className={`${styles.tab} ${tab === 'register' ? styles.activeTab : ''}`}
                        onClick={() => { setTab('register'); setError(''); }}
                    >
                        {t('registerTab')}
                        <div className={`${styles.tabIndicator} ${tab === 'register' ? styles.activeIndicator : ''}`} />
                    </button>
                </div>

                <div className={styles.formWrapper}>
                    {error && (
                        <div className={styles.error}>
                            <span className="material-icons" style={{ fontSize: 16 }}>error_outline</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {/* Name Input (Register only) */}
                        {tab === 'register' && (
                            <div className={styles.inputGroup}>
                                <label htmlFor="name" className={styles.label}>{t('nameLabel')}</label>
                                <div className={styles.inputWithIcon}>
                                    <span className={`material-icons ${styles.inputIcon}`}>person</span>
                                    <input
                                        id="name"
                                        type="text"
                                        className={styles.input}
                                        placeholder={t('namePlaceholder')}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Phone Input */}
                        <div className={styles.inputGroup}>
                            <label htmlFor="phone" className={styles.label}>{t('phoneLabel')}</label>
                            <div className={styles.inputWithIcon}>
                                <span className={`material-icons ${styles.inputIcon}`}>phone</span>
                                <span className={styles.countryCode}>+91</span>
                                <input
                                    id="phone"
                                    type="tel"
                                    className={`${styles.input} ${styles.phoneInput}`}
                                    placeholder={t('phonePlaceholder')}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    maxLength={10}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className={styles.inputGroup}>
                            <div className={styles.labelRow}>
                                <label htmlFor="password" className={styles.label}>{t('passwordLabel')}</label>
                                {tab === 'login' && (
                                    <button type="button" className={styles.forgotBtn} onClick={enterForgotMode}>
                                        {t('forgotPassword')}
                                    </button>
                                )}
                            </div>
                            <div className={styles.inputWithIcon}>
                                <span className={`material-icons ${styles.inputIcon}`}>lock</span>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className={styles.input}
                                    placeholder={t('passwordPlaceholder')}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    disabled={isLoading}
                                />
                                <button type="button" className={styles.togglePassword} onClick={() => setShowPassword(!showPassword)}>
                                    <span className="material-icons" style={{ fontSize: 18 }}>{showPassword ? 'visibility' : 'visibility_off'}</span>
                                </button>
                            </div>
                            {tab === 'register' && (
                                <p className={styles.hint}>{t('passwordHint')}</p>
                            )}
                        </div>

                        {/* Confirm Password (Register only) */}
                        {tab === 'register' && (
                            <div className={styles.inputGroup}>
                                <label htmlFor="confirmPassword" className={styles.label}>{t('confirmPasswordLabel')}</label>
                                <div className={styles.inputWithIcon}>
                                    <span className={`material-icons ${styles.inputIcon}`}>lock_outline</span>
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        className={styles.input}
                                        placeholder={t('confirmPasswordPlaceholder')}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={isLoading || phone.length !== 10 || password.length < 8}
                        >
                            {isLoading
                                ? <span className="spinner" />
                                : tab === 'login' ? t('loginButton') : t('registerButton')}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className={styles.divider}>
                        <div className={styles.dividerLine} />
                        <span className={styles.dividerText}>{t('orContinueWith')}</span>
                        <div className={styles.dividerLine} />
                    </div>

                    {/* Google Sign-In */}
                    <a href="/api/auth/google" className={styles.googleBtn}>
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {t('googleSignIn')}
                    </a>

                    {/* Footer */}
                    <p className={styles.cardFooter}>{t('termsFooter')}</p>
                </div>
            </div>
        </main>
    );
}
