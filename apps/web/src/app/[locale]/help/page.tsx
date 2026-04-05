import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export const metadata = {
    title: 'Help Center | ShasanSeva',
    description: 'ShasanSeva help center — guides on how to use the platform, apply for schemes, and track applications.',
};

export default function HelpPage() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Help Center</span>
                </div>

                <h1 className={styles.pageTitle}>Help Center</h1>
                <p className={styles.pageSubtitle}>Step-by-step guides to help you get the most out of ShasanSeva.</p>
                <p className={styles.lastUpdated}></p>

                <div className={styles.card}>
                    <h2>🚀 Getting Started</h2>
                    <h3>Step 1: Create Your Account</h3>
                    <p>Visit the <Link href="/login">login page</Link> and create an account using your mobile number and a password. You can also sign in with Google.</p>

                    <h3>Step 2: Complete Your Profile</h3>
                    <p>After registration, complete your profile with your name, address, and category (student, farmer, etc.). This helps us show you relevant schemes.</p>

                    <h3>Step 3: Browse Schemes</h3>
                    <p>Explore available schemes on the <Link href="/schemes">Schemes page</Link>. Use category filters to find schemes relevant to you.</p>
                </div>

                <div className={styles.card}>
                    <h2>📝 How to Apply for a Scheme</h2>
                    <ol>
                        <li><strong>Select a scheme</strong> — Browse and click on a scheme you&apos;re eligible for</li>
                        <li><strong>Click &quot;Request Assistance&quot;</strong> — This starts the application process</li>
                        <li><strong>Upload documents</strong> — Upload the required documents (Aadhaar, PAN, etc.) or skip to upload later</li>
                        <li><strong>Review & Pay</strong> — Review your application and pay the service fee through Razorpay</li>
                        <li><strong>Track your application</strong> — Monitor progress from your dashboard</li>
                    </ol>
                    <div className={styles.infoBox}>
                        <p>💡 You can skip document upload during application and add them later from the order details page.</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>📋 Document Upload Guide</h2>
                    <p>When uploading documents, please ensure:</p>
                    <ul>
                        <li>Documents are clear and readable (no blurry photos)</li>
                        <li>Accepted formats: JPEG, PNG, WebP, PDF</li>
                        <li>Maximum file size: 10MB per document</li>
                        <li>All information on the document is clearly visible</li>
                        <li>Documents are valid and not expired</li>
                    </ul>
                    <p>If a document is rejected, you&apos;ll see the reason on your order details page and can re-upload a corrected version.</p>
                </div>

                <div className={styles.card}>
                    <h2>📊 Understanding Application Statuses</h2>
                    <ul>
                        <li><strong>Pending Payment</strong> — Application created, awaiting payment</li>
                        <li><strong>Payment Received</strong> — Payment confirmed, processing will begin</li>
                        <li><strong>Processing</strong> — Our team is working on your application</li>
                        <li><strong>Documents Verified</strong> — All uploaded documents have been verified</li>
                        <li><strong>Under Review</strong> — Application submitted to the authority for review</li>
                        <li><strong>Completed</strong> — Application process completed successfully</li>
                        <li><strong>Rejected</strong> — Application was rejected (reason will be provided)</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>🔑 Account & Security</h2>
                    <h3>Changing Your Password</h3>
                    <p>Go to <Link href="/profile">Profile</Link> → Security → Change Password.</p>

                    <h3>Forgot Password?</h3>
                    <p>Use the &quot;Forgot Password?&quot; link on the login page. We&apos;ll send an OTP to your registered mobile number to reset your password.</p>

                    <h3>Account Security Tips</h3>
                    <ul>
                        <li>Use a strong password with at least 8 characters and a number</li>
                        <li>Don&apos;t share your login credentials with anyone</li>
                        <li>Log out after using shared devices</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>📞 Still Need Help?</h2>
                    <p>If you couldn&apos;t find the answer here, contact our support team:</p>
                    <div className={styles.contactGrid}>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📧</span>
                            <h3>Email</h3>
                            <p><a href="mailto:support@shasanseva.com">support@shasanseva.in</a></p>
                        </div>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📞</span>
                            <h3>Phone</h3>
                            <p><a href="tel:+919876543210">+91 7517866060</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
