'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
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

const CATEGORY_LABELS: Record<string, string> = {
    STUDENT: '🎓 Student',
    FARMER: '🌾 Farmer',
    LOAN_CANDIDATE: '💰 Loan Applicant',
    OTHER: '📋 Other',
};

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);

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

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>🏛️</span>
                    ShasanSetu
                </Link>

                <div className={styles.userMenuWrapper}>
                    <button
                        className={styles.userMenuBtn}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className={styles.avatar}>
                            {user?.name?.charAt(0).toUpperCase() || '👤'}
                        </div>
                        <span className={styles.chevron}>▼</span>
                    </button>

                    {showUserMenu && (
                        <div className={styles.dropdown}>
                            <Link href="/dashboard" className={styles.dropdownItem}>
                                📊 Dashboard
                            </Link>
                            <button onClick={logout} className={styles.dropdownItem}>
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <h1>My Profile</h1>
                    <Link href="/complete-profile" className="btn btn-primary">
                        Edit Profile
                    </Link>
                </div>

                <div className={styles.card}>
                    {/* Profile Header */}
                    <div className={styles.profileHeader}>
                        <div className={styles.profileAvatar}>
                            {profile?.name?.charAt(0).toUpperCase() || '👤'}
                        </div>
                        <div className={styles.profileInfo}>
                            <h2>{profile?.name || 'No name set'}</h2>
                            <p>{profile?.phone}</p>
                            {profile?.email && <p className={styles.email}>{profile.email}</p>}
                        </div>
                    </div>

                    {/* Category */}
                    {profile?.category && (
                        <div className={styles.section}>
                            <h3>Category</h3>
                            <p className={styles.categoryBadge}>
                                {CATEGORY_LABELS[profile.category] || profile.category}
                            </p>
                        </div>
                    )}

                    {/* Address */}
                    <div className={styles.section}>
                        <h3>Address</h3>
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
                            <p className={styles.noData}>No address added</p>
                        )}
                    </div>

                    {/* Account Info */}
                    <div className={styles.section}>
                        <h3>Account</h3>
                        <div className={styles.accountInfo}>
                            <div className={styles.infoRow}>
                                <span>Member since</span>
                                <span>{new Date(profile?.createdAt || '').toLocaleDateString()}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <span>Profile status</span>
                                <span className={profile?.profileComplete ? styles.complete : styles.incomplete}>
                                    {profile?.profileComplete ? '✓ Complete' : 'Incomplete'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
