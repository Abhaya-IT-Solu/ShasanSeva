'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './login.module.css';

type Step = 'phone' | 'otp';
type OtpMethod = 'SMS' | 'WHATSAPP';

export default function LoginPage() {
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpMethod, setOtpMethod] = useState<OtpMethod>('SMS');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);

    const router = useRouter();
    const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            if (user?.userType === 'ADMIN') {
                router.replace('/admin/dashboard');
            } else {
                router.replace('/dashboard');
            }
        }
    }, [isAuthenticated, authLoading, user, router]);

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

    // Start countdown timer
    const startCountdown = () => {
        setCountdown(30);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Handle phone submission
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate phone number
        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.sendOtp(phone, otpMethod);

            if (response.success) {
                setStep('otp');
                startCountdown();
            } else {
                setError(response.error?.message || 'Failed to send OTP');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP verification
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.verifyOtp(phone, otp);

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
                    // Check if profile is complete
                    const user = response.data.user as any;
                    if (user.profileComplete) {
                        router.push('/dashboard');
                    } else {
                        router.push('/complete-profile');
                    }
                }
            } else {
                setError(response.error?.message || 'Invalid OTP');
            }
        } catch {
            setError('Verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (countdown > 0) return;

        setIsLoading(true);
        setError('');

        try {
            const response = await api.sendOtp(phone, otpMethod);

            if (response.success) {
                startCountdown();
                setOtp('');
            } else {
                setError(response.error?.message || 'Failed to resend OTP');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                {/* Logo */}
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🏛️</span>
                    ShasanSetu
                </Link>

                {/* Login Card */}
                <div className={styles.card}>
                    <h1 className={styles.title}>
                        {step === 'phone' ? 'Login / Register' : 'Enter OTP'}
                    </h1>
                    <p className={styles.subtitle}>
                        {step === 'phone'
                            ? 'Enter your mobile number to continue'
                            : `OTP sent to +91 ${phone}`
                        }
                    </p>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}

                    {step === 'phone' ? (
                        <form onSubmit={handleSendOtp} className={styles.form}>
                            {/* Phone Input */}
                            <div className="input-group">
                                <label htmlFor="phone" className="input-label">
                                    Mobile Number
                                </label>
                                <div className={styles.phoneInput}>
                                    <span className={styles.countryCode}>+91</span>
                                    <input
                                        id="phone"
                                        type="tel"
                                        className="input"
                                        placeholder="Enter 10-digit number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        maxLength={10}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* OTP Method Selection */}
                            <div className={styles.otpMethods}>
                                <button
                                    type="button"
                                    className={`${styles.methodBtn} ${otpMethod === 'SMS' ? styles.active : ''}`}
                                    onClick={() => setOtpMethod('SMS')}
                                    disabled={isLoading}
                                >
                                    📱 SMS
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.methodBtn} ${otpMethod === 'WHATSAPP' ? styles.active : ''}`}
                                    onClick={() => setOtpMethod('WHATSAPP')}
                                    disabled={isLoading}
                                >
                                    💬 WhatsApp
                                </button>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-full"
                                disabled={isLoading || phone.length !== 10}
                            >
                                {isLoading ? (
                                    <span className="spinner" />
                                ) : (
                                    `Send OTP via ${otpMethod}`
                                )}
                            </button>

                            {/* Divider */}
                            <div className={styles.divider}>
                                <span>or continue with</span>
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
                                Sign in with Google
                            </a>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOtp} className={styles.form}>
                            {/* OTP Input */}
                            <div className="input-group">
                                <label htmlFor="otp" className="input-label">
                                    Enter 6-digit OTP
                                </label>
                                <input
                                    id="otp"
                                    type="text"
                                    className={`input ${styles.otpInput}`}
                                    placeholder="• • • • • •"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    maxLength={6}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg btn-full"
                                disabled={isLoading || otp.length !== 6}
                            >
                                {isLoading ? (
                                    <span className="spinner" />
                                ) : (
                                    'Verify & Login'
                                )}
                            </button>

                            {/* Resend OTP */}
                            <div className={styles.resend}>
                                <button
                                    type="button"
                                    className={styles.resendBtn}
                                    onClick={handleResendOtp}
                                    disabled={countdown > 0 || isLoading}
                                >
                                    {countdown > 0
                                        ? `Resend OTP in ${countdown}s`
                                        : 'Resend OTP'
                                    }
                                </button>
                            </div>

                            {/* Change Number */}
                            <button
                                type="button"
                                className={styles.changeNumber}
                                onClick={() => {
                                    setStep('phone');
                                    setOtp('');
                                    setError('');
                                }}
                                disabled={isLoading}
                            >
                                ← Change Number
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className={styles.footer}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </main>
    );
}
