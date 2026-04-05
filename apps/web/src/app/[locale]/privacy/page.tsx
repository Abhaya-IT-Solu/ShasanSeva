import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export const metadata = {
    title: 'Privacy Policy | ShasanSeva',
    description: 'ShasanSeva privacy policy — how we collect, use, and protect your personal information.',
};

export default function PrivacyPage() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Privacy Policy</span>
                </div>

                <h1 className={styles.pageTitle}>Privacy Policy</h1>
                <p className={styles.pageSubtitle}>Your privacy is important to us. This policy explains how ShasanSeva handles your data.</p>
                <p className={styles.lastUpdated}>Last updated: April 2026</p>

                <div className={styles.card}>
                    <h2>1. Information We Collect</h2>
                    <p>We collect information that you provide directly when using our platform:</p>
                    <ul>
                        <li><strong>Account Information:</strong> Name, mobile number, email address, and password when you create an account.</li>
                        <li><strong>Profile Data:</strong> Address, category (student, farmer, etc.), and other optional details you provide.</li>
                        <li><strong>Documents:</strong> Government IDs, certificates, and other documents you upload for scheme applications.</li>
                        <li><strong>Payment Information:</strong> Transaction details processed through our payment gateway (Razorpay). We do not store card or bank details.</li>
                        <li><strong>Usage Data:</strong> Pages visited, features used, device information, and IP address for improving our services.</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>2. How We Use Your Information</h2>
                    <p>Your information is used to:</p>
                    <ul>
                        <li>Process and manage your government scheme applications</li>
                        <li>Verify your identity and eligibility for schemes</li>
                        <li>Communicate updates about your application status</li>
                        <li>Process payments securely through our payment partner</li>
                        <li>Improve our platform, services, and user experience</li>
                        <li>Send important notifications about scheme updates and deadlines</li>
                        <li>Comply with legal and regulatory requirements</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>3. Data Storage & Security</h2>
                    <p>We take the security of your data seriously:</p>
                    <ul>
                        <li>All data is transmitted using industry-standard SSL/TLS encryption</li>
                        <li>Documents are stored securely in encrypted cloud storage (Cloudflare R2)</li>
                        <li>Access to personal data is restricted to authorized personnel only</li>
                        <li>We conduct regular security assessments of our systems</li>
                        <li>Passwords are hashed and never stored in plain text</li>
                    </ul>
                    <div className={styles.infoBox}>
                        <p>🔒 Your uploaded documents are stored with pre-signed URLs that expire after 15 minutes, ensuring that unauthorized access is prevented.</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>4. Data Sharing</h2>
                    <p>We do not sell your personal data. We may share limited information with:</p>
                    <ul>
                        <li><strong>Government Agencies:</strong> When required for processing your scheme applications</li>
                        <li><strong>Payment Processors:</strong> Razorpay, for processing your transactions securely</li>
                        <li><strong>Legal Authorities:</strong> When required by law or legal proceedings</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>5. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access your personal data stored on our platform</li>
                        <li>Request correction of inaccurate information</li>
                        <li>Request deletion of your account and associated data</li>
                        <li>Withdraw consent for data processing (may affect service availability)</li>
                        <li>Lodge a complaint with the relevant data protection authority</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>6. Cookies</h2>
                    <p>We use essential cookies to maintain your login session and preferences. We do not use third-party tracking cookies for advertising purposes. You can manage cookie preferences through your browser settings.</p>
                </div>

                <div className={styles.card}>
                    <h2>7. Contact Us</h2>
                    <p>For privacy-related queries or to exercise your data rights, contact us at:</p>
                    <ul>
                        <li>Email: <a href="mailto:support@shasanseva.in">support@shasanseva.in</a></li>
                        <li>Phone: <a href="tel:+917517866060">+91 7517866060</a></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
