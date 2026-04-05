import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export const metadata = {
    title: 'Disclaimer | ShasanSeva',
    description: 'ShasanSeva disclaimer — important disclosures about our government scheme assistance service.',
};

export default function DisclaimerPage() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Disclaimer</span>
                </div>

                <h1 className={styles.pageTitle}>Disclaimer</h1>
                <p className={styles.pageSubtitle}>Important disclosures about our service.</p>
                <p className={styles.lastUpdated}>Last updated: April 2026</p>

                <div className={styles.card}>
                    <h2>Nature of Service</h2>
                    <p>ShasanSeva is a <strong>third-party professional assistance platform</strong>. We are not a government body, and we are not affiliated with, endorsed by, or connected to any government department or agency.</p>
                    <p>Our service helps citizens navigate the complex process of applying for government and private schemes by providing professional document handling and application assistance.</p>
                </div>

                <div className={styles.card}>
                    <h2>No Guarantee of Approval</h2>
                    <div className={styles.warningBox}>
                        <p>⚠️ ShasanSeva does NOT guarantee the approval of any government scheme or benefit. The decision to approve or reject an application rests solely with the respective government authority or scheme provider.</p>
                    </div>
                    <p>Our service fee covers the professional assistance provided — including document verification, application preparation, and submission support. The fee is applicable regardless of the outcome of your application.</p>
                </div>

                <div className={styles.card}>
                    <h2>Information Accuracy</h2>
                    <p>While we strive to maintain accurate and up-to-date information about government schemes on our platform, we cannot guarantee the completeness or accuracy of this information at all times. Government policies, eligibility criteria, and scheme details may change without prior notice.</p>
                    <p>We recommend verifying scheme details with the official government sources before proceeding with an application.</p>
                </div>

                <div className={styles.card}>
                    <h2>User Responsibility</h2>
                    <p>Users are solely responsible for:</p>
                    <ul>
                        <li>Providing accurate and genuine personal information</li>
                        <li>Uploading valid and authentic documents</li>
                        <li>Ensuring they meet the eligibility criteria for the schemes they apply to</li>
                        <li>Any consequences arising from submission of false or misleading information</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>Service Availability</h2>
                    <p>ShasanSeva aims to provide uninterrupted service but cannot guarantee availability at all times. Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.</p>
                </div>

                <div className={styles.card}>
                    <h2>External Links</h2>
                    <p>Our platform may contain links to third-party websites or government portals. We are not responsible for the content, accuracy, or availability of these external sites.</p>
                </div>
            </div>
        </div>
    );
}
