import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export const metadata = {
    title: 'Delete Your ShasanSeva Account | ShasanSeva',
    description: 'How to request deletion of your ShasanSeva account and associated personal data, what gets deleted, and what we are required to retain.',
};

/**
 * Public account-deletion page, used as the "Delete account URL" in Google Play.
 *
 * Deliberately has no form and no backend. A form that only emails the team is a
 * mailto with extra steps, and it cannot verify that the requester owns the
 * account — that check happens over the phone number on file either way. The
 * mailto below pre-fills the details needed to make that verification possible.
 *
 * Must stay publicly reachable with no login: Google checks it.
 */

const SUPPORT_EMAIL = 'support@shasanseva.in';

const MAIL_SUBJECT = 'Account deletion request';
const MAIL_BODY = [
    'I would like to request deletion of my ShasanSeva account.',
    '',
    'Full name:',
    'Registered mobile number:',
    'Registered email (if any):',
    'Reason (optional):',
    '',
    'I confirm that this is my own account.',
].join('\n');

const mailtoHref =
    `mailto:${SUPPORT_EMAIL}` +
    `?subject=${encodeURIComponent(MAIL_SUBJECT)}` +
    `&body=${encodeURIComponent(MAIL_BODY)}`;

export default function DeleteAccountPage() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Delete Your Account</span>
                </div>

                <h1 className={styles.pageTitle}>Delete Your ShasanSeva Account</h1>
                <p className={styles.pageSubtitle}>
                    How to request deletion of your ShasanSeva account and the personal data associated with it.
                </p>
                <p className={styles.lastUpdated}>Last updated: August 2026</p>

                <div className={styles.card}>
                    <h2>1. How to Request Deletion</h2>
                    <p>
                        ShasanSeva does not currently offer account deletion inside the app. To have your
                        account deleted, send us a request by email and our team will process it for you.
                    </p>
                    <p>Please include:</p>
                    <ul>
                        <li>Your <strong>full name</strong></li>
                        <li>Your <strong>registered mobile number</strong></li>
                        <li>Your <strong>registered email address</strong>, if you have one on your account</li>
                        <li>A confirmation that the account is yours</li>
                        <li>A reason for the request (optional)</li>
                    </ul>
                    <p style={{ marginTop: 16 }}>
                        <a href={mailtoHref} className={styles.trackButton} style={{ display: 'inline-block' }}>
                            Email your deletion request
                        </a>
                    </p>
                    <p style={{ marginTop: 12 }}>
                        If that button does not open your mail app, write to{' '}
                        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the details above.
                    </p>
                </div>

                <div className={styles.card}>
                    <h2>2. How We Verify Your Request</h2>
                    <p>
                        Before deleting anything, we confirm that the request comes from the account holder.
                        We do this by contacting you on the <strong>mobile number registered to the account</strong>,
                        so please send your request from an address or number we can match to it.
                    </p>
                    <div className={styles.warningBox}>
                        <p>⚠️ We will never ask you for your password, an OTP, or payment details in order to process a deletion request.</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>3. What Gets Deleted</h2>
                    <p>Once your request is verified, we delete or anonymise:</p>
                    <ul>
                        <li>Your account profile — name, email address, mobile number and address</li>
                        <li>Your saved application details and any information pre-filled from your profile</li>
                        <li>Documents you uploaded to support your applications</li>
                        <li>Your notifications and any notes you added to an application</li>
                        <li>Your login credentials, including any Google sign-in link</li>
                        <li>Your feedback and ratings, which are separated from your identity</li>
                    </ul>
                    <p>You will no longer be able to sign in, and your active sessions are ended.</p>
                </div>

                <div className={styles.card}>
                    <h2>4. What We Have to Keep</h2>
                    <p>
                        Some records cannot be deleted, because we are required to keep them. Where this
                        applies, we remove your personal details from the record and retain only what is
                        needed:
                    </p>
                    <ul>
                        <li>
                            <strong>Payment and invoice records</strong> — transaction amounts, dates,
                            payment references and receipts, retained for the period required by applicable
                            tax and accounting law in India.
                        </li>
                        <li>
                            <strong>Records of completed applications</strong>, where they form part of a
                            transaction we are obliged to account for.
                        </li>
                        <li>
                            <strong>Limited records needed to resolve a dispute</strong>, to prevent fraud,
                            or to meet a legal or regulatory obligation.
                        </li>
                    </ul>
                    <div className={styles.infoBox}>
                        <p>
                            These retained records are kept only for the purposes above. They are not used to
                            contact you, and they are not used for marketing.
                        </p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>5. How Long It Takes</h2>
                    <p>
                        We acknowledge deletion requests within <strong>2 working days</strong> and complete
                        verified requests within <strong>30 days</strong>.
                    </p>
                    <p>
                        If you have an application that is still being processed, we will tell you before
                        deleting your account — deleting it means we can no longer complete that application,
                        and service fees already paid are subject to our{' '}
                        <Link href="/refund">Refund &amp; Cancellation Policy</Link>.
                    </p>
                </div>

                <div className={styles.card}>
                    <h2>6. Contact</h2>
                    <p>For anything about deletion requests or your data:</p>
                    <div className={styles.contactGrid}>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📧</span>
                            <h3>Email</h3>
                            <p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
                            <p>Response within 24 hours</p>
                        </div>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📞</span>
                            <h3>Phone</h3>
                            <p><a href="tel:+917517866060">+91 7517866060</a></p>
                            <p>Mon–Sat, 9 AM – 7 PM</p>
                        </div>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>💬</span>
                            <h3>WhatsApp</h3>
                            <p><a href="https://wa.me/917517866060" target="_blank" rel="noopener noreferrer">Chat with us</a></p>
                            <p>Quick responses</p>
                        </div>
                    </div>
                    <p style={{ marginTop: 16 }}>
                        See also our <Link href="/privacy">Privacy Policy</Link> for how we handle your data
                        while your account is active.
                    </p>
                </div>
            </div>
        </div>
    );
}
