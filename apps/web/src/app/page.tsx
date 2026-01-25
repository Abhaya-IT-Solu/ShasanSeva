'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './page.module.css';

// Category data matching ShashanSeva
const CATEGORIES = [
    {
        id: 'STUDENT',
        name: 'Student Schemes',
        nameHi: 'विद्यार्थी योजना',
        description: 'Scholarships, education loans, and skill development programs for students.',
        icon: '🎓',
        color: '#00897B',
        isNew: true,
    },
    {
        id: 'FARMER',
        name: 'Farmer Schemes',
        nameHi: 'शेतकरी योजना',
        description: 'Agricultural support, subsidies, and credit facilities for farmers.',
        icon: '🌾',
        color: '#EF6C00',
        isNew: true,
    },
    {
        id: 'LOAN',
        name: 'Loan Schemes',
        nameHi: 'कर्ज योजना',
        description: 'Business loans, personal loans, and financial assistance programs.',
        icon: '💰',
        color: '#6A1B9A',
        isNew: false,
    },
    {
        id: 'CERTIFICATE',
        name: 'Important Certificates',
        nameHi: 'महत्त्वाची प्रमाणपत्रे',
        description: 'Essential documents for various government and legal procedures.',
        icon: '📜',
        color: '#1E88E5',
        isNew: false,
    },
    {
        id: 'EMPLOYMENT',
        name: 'Employment Schemes',
        nameHi: 'रोजगार योजना',
        description: 'Job assistance, skill training, and employment generation schemes.',
        icon: '💼',
        color: '#D32F2F',
        isNew: false,
    },
    {
        id: 'HEALTH',
        name: 'Health Schemes',
        nameHi: 'आरोग्य योजना',
        description: 'Health insurance, medical assistance, and wellness programs.',
        icon: '🏥',
        color: '#388E3C',
        isNew: false,
    },
];

// Duplicate for seamless marquee
const MARQUEE_CATEGORIES = [...CATEGORIES, ...CATEGORIES];

export default function HomePage() {
    const { isAuthenticated, user, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const handleCategoryClick = (categoryId: string) => {
        router.push(`/schemes?category=${categoryId}`);
    };

    useEffect(() => {
        const handleClick = () => setShowUserMenu(false);
        if (showUserMenu) {
            document.addEventListener('click', handleClick);
            return () => document.removeEventListener('click', handleClick);
        }
    }, [showUserMenu]);

    return (
        <div className={styles.page}>
            {/* Utility Top Bar */}
            <div className="utility-bar">
                <div className={styles.container}>
                    <div className={styles.utilityContent}>
                        <div className={styles.utilityLeft}>
                            <a href="https://wa.me/919876543210" className="utility-bar-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                </svg>
                                +91 98765 43210
                            </a>
                            <a href="tel:1800123456" className="utility-bar-icon" style={{ marginLeft: '16px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                </svg>
                                Helpline: 1800-123-456
                            </a>
                        </div>
                        <div className="language-selector">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.790.895L15.383 16h-4.764l-.723 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z" clipRule="evenodd" />
                            </svg>
                            English
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Navigation */}
            <nav className={styles.navbar}>
                <div className={styles.container}>
                    <div className={styles.navContent}>
                        <Link href="/" className={styles.logo}>
                            ShasanSetu
                        </Link>
                        <div className={styles.navLinks}>
                            <Link href="/schemes" className={styles.navLink}>Browse Schemes</Link>
                            <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
                            <Link href="/admin" className={styles.navLinkMuted}>Admin</Link>
                        </div>
                        <div className={styles.navActions}>
                            {authLoading ? (
                                <div className="spinner" style={{ width: 20, height: 20 }} />
                            ) : isAuthenticated ? (
                                <div className={styles.userMenuWrapper}>
                                    <button
                                        className={styles.userBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowUserMenu(!showUserMenu);
                                        }}
                                    >
                                        <div className={styles.avatar}>
                                            {user?.name?.charAt(0).toUpperCase() || '👤'}
                                        </div>
                                    </button>
                                    {showUserMenu && (
                                        <div className={styles.dropdown}>
                                            <Link href="/dashboard" className={styles.dropdownItem}>📊 Dashboard</Link>
                                            <Link href="/profile" className={styles.dropdownItem}>👤 Profile</Link>
                                            <button onClick={logout} className={styles.dropdownItem}>🚪 Logout</button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link href="/login" className={styles.primaryBtn}>
                                    Get Started
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Categories Section with Marquee */}
            <section className={styles.categoriesSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Our Services</h2>
                        <p className={styles.sectionSubtitle}>
                            Browse schemes by category and find the right support for your needs
                        </p>
                    </div>
                </div>

                {/* Marquee Carousel */}
                <div className="marquee-container">
                    <div className="marquee-content animate-marquee-horizontal">
                        {MARQUEE_CATEGORIES.map((category, index) => (
                            <div
                                key={`${category.id}-${index}`}
                                className="category-card-large hover-shine"
                                onClick={() => handleCategoryClick(category.id)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="category-card-top-accent" style={{ backgroundColor: category.color }}></div>
                                {category.isNew && (
                                    <div className="category-card-badge">
                                        <span className="badge-new">NEW</span>
                                    </div>
                                )}
                                <div style={{ position: 'relative', zIndex: 10, textAlign: 'center' }}>
                                    <div
                                        style={{
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 16px',
                                            backgroundColor: `${category.color}15`,
                                            fontSize: '2.5rem',
                                            transition: 'transform 0.3s ease',
                                        }}
                                    >
                                        {category.icon}
                                    </div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: category.color }}>
                                        {category.name}
                                    </h3>
                                    <p style={{ fontSize: '13px', color: '#424242', marginBottom: '16px', lineHeight: 1.5 }}>
                                        {category.description}
                                    </p>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: category.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span>View Schemes</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroBlobs}>
                    <div className={styles.blob1}></div>
                    <div className={styles.blob2}></div>
                </div>
                <div className={styles.container}>
                    <div className={styles.heroContent}>
                        <span className={styles.heroBadge}>
                            🚀 Find the right opportunities for you
                        </span>
                        <h1 className={styles.heroTitle}>
                            Find the Right <span style={{ color: 'var(--color-primary)' }}>Scheme</span> for You
                        </h1>
                        <p className={styles.heroSubtitle}>
                            Discover government and private schemes for students, farmers, and loan applicants.
                            Get personalized assistance for successful applications.
                        </p>
                        <div className={styles.heroCta}>
                            <Link href="/schemes" className={styles.primaryBtn}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                                Browse Schemes
                            </Link>
                            <Link href="/login" className={styles.secondaryBtn}>
                                Get Assistance
                            </Link>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber} style={{ color: 'var(--color-primary)' }}>50+</div>
                            <div className={styles.statLabel}>Active Schemes</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber} style={{ color: 'var(--color-success)' }}>10,000+</div>
                            <div className={styles.statLabel}>People Helped</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statNumber} style={{ color: 'var(--color-primary)' }}>95%</div>
                            <div className={styles.statLabel}>Success Rate</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* What's New Section */}
            <section className="whats-new-section">
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>What&apos;s New?</h2>
                        <p className={styles.sectionSubtitle}>Latest updates and new scheme announcements</p>
                    </div>

                    <div className="whats-new-list">
                        <div className="whats-new-item">
                            <div className="whats-new-date">24 Jan</div>
                            <div className="whats-new-content">
                                <div className="whats-new-title">CM Scholarship Scheme - New Guidelines</div>
                                <div className="whats-new-description">
                                    Updated eligibility criteria and application process for technical education scholarships
                                </div>
                            </div>
                        </div>
                        <div className="whats-new-item">
                            <div className="whats-new-date">20 Jan</div>
                            <div className="whats-new-content">
                                <div className="whats-new-title">Solar Agriculture Pump Scheme - Subsidy Increased</div>
                                <div className="whats-new-description">
                                    90% subsidy now available for farmers under the solar energy pump scheme
                                </div>
                            </div>
                        </div>
                        <div className="whats-new-item">
                            <div className="whats-new-date">15 Jan</div>
                            <div className="whats-new-content">
                                <div className="whats-new-title">Women Entrepreneur Loan Scheme Launched</div>
                                <div className="whats-new-description">
                                    Special loan facility for women starting their own business
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className={styles.ctaSection}>
                <div className={styles.container}>
                    <h2 className={styles.ctaTitle}>Ready to find the right scheme?</h2>
                    <p className={styles.ctaSubtitle}>
                        Thousands of people have benefited from various schemes with our help.
                    </p>
                    <div className={styles.ctaButtons}>
                        <Link href="/schemes" className={styles.ctaPrimaryBtn}>
                            Start Exploring
                        </Link>
                        <Link href="/login" className={styles.ctaSecondaryBtn}>
                            Contact Us
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.container}>
                    <div className={styles.footerGrid}>
                        <div className={styles.footerBrand}>
                            <h3 className={styles.footerLogo}>ShasanSetu</h3>
                            <p className={styles.footerDesc}>
                                Connecting citizens with opportunities. We help you find and apply for government and private schemes efficiently.
                            </p>
                            <div className={styles.footerContact}>
                                <div>📞 Helpline: 1800-123-456</div>
                                <div>📧 support@shasansetu.gov.in</div>
                            </div>
                        </div>
                        <div className={styles.footerLinks}>
                            <h4>Quick Links</h4>
                            <Link href="/schemes">All Schemes</Link>
                            <Link href="/schemes?category=STUDENT">Student Schemes</Link>
                            <Link href="/schemes?category=FARMER">Farmer Schemes</Link>
                            <Link href="/schemes?category=LOAN">Loan Schemes</Link>
                            <Link href="/schemes?category=CERTIFICATE">Important Certificates</Link>
                            <Link href="/schemes?category=JOBS">Jobs Assistance</Link>
                            <Link href="/schemes?category=HEALTH">Health Schemes</Link>
                            <Link href="/schemes?category=OTHER">Other Services</Link>
                        </div>
                        <div className={styles.footerLinks}>
                            <h4>Support</h4>
                            <Link href="/login">Get Assistance</Link>
                            <Link href="/dashboard">Dashboard</Link>
                            <Link href="/admin">Admin Login</Link>
                        </div>
                    </div>
                    <div className={styles.footerBottom}>
                        <p>© 2024 ShasanSetu. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
