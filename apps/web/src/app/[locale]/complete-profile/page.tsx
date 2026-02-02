'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './complete-profile.module.css';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const t = useTranslations('CompleteProfilePage');
    const tCat = useTranslations('Categories');
    const locale = useLocale();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const CATEGORIES = [
        { value: 'STUDENT', icon: '🎓' },
        { value: 'FARMER', icon: '🌾' },
        { value: 'LOAN_CANDIDATE', icon: '💰' },
        { value: 'OTHER', icon: '📋' },
    ];

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        category: '',
        address: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            pincode: '',
        },
    });

    // Check if phone is needed (OAuth users have empty phone)
    const [needsPhone, setNeedsPhone] = useState(false);

    // Pre-fill from user if available
    useEffect(() => {
        if (user?.name) setFormData(prev => ({ ...prev, name: user.name || '' }));
        if (user?.email) setFormData(prev => ({ ...prev, email: user.email || '' }));
        if (user?.phone) setFormData(prev => ({ ...prev, phone: user.phone || '' }));
        // If phone is empty, OAuth user needs to add it
        if (!user?.phone || user.phone === '') {
            setNeedsPhone(true);
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name.startsWith('address.')) {
            const addressField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                address: { ...prev.address, [addressField]: value },
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCategorySelect = (category: string) => {
        setFormData(prev => ({ ...prev, category }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError(t('errorName'));
            return;
        }

        // Phone is required for OAuth users
        if (needsPhone && !/^[6-9]\d{9}$/.test(formData.phone)) {
            setError(t('errorPhone'));
            return;
        }

        if (!formData.category) {
            setError(t('errorCategory'));
            return;
        }

        setIsLoading(true);

        try {
            const response = await api.updateProfile({
                name: formData.name.trim(),
                email: formData.email.trim() || undefined,
                phone: needsPhone ? formData.phone.trim() : undefined,
                category: formData.category,
                address: {
                    line1: formData.address.line1.trim() || undefined,
                    line2: formData.address.line2.trim() || undefined,
                    city: formData.address.city.trim() || undefined,
                    state: formData.address.state.trim() || undefined,
                    pincode: formData.address.pincode.trim() || undefined,
                },
            });

            if (response.success) {
                await refreshUser();
                router.push(`/${locale}/orders`);
            } else {
                setError(response.error?.message || t('updateFailed'));
            }
        } catch {
            setError(t('somethingWentWrong'));
        } finally {
            setIsLoading(false);
        }
    };

    const getCategoryLabel = (value: string) => {
        try {
            return tCat(`${value}.name` as any);
        } catch {
            return value;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <span className={styles.icon}>👤</span>
                    <h1>{t('title')}</h1>
                    <p>{t('subtitle')}</p>
                </div>

                {error && (
                    <div className={styles.error}>{error}</div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Name */}
                    <div className="input-group">
                        <label htmlFor="name" className="input-label">
                            {t('fullName')} *
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            className="input"
                            placeholder={t('fullNamePlaceholder')}
                            value={formData.name}
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Email */}
                    <div className="input-group">
                        <label htmlFor="email" className="input-label">
                            {t('email')}
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="input"
                            placeholder={t('emailPlaceholder')}
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Phone - Only for OAuth users who don't have phone */}
                    {needsPhone && (
                        <div className="input-group">
                            <label htmlFor="phone" className="input-label">
                                {t('mobileNumber')} *
                            </label>
                            <div className={styles.phoneInput}>
                                <span className={styles.countryCode}>+91</span>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    className="input"
                                    placeholder={t('mobilePlaceholder')}
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        phone: e.target.value.replace(/\D/g, '').slice(0, 10)
                                    }))}
                                    maxLength={10}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                    {/* Category Selection */}
                    <div className={styles.categorySection}>
                        <label className="input-label">{t('iAmA')} *</label>
                        <div className={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    className={`${styles.categoryCard} ${formData.category === cat.value ? styles.selected : ''
                                        }`}
                                    onClick={() => handleCategorySelect(cat.value)}
                                    disabled={isLoading}
                                >
                                    <span className={styles.categoryIcon}>{cat.icon}</span>
                                    <span className={styles.categoryLabel}>{getCategoryLabel(cat.value)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Address (Optional) */}
                    <div className={styles.addressSection}>
                        <label className="input-label">{t('address')}</label>
                        <div className={styles.addressGrid}>
                            <input
                                name="address.line1"
                                type="text"
                                className="input"
                                placeholder={t('addressLine1')}
                                value={formData.address.line1}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.line2"
                                type="text"
                                className="input"
                                placeholder={t('addressLine2')}
                                value={formData.address.line2}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.city"
                                type="text"
                                className="input"
                                placeholder={t('city')}
                                value={formData.address.city}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.state"
                                type="text"
                                className="input"
                                placeholder={t('state')}
                                value={formData.address.state}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.pincode"
                                type="text"
                                className="input"
                                placeholder={t('pincode')}
                                pattern="\d{6}"
                                maxLength={6}
                                value={formData.address.pincode}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-full"
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="spinner" /> : t('completeProfile')}
                    </button>

                    {/* Skip for now */}
                    <button
                        type="button"
                        className={styles.skipBtn}
                        onClick={() => router.push(`/${locale}/orders`)}
                        disabled={isLoading}
                    >
                        {t('skipForNow')}
                    </button>
                </form>
            </div>
        </div>
    );
}
