'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import styles from './profile.module.css';

interface UserProfile {
    id: string;
    phone: string;
    email?: string;
    name?: string;
    category?: string;
    address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    savedDocuments?: any[];
    profileComplete: boolean;
    createdAt: string;
}

export default function ProfilePage() {
    const t = useTranslations('ProfilePage');
    const tCat = useTranslations('Categories');
    const locale = useLocale();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Password change state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const getCategoryLabel = (category: string) => {
        const icons: Record<string, string> = {
            STUDENT: 'school',
            FARMER: 'agriculture',
            LOAN_CANDIDATE: 'account_balance_wallet',
            OTHER: 'description',
        };
        try {
            const iconName = icons[category] || 'description';
            return { icon: iconName, label: tCat(`${category}.name` as any) };
        } catch {
            return { icon: 'description', label: category };
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.getProfile();
                if (response.success && response.data) {
                    setProfile(response.data as UserProfile);
                }
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword.length < 8) {
            setPasswordError(t('passwordMinLength'));
            return;
        }
        if (!/\d/.test(newPassword)) {
            setPasswordError(t('passwordNeedNumber'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError(t('passwordMismatch'));
            return;
        }

        setIsChangingPassword(true);

        try {
            const response = await api.changePassword(currentPassword, newPassword);
            if (response.success) {
                setPasswordSuccess(t('passwordChanged'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setShowPasswordForm(false);
            } else {
                setPasswordError(response.error?.message || t('passwordChangeFailed'));
            }
        } catch {
            setPasswordError(t('somethingWentWrong'));
        } finally {
            setIsChangingPassword(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN');
    };

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Main */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <h1>{t('title')}</h1>
                    <Link href="/complete-profile" className="btn btn-primary">
                        {t('editProfile')}
                    </Link>
                </div>

                <div className={styles.card}>
                    {/* Profile Header */}
                    <div className={styles.profileHeader}>
                        <div className={styles.profileAvatar}>
                            {profile?.name?.charAt(0).toUpperCase() || <span className="material-icons" style={{ fontSize: 32 }}>person</span>}
                        </div>
                        <div className={styles.profileInfo}>
                            <h2>{profile?.name || t('noName')}</h2>
                            <p>{profile?.phone}</p>
                            {profile?.email && <p className={styles.email}>{profile.email}</p>}
                        </div>
                    </div>

                    {/* Category */}
                    {profile?.category && (
                        <div className={styles.section}>
                            <h3>{t('category')}</h3>
                            <p className={styles.categoryBadge}>
                                <span className="material-icons" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginRight: 4 }}>{getCategoryLabel(profile.category).icon}</span>
                                {getCategoryLabel(profile.category).label}
                            </p>
                        </div>
                    )}

                    {/* Address */}
                    <div className={styles.section}>
                        <h3>{t('address')}</h3>
                        {profile?.address && (profile.address.line1 || profile.address.city) ? (
                            <div className={styles.address}>
                                {profile.address.line1 && <p>{profile.address.line1}</p>}
                                {profile.address.line2 && <p>{profile.address.line2}</p>}
                                {(profile.address.city || profile.address.state) && (
                                    <p>
                                        {[profile.address.city, profile.address.state].filter(Boolean).join(', ')}
                                        {profile.address.pincode && ` - ${profile.address.pincode}`}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className={styles.noData}>{t('noAddress')}</p>
                        )}
                    </div>

                    {/* Account Info */}
                    <div className={styles.section}>
                        <h3>{t('account')}</h3>
                        <div className={styles.accountInfo}>
                            <div className={styles.infoRow}>
                                <span>{t('memberSince')}</span>
                                <span>{formatDate(profile?.createdAt || '')}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span>{t('profileStatus')}</span>
                                <span className={profile?.profileComplete ? styles.complete : styles.incomplete}>
                                    {profile?.profileComplete ? <><span className="material-icons" style={{ fontSize: 14, verticalAlign: 'text-bottom', marginRight: 2 }}>check_circle</span> {t('complete')}</> : t('incomplete')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Password Change */}
                    <div className={styles.section}>
                        <h3>{t('security')}</h3>
                        {passwordSuccess && (
                            <div className={styles.successMessage}>{passwordSuccess}</div>
                        )}
                        {!showPasswordForm ? (
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPasswordForm(true)}
                            >
                                <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'text-bottom', marginRight: 4 }}>lock</span> {t('changePassword')}
                            </button>
                        ) : (
                            <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
                                {passwordError && (
                                    <div className={styles.errorMessage}>{passwordError}</div>
                                )}
                                <div className="input-group">
                                    <label className="input-label">{t('currentPassword')}</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('newPassword')}</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder={t('passwordHint')}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">{t('confirmNewPassword')}</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className={styles.passwordActions}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowPasswordForm(false);
                                            setPasswordError('');
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setConfirmPassword('');
                                        }}
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isChangingPassword}
                                    >
                                        {isChangingPassword ? t('changing') : t('changePassword')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
