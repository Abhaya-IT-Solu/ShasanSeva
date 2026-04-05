import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export const metadata = {
    title: 'Contact Us | ShasanSeva',
    description: 'Get in touch with ShasanSeva — reach us via phone, email, or visit our office.',
};

export default function ContactPage() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Contact Us</span>
                </div>

                <h1 className={styles.pageTitle}>Contact Us</h1>
                <p className={styles.pageSubtitle}>We&apos;re here to help. Reach out through any of the channels below.</p>
                <p className={styles.lastUpdated}></p>

                <div className={styles.card}>
                    <h2>Get In Touch</h2>
                    <div className={styles.contactGrid}>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📞</span>
                            <h3>Phone</h3>
                            <p><a href="tel:+917517866060">+91 7517866060</a></p>
                            <p>Mon–Sat, 9 AM – 7 PM</p>
                        </div>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📧</span>
                            <h3>Email</h3>
                            <p><a href="mailto:support@shasanseva.in">support@shasanseva.in</a></p>
                            <p>Response within 24 hours</p>
                        </div>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>💬</span>
                            <h3>WhatsApp</h3>
                            <p><a href="https://wa.me/917517866060" target="_blank" rel="noopener noreferrer">Chat with us</a></p>
                            <p>Quick responses</p>
                        </div>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📍</span>
                            <h3>Office</h3>
                            <p>Maharashtra, India</p>
                            <p>By appointment only</p>
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>Common Queries</h2>
                    <p>Before contacting us, check if your question is answered in our <Link href="/faq">FAQ section</Link> or <Link href="/help">Help Center</Link>.</p>

                    <h3>For Application Issues</h3>
                    <p>If you need help with a specific application, please have your <strong>Application ID</strong> ready when contacting us. You can find it in your <Link href="/orders">My Applications</Link> page.</p>

                    <h3>Business Inquiries</h3>
                    <p>For partnerships, collaborations, or business-related queries, please email us at <a href="mailto:support@shasanseva.com">support@shasanseva.com</a>.</p>
                </div>

                <div className={styles.card}>
                    <h2>Feedback</h2>
                    <p>Your feedback helps us improve. If you have suggestions, complaints, or appreciation for our service, please don&apos;t hesitate to reach out. We value every piece of feedback from our users.</p>
                    <div className={styles.infoBox}>
                        <p>💡 Tip: You can also submit feedback directly from your order details page after your application is completed.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
