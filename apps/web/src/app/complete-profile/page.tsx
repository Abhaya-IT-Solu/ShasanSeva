'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './complete-profile.module.css';

const CATEGORIES = [
    { value: 'STUDENT', label: 'Student', icon: '🎓' },
    { value: 'FARMER', label: 'Farmer', icon: '🌾' },
    { value: 'LOAN_CANDIDATE', label: 'Loan Applicant', icon: '💰' },
    { value: 'OTHER', label: 'Other', icon: '📋' },
];

export default function CompleteProfilePage() {
    const router = useRouter();
    const { user, refreshUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
            setError('Please enter your name');
            return;
        }

        // Phone is required for OAuth users
        if (needsPhone && !/^[6-9]\d{9}$/.test(formData.phone)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        if (!formData.category) {
            setError('Please select a category');
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
                router.push('/dashboard');
            } else {
                setError(response.error?.message || 'Failed to update profile');
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <span className={styles.icon}>👤</span>
                    <h1>Complete Your Profile</h1>
                    <p>Tell us a bit about yourself to get personalized scheme recommendations</p>
                </div>

                {error && (
                    <div className={styles.error}>{error}</div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Name */}
                    <div className="input-group">
                        <label htmlFor="name" className="input-label">
                            Full Name *
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            className="input"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Email */}
                    <div className="input-group">
                        <label htmlFor="email" className="input-label">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="input"
                            placeholder="Enter your email (optional)"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Phone - Only for OAuth users who don't have phone */}
                    {needsPhone && (
                        <div className="input-group">
                            <label htmlFor="phone" className="input-label">
                                Mobile Number *
                            </label>
                            <div className={styles.phoneInput}>
                                <span className={styles.countryCode}>+91</span>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    className="input"
                                    placeholder="Enter 10-digit mobile number"
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
                        <label className="input-label">I am a... *</label>
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
                                    <span className={styles.categoryLabel}>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Address (Optional) */}
                    <div className={styles.addressSection}>
                        <label className="input-label">Address (Optional)</label>
                        <div className={styles.addressGrid}>
                            <input
                                name="address.line1"
                                type="text"
                                className="input"
                                placeholder="Address Line 1"
                                value={formData.address.line1}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.line2"
                                type="text"
                                className="input"
                                placeholder="Address Line 2"
                                value={formData.address.line2}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.city"
                                type="text"
                                className="input"
                                placeholder="City"
                                value={formData.address.city}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.state"
                                type="text"
                                className="input"
                                placeholder="State"
                                value={formData.address.state}
                                onChange={handleInputChange}
                                disabled={isLoading}
                            />
                            <input
                                name="address.pincode"
                                type="text"
                                className="input"
                                placeholder="Pincode"
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
                        {isLoading ? <span className="spinner" /> : 'Complete Profile'}
                    </button>

                    {/* Skip for now */}
                    <button
                        type="button"
                        className={styles.skipBtn}
                        onClick={() => router.push('/dashboard')}
                        disabled={isLoading}
                    >
                        Skip for now
                    </button>
                </form>
            </div>
        </div>
    );
}
