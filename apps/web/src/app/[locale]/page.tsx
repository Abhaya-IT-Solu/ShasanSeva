'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import styles from './page.module.css';
import Footer from '@/components/Footer/Footer';

// Category data with translation keys
const CATEGORIES = [
    { id: 'STUDENT', icon: '🎓', color: '#00897B', isNew: true, imageLink: '/images/graduation.gif' },
    { id: 'FARMER', icon: '🌾', color: '#EF6C00', isNew: true, imageLink: '/images/tractor.gif' },
    { id: 'LOAN', icon: '💰', color: '#6A1B9A', isNew: false, imageLink: '/images/loan.gif' },
    { id: 'CERTIFICATE', icon: '📜', color: '#1E88E5', isNew: false, imageLink: '/images/stamp.gif' },
    { id: 'EMPLOYMENT', icon: '💼', color: '#D32F2F', isNew: false, imageLink: null },
    { id: 'HEALTH', icon: '🏥', color: '#388E3C', isNew: false, imageLink: null },
    { id: 'WOMEN', icon: '👩', color: '#E91E63', isNew: true, imageLink: null },
    { id: 'SENIOR', icon: '👴', color: '#795548', isNew: false, imageLink: null },
    { id: 'OTHER', icon: '📋', color: '#9C27B0', isNew: false, imageLink: null },
];

// Explore items with translation keys
const EXPLORE_ITEMS = [
    { key: 'examResults', icon: '📝', href: '/explore/results', color: '#2563eb' },
    { key: 'jobNotifications', icon: '💼', href: '/explore/jobs', color: '#059669' },
    { key: 'newsUpdates', icon: '📰', href: '/explore/news', color: '#d97706' },
    { key: 'importantDates', icon: '📅', href: '/explore/dates', color: '#dc2626' },
];

export default function HomePage() {
    const router = useRouter();
    const t = useTranslations('HomePage');
    const tCat = useTranslations('Categories');
    const tExplore = useTranslations('Explore');
    const locale = useLocale();

    const handleCategoryClick = (categoryId: string) => {
        router.push(`/${locale}/schemes?category=${categoryId}`);
    };

    return (
        <div className={styles.page}>
            {/* Categories Grid Section */}
            <section className={styles.categoriesSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t('ourServices')}</h2>
                        <p className={styles.sectionSubtitle}>
                            {t('ourServicesSubtitle')}
                        </p>
                    </div>

                    {/* Cards Grid */}
                    <div className={styles.cardsGrid}>
                        {CATEGORIES.map((category) => (
                            <div
                                key={category.id}
                                className={styles.gridCard}
                                onClick={() => handleCategoryClick(category.id)}
                            >
                                <div className={styles.cardInner}>
                                    <div className={styles.cardAccent} style={{ backgroundColor: category.color }}></div>
                                    {category.isNew && (
                                        <div className={styles.cardBadge}>
                                            <span className={styles.newBadge}>{t('newBadge')}</span>
                                        </div>
                                    )}
                                    <div className={styles.cardContent}>
                                        <div
                                            className={styles.cardIconLarge}
                                            style={{ backgroundColor: `${category.color}15` }}
                                        >
                                            {category.imageLink ? (
                                                <Image src={category.imageLink} alt={tCat(`${category.id}.name`)} className={styles.cardImage} width={96} height={96} />
                                            ) : (
                                                <span className={styles.iconEmoji}>{category.icon}</span>
                                            )}
                                        </div>
                                        <h3 className={styles.cardTitle} style={{ color: category.color }}>
                                            {tCat(`${category.id}.name`)}
                                        </h3>
                                        <p className={styles.cardDescription}>
                                            {tCat(`${category.id}.description`)}
                                        </p>
                                        <div className={styles.cardAction} style={{ color: category.color }}>
                                            <span>{t('viewSchemes')}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mobile App Showcase Section */}
            <section className={styles.appShowcase}>
                <div className={styles.container}>
                    <div className={styles.appShowcaseContent}>
                        <div className={styles.appShowcaseText}>
                            <span className={styles.appBadge}>📱 {t('comingSoon')}</span>
                            <h2 className={styles.appTitle}>
                                {t('mobileAppTitle')}
                            </h2>
                            <p className={styles.appDescription}>
                                {t('mobileAppDescription')}
                            </p>
                            <div className={styles.appFeatures}>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>{t('feature1')}</span>
                                </div>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>{t('feature2')}</span>
                                </div>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>{t('feature3')}</span>
                                </div>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>{t('feature4')}</span>
                                </div>
                            </div>
                            <div className={styles.storeButtons}>
                                <button className={styles.storeBtn} disabled>
                                    <span className={styles.storeIcon}>🍎</span>
                                    <span className={styles.storeText}>
                                        <span className={styles.storeLabel}>{t('downloadOn')}</span>
                                        <span className={styles.storeName}>App Store</span>
                                    </span>
                                </button>
                                <button className={styles.storeBtn} disabled>
                                    <span className={styles.storeIcon}>▶️</span>
                                    <span className={styles.storeText}>
                                        <span className={styles.storeLabel}>{t('getItOn')}</span>
                                        <span className={styles.storeName}>Google Play</span>
                                    </span>
                                </button>
                            </div>
                        </div>
                        <div className={styles.appShowcaseImage}>
                            <div className={styles.phoneMockup}>
                                <div className={styles.phoneScreen}>
                                    <div className={styles.mockupContent}>
                                        <span className={styles.mockupLogo}>🏛️</span>
                                        <span className={styles.mockupText}>ShasanSeva</span>
                                        <span className={styles.mockupSubtext}>{t('yourHelper')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Explore More Section */}
            <section className={styles.exploreSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t('exploreMore')}</h2>
                        <p className={styles.sectionSubtitle}>
                            {t('exploreSubtitle')}
                        </p>
                    </div>
                    <div className={styles.exploreGrid}>
                        {EXPLORE_ITEMS.map((item) => (
                            <Link key={item.key} href={item.href} className={styles.exploreCard}>
                                <div className={styles.exploreIconWrapper} style={{ background: `${item.color}15` }}>
                                    <span className={styles.exploreIcon}>{item.icon}</span>
                                </div>
                                <h3 className={styles.exploreTitle} style={{ color: item.color }}>
                                    {tExplore(`${item.key}.title`)}
                                </h3>
                                <p className={styles.exploreDescription}>{tExplore(`${item.key}.description`)}</p>
                                <span className={styles.exploreLink} style={{ color: item.color }}>
                                    {t('learnMore')} →
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <Footer />
        </div>
    );
}
