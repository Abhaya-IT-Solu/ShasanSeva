'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Footer from '@/components/Footer/Footer';

// Category data
const CATEGORIES = [
    {
        id: 'STUDENT',
        name: 'Student Schemes',
        description: 'Scholarships, education loans, and skill development programs for students.',
        icon: '🎓',
        color: '#00897B',
        isNew: true,
        imageLink: '/images/graduation.gif'
    },
    {
        id: 'FARMER',
        name: 'Farmer Schemes',
        description: 'Agricultural support, subsidies, and credit facilities for farmers.',
        icon: '🌾',
        color: '#EF6C00',
        isNew: true,
        imageLink: '/images/tractor.gif'
    },
    {
        id: 'LOAN',
        name: 'Loan Schemes',
        description: 'Business loans, personal loans, and financial assistance programs.',
        icon: '💰',
        color: '#6A1B9A',
        isNew: false,
        imageLink: '/images/loan.gif'
    },
    {
        id: 'CERTIFICATE',
        name: 'Important Certificates',
        description: 'Essential documents for various government and legal procedures.',
        icon: '📜',
        color: '#1E88E5',
        isNew: false,
        imageLink: '/images/stamp.gif'
    },
    {
        id: 'EMPLOYMENT',
        name: 'Employment Schemes',
        description: 'Job assistance, skill training, and employment generation schemes.',
        icon: '💼',
        color: '#D32F2F',
        isNew: false,
        imageLink: null
    },
    {
        id: 'HEALTH',
        name: 'Health Schemes',
        description: 'Health insurance, medical assistance, and wellness programs.',
        icon: '🏥',
        color: '#388E3C',
        isNew: false,
        imageLink: null
    },
    {
        id: 'WOMEN',
        name: 'Women Welfare',
        description: 'Special schemes and programs designed for women empowerment.',
        icon: '👩',
        color: '#E91E63',
        isNew: true,
        imageLink: null
    },
    {
        id: 'SENIOR',
        name: 'Senior Citizens',
        description: 'Pension, healthcare, and welfare schemes for elderly citizens.',
        icon: '👴',
        color: '#795548',
        isNew: false,
        imageLink: null
    },
    {
        id: 'OTHER',
        name: 'Other Services',
        description: 'Miscellaneous government services and assistance programs.',
        icon: '📋',
        color: '#9C27B0',
        isNew: false,
        imageLink: null
    },
];

// Explore More Data
const EXPLORE_ITEMS = [
    {
        title: 'Exam Results',
        description: 'Check latest exam results across boards',
        icon: '📝',
        href: '/explore/results',
        color: '#2563eb',
    },
    {
        title: 'Job Notifications',
        description: 'Latest government job openings',
        icon: '💼',
        href: '/explore/jobs',
        color: '#059669',
    },
    {
        title: 'News & Updates',
        description: 'Government scheme announcements',
        icon: '📰',
        href: '/explore/news',
        color: '#d97706',
    },
    {
        title: 'Important Dates',
        description: 'Deadlines and application windows',
        icon: '📅',
        href: '/explore/dates',
        color: '#dc2626',
    },
];

export default function HomePage() {
    const router = useRouter();

    const handleCategoryClick = (categoryId: string) => {
        router.push(`/schemes?category=${categoryId}`);
    };

    return (
        <div className={styles.page}>
            {/* Categories Grid Section */}
            <section className={styles.categoriesSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Our Services</h2>
                        <p className={styles.sectionSubtitle}>
                            Browse schemes by category and find the right support for your needs
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
                                            <span className={styles.newBadge}>NEW</span>
                                        </div>
                                    )}
                                    <div className={styles.cardContent}>
                                        <div
                                            className={styles.cardIconLarge}
                                            style={{ backgroundColor: `${category.color}15` }}
                                        >
                                            {category.imageLink ? (
                                                <Image src={category.imageLink} alt={category.name} className={styles.cardImage} width={96} height={96} />
                                            ) : (
                                                <span className={styles.iconEmoji}>{category.icon}</span>
                                            )}
                                        </div>
                                        <h3 className={styles.cardTitle} style={{ color: category.color }}>
                                            {category.name}
                                        </h3>
                                        <p className={styles.cardDescription}>
                                            {category.description}
                                        </p>
                                        <div className={styles.cardAction} style={{ color: category.color }}>
                                            <span>View Schemes</span>
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
                            <span className={styles.appBadge}>📱 Coming Soon</span>
                            <h2 className={styles.appTitle}>
                                Get ShasanSeva on Your Mobile
                            </h2>
                            <p className={styles.appDescription}>
                                Apply for schemes, track applications, and receive instant updates - all from your smartphone. Download our mobile app for a seamless experience.
                            </p>
                            <div className={styles.appFeatures}>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>Quick scheme applications</span>
                                </div>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>Real-time status tracking</span>
                                </div>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>Push notifications</span>
                                </div>
                                <div className={styles.appFeature}>
                                    <span className={styles.featureIcon}>✓</span>
                                    <span>Document scanner</span>
                                </div>
                            </div>
                            <div className={styles.storeButtons}>
                                <button className={styles.storeBtn} disabled>
                                    <span className={styles.storeIcon}>🍎</span>
                                    <span className={styles.storeText}>
                                        <span className={styles.storeLabel}>Download on the</span>
                                        <span className={styles.storeName}>App Store</span>
                                    </span>
                                </button>
                                <button className={styles.storeBtn} disabled>
                                    <span className={styles.storeIcon}>▶️</span>
                                    <span className={styles.storeText}>
                                        <span className={styles.storeLabel}>Get it on</span>
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
                                        <span className={styles.mockupSubtext}>Your Government Helper</span>
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
                        <h2 className={styles.sectionTitle}>Explore More</h2>
                        <p className={styles.sectionSubtitle}>
                            Stay updated with the latest information
                        </p>
                    </div>
                    <div className={styles.exploreGrid}>
                        {EXPLORE_ITEMS.map((item) => (
                            <Link key={item.title} href={item.href} className={styles.exploreCard}>
                                <div className={styles.exploreIconWrapper} style={{ background: `${item.color}15` }}>
                                    <span className={styles.exploreIcon}>{item.icon}</span>
                                </div>
                                <h3 className={styles.exploreTitle} style={{ color: item.color }}>
                                    {item.title}
                                </h3>
                                <p className={styles.exploreDescription}>{item.description}</p>
                                <span className={styles.exploreLink} style={{ color: item.color }}>
                                    Learn more →
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
