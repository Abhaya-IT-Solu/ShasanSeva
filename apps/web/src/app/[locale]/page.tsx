'use client';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import styles from './page.module.css';
import Footer from '@/components/Footer/Footer';
import { useState } from 'react';

// Category data with Material Icons (matching Stitch design)
const CATEGORIES = [
    { id: 'FARMER', icon: 'agriculture', isNew: true },
    { id: 'STUDENT', icon: 'school', isNew: false },
    { id: 'HEALTH', icon: 'health_and_safety', isNew: false },
    { id: 'LOAN', icon: 'account_balance_wallet', isNew: true },
    { id: 'CERTIFICATE', icon: 'home_work', isNew: false },
    { id: 'WOMEN', icon: 'family_restroom', isNew: false },
    { id: 'EMPLOYMENT', icon: 'engineering', isNew: false },
    { id: 'SENIOR', icon: 'commute', isNew: false },
    { id: 'OTHER', icon: 'bolt', isNew: false },
];

// Explore items matching Stitch gradient card design
const EXPLORE_ITEMS = [
    { key: 'examResults', icon: 'emoji_events', gradient: 'greenGradient', href: '/explore/results' },
    { key: 'jobNotifications', icon: 'work', gradient: 'orangeGradient', href: '/explore/jobs' },
    { key: 'newsUpdates', icon: 'article', gradient: 'slateGradient', href: '/explore/news' },
    { key: 'importantDates', icon: 'calendar_month', gradient: 'greenGradient2', href: '/explore/dates' },
];

export default function HomePage() {
    const router = useRouter();
    const t = useTranslations('HomePage');
    const tCat = useTranslations('Categories');
    const tExplore = useTranslations('Explore');
    const locale = useLocale();
    const [searchQuery, setSearchQuery] = useState('');

    const handleCategoryClick = (categoryId: string) => {
        router.push(`/${locale}/schemes?category=${categoryId}`);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/${locale}/schemes?search=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div className={styles.page}>
            {/* Hero Section with Search */}
            <header className={styles.hero}>
                <div className={styles.heroPattern}></div>
                <div className={styles.heroContent}>
                    {/* Announcement Badge */}
                    <div className={styles.announcementBadge}>
                        <span className={styles.pulseDot}></span>
                        {t('announcementBadge')}
                    </div>

                    <h1 className={styles.heroTitle}>
                        {t('heroTitle')} <br />
                        <span className={styles.heroTitleSub}>{t('heroSubtitle')}</span>
                    </h1>
                    <p className={styles.heroDescription}>
                        {t('heroDescription')}
                    </p>

                    {/* Search Bar */}
                    <form className={styles.searchBar} onSubmit={handleSearch}>
                        <div className={styles.searchIconWrapper}>
                            <span className="material-icons">search</span>
                        </div>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={t('searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className={styles.searchBtn}>
                            {t('findButton')}
                        </button>
                    </form>

                    {/* Popular Searches */}
                    <div className={styles.popularSearches}>
                        <span className={styles.popularLabel}>{t('popular')}:</span>
                        <Link href="/schemes?category=FARMER" className={styles.popularLink}>PM Kisan</Link>
                        <Link href="/schemes?category=CERTIFICATE" className={styles.popularLink}>Ration Card</Link>
                        <Link href="/schemes?category=STUDENT" className={styles.popularLink}>{t('scholarships')}</Link>
                    </div>
                </div>
            </header>

            {/* Services Grid Section */}
            <section className={styles.servicesSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeaderRow}>
                        <div>
                            <h2 className={styles.sectionTitle}>{t('ourServices')}</h2>
                            <p className={styles.sectionSubtitle}>{t('ourServicesSubtitle')}</p>
                        </div>
                        <Link href="/schemes" className={styles.viewAllBtn}>
                            {t('viewAllCategories')} <span className="material-icons" style={{ fontSize: 16 }}>arrow_forward</span>
                        </Link>
                    </div>

                    <div className={styles.servicesGrid}>
                        {CATEGORIES.map((category) => (
                            <div
                                key={category.id}
                                className={styles.serviceCard}
                                onClick={() => handleCategoryClick(category.id)}
                            >
                                <div className={styles.serviceCardTop}>
                                    <div className={styles.serviceIconBox}>
                                        <span className="material-icons">{category.icon}</span>
                                    </div>
                                    {category.isNew && (
                                        <span className={styles.newBadge}>{t('newBadge')}</span>
                                    )}
                                </div>
                                <h3 className={styles.serviceCardTitle}>
                                    {tCat(`${category.id}.name`)}
                                </h3>
                                <p className={styles.serviceCardDesc}>
                                    {tCat(`${category.id}.description`)}
                                </p>
                                <span className={styles.serviceCardLink}>
                                    {t('viewSchemes')} <span className="material-icons" style={{ fontSize: 14 }}>arrow_forward</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mobile App Showcase Section */}
            <section className={styles.appShowcase}>
                <div className={styles.appShowcaseBg}>
                    <div className={styles.bgBlob1}></div>
                    <div className={styles.bgBlob2}></div>
                </div>
                <div className={`${styles.container} ${styles.appShowcaseInner}`}>
                    <div className={styles.appShowcaseText}>
                        <span className={styles.comingSoonBadge}>{t('comingSoon')}</span>
                        <h2 className={styles.appTitle}>
                            {t('mobileAppTitle')}
                        </h2>
                        <p className={styles.appDescription}>
                            {t('mobileAppDescription')}
                        </p>
                        {/* Feature Cards (glassmorphic) */}
                        <div className={styles.featureCards}>
                            <div className={styles.featureCard}>
                                <span className={`material-icons ${styles.featureCardIcon}`}>notifications_active</span>
                                <div>
                                    <div className={styles.featureCardTitle}>{t('feature1')}</div>
                                    <div className={styles.featureCardSub}>{t('schemeUpdates')}</div>
                                </div>
                            </div>
                            <div className={styles.featureCard}>
                                <span className={`material-icons ${styles.featureCardIcon}`}>fingerprint</span>
                                <div>
                                    <div className={styles.featureCardTitle}>{t('feature2')}</div>
                                    <div className={styles.featureCardSub}>{t('secureAccess')}</div>
                                </div>
                            </div>
                        </div>
                        <button className={styles.waitlistBtn}>{t('joinWaitlist')}</button>
                    </div>

                    {/* Phone Mockup */}
                    <div className={styles.appShowcaseImage}>
                        <div className={styles.phoneMockup}>
                            <div className={styles.phoneNotch}></div>
                            <div className={styles.phoneScreen}>
                                <div className={styles.phoneHeader}>
                                    <div>
                                        <div className={styles.phoneGreeting}>Hello,</div>
                                        <div className={styles.phoneUserName}>Rajesh Kumar</div>
                                    </div>
                                    <div className={styles.phoneAvatar}>
                                        <span className="material-icons" style={{ fontSize: 14 }}>person</span>
                                    </div>
                                </div>
                                <div className={styles.phoneContent}>
                                    <div className={styles.phoneStatusCard}>
                                        <div className={styles.phoneStatusRow}>
                                            <span className={styles.phoneStatusLabel}>Status</span>
                                            <span className={styles.phoneStatusBadge}>Active</span>
                                        </div>
                                        <div className={styles.phoneScheme}>PM Kisan Samman</div>
                                        <div className={styles.phoneSchemeNote}>Next installment due in 12 days</div>
                                    </div>
                                    <div className={styles.phoneQuickActions}>
                                        <div className={styles.phoneAction}>
                                            <span className="material-icons" style={{ color: 'var(--color-primary)' }}>description</span>
                                            <span>Docs</span>
                                        </div>
                                        <div className={styles.phoneAction}>
                                            <span className="material-icons" style={{ color: 'var(--color-secondary)' }}>qr_code</span>
                                            <span>Scan</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.phoneFab}>
                                    <span className="material-icons">add</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Explore More Section */}
            <section className={styles.exploreSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeaderCenter}>
                        <h2 className={styles.sectionTitle}>{t('exploreMore')}</h2>
                        <p className={styles.sectionSubtitle}>{t('exploreSubtitle')}</p>
                    </div>
                    <div className={styles.exploreGrid}>
                        {EXPLORE_ITEMS.map((item) => (
                            <Link key={item.key} href={item.href} className={styles.exploreCard}>
                                <div className={`${styles.exploreCardHeader} ${styles[item.gradient]}`}>
                                    <span className={`material-icons ${styles.exploreHeaderIcon}`}>{item.icon}</span>
                                    <h3 className={styles.exploreCardTitle}>
                                        {tExplore(`${item.key}.title`)}
                                    </h3>
                                </div>
                                <div className={styles.exploreCardBody}>
                                    <p className={styles.exploreCardDesc}>
                                        {tExplore(`${item.key}.description`)}
                                    </p>
                                    <span className={styles.exploreCardLink}>
                                        {t('learnMore')}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
