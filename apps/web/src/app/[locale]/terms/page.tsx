import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export const metadata = {
    title: 'Terms of Service | ShasanSeva',
    description: 'ShasanSeva terms of service — rules and conditions for using our government scheme assistance platform.',
};

export default function TermsPage() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Terms of Service</span>
                </div>

                <h1 className={styles.pageTitle}>Terms of Service</h1>
                <p className={styles.pageSubtitle}>Please read these terms carefully before using ShasanSeva.</p>
                <p className={styles.lastUpdated}>Last updated: April 2026</p>

                <div className={styles.card}>
                    <h2>1. About Our Service</h2>
                    <p>ShasanSeva is a <strong>paid professional assistance platform</strong> that helps citizens apply for government and private schemes. We provide:</p>
                    <ul>
                        <li>Document verification and handling services</li>
                        <li>Application form assistance and submission support</li>
                        <li>Real-time application status tracking</li>
                        <li>Guidance on eligibility and required documentation</li>
                    </ul>
                    <div className={styles.warningBox}>
                        <p>⚠️ ShasanSeva does NOT guarantee the approval of any government scheme. Approval is solely at the discretion of the respective government authority.</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>2. User Responsibilities</h2>
                    <p>By using ShasanSeva, you agree to:</p>
                    <ul>
                        <li>Provide accurate and truthful personal information</li>
                        <li>Upload genuine, valid documents (submitting forged documents is illegal)</li>
                        <li>Keep your account credentials confidential</li>
                        <li>Not use the platform for any unlawful purpose</li>
                        <li>Respond to verification requests from our team promptly</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>3. Service Fees & Payments</h2>
                    <p>Our service fees cover professional assistance, not scheme benefits:</p>
                    <ul>
                        <li>Service fees are clearly displayed before you proceed to payment</li>
                        <li>Payments are processed securely through Razorpay</li>
                        <li>Fees are charged for our assistance service regardless of scheme approval outcome</li>
                        <li>Payment receipts are generated and available for download</li>
                    </ul>
                    <h3>Refund Policy</h3>
                    <p>Refunds may be considered in the following cases:</p>
                    <ul>
                        <li>If we are unable to submit your application due to a system error</li>
                        <li>If a duplicate payment was processed</li>
                        <li>Refund requests must be raised within 7 days of payment</li>
                    </ul>
                    <p>Refunds are <strong>not available</strong> if your application is rejected by the government authority, as our fee is for the assistance service provided.</p>
                </div>

                <div className={styles.card}>
                    <h2>4. Intellectual Property</h2>
                    <p>All content on ShasanSeva — including text, graphics, logos, and software — is the property of ShasanSeva or its licensors and is protected under applicable intellectual property laws. You may not copy, distribute, or create derivative works without written permission.</p>
                </div>

                <div className={styles.card}>
                    <h2>5. Account Termination</h2>
                    <p>We reserve the right to suspend or terminate your account if:</p>
                    <ul>
                        <li>You provide false or misleading information</li>
                        <li>You upload fraudulent documents</li>
                        <li>You violate these terms of service</li>
                        <li>You engage in abusive behavior toward our support team</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>6. Limitation of Liability</h2>
                    <p>ShasanSeva shall not be liable for:</p>
                    <ul>
                        <li>Rejection of scheme applications by government authorities</li>
                        <li>Delays caused by government processing timelines</li>
                        <li>Losses arising from inaccurate information provided by the user</li>
                        <li>Service interruptions due to circumstances beyond our control</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>7. Governing Law</h2>
                    <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Maharashtra, India.</p>
                </div>

                <div className={styles.card}>
                    <h2>8. Changes to Terms</h2>
                    <p>We reserve the right to update these terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms. Significant changes will be communicated via email or platform notifications.</p>
                </div>
            </div>
        </div>
    );
}
