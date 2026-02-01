'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

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
        </div>
    );
}
