import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export const metadata = {
    title: 'Refund & Cancellation Policy | ShasanSeva',
    description: 'ShasanSeva refund and cancellation policy — eligibility, timelines, and how to request a refund for our scheme assistance service.',
};

export default function RefundPage() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Refund &amp; Cancellation Policy</span>
                </div>

                <h1 className={styles.pageTitle}>Refund &amp; Cancellation Policy</h1>
                <p className={styles.pageSubtitle}>How cancellations and refunds work for ShasanSeva service fees.</p>
                <p className={styles.lastUpdated}>Last updated: August 2026</p>

                <div className={styles.card}>
                    <h2>1. What You Are Paying For</h2>
                    <p>ShasanSeva charges a <strong>service fee for professional assistance</strong> — document verification, application preparation, submission support, and status tracking. This fee is separate from any government fee and is not a payment for the scheme benefit itself.</p>
                    <div className={styles.warningBox}>
                        <p>⚠️ Our fee covers the assistance work we perform. It does not guarantee approval of any scheme — approval rests solely with the respective government authority.</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>2. Cancellation</h2>
                    <p>You may request cancellation of an application at any time before our team begins processing it:</p>
                    <ul>
                        <li><strong>Before processing begins</strong> — if your application is still in the <em>Paid</em> stage and no officer has picked it up, you can request a cancellation with a <strong>full refund</strong>.</li>
                        <li><strong>After processing begins</strong> — once your application moves to <em>In Progress</em>, our team has started verifying documents and preparing your submission. Cancellations at this stage are not eligible for a refund.</li>
                        <li><strong>After submission</strong> — applications that have been submitted to the government authority cannot be cancelled.</li>
                    </ul>
                    <p>To request a cancellation, contact us with your <strong>Application ID</strong> using any of the channels in section 6. You can find the ID and current status on your <Link href="/orders">My Applications</Link> page.</p>
                </div>

                <div className={styles.card}>
                    <h2>3. Refund Eligibility</h2>
                    <p>You are eligible for a refund in the following cases:</p>
                    <ul>
                        <li><strong>Duplicate payment</strong> — you were charged more than once for the same application. The duplicate amount is refunded in full.</li>
                        <li><strong>System error</strong> — we are unable to submit your application because of a technical failure on our side.</li>
                        <li><strong>Service not delivered</strong> — we do not process your application within the stated timeline and you choose not to continue.</li>
                        <li><strong>Cancellation before processing</strong> — as described in section 2.</li>
                        <li><strong>Payment deducted, order not created</strong> — money left your account but no application was created. This is refunded in full.</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>4. Non-Refundable Cases</h2>
                    <p>Refunds are <strong>not available</strong> in the following situations:</p>
                    <ul>
                        <li>Your application is <strong>rejected by the government authority</strong> — our assistance service was still delivered.</li>
                        <li>You are found <strong>ineligible</strong> for the scheme based on information you provided.</li>
                        <li>The application failed because you submitted <strong>incorrect, incomplete, or forged documents</strong>.</li>
                        <li>You did not respond to our verification requests, causing the application to lapse.</li>
                        <li>Delays caused by government processing timelines, which are outside our control.</li>
                        <li>The application has already been <strong>completed</strong>.</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>5. Refund Timeline</h2>
                    <ul>
                        <li><strong>Request window:</strong> refund requests must be raised within <strong>7 days</strong> of payment.</li>
                        <li><strong>Review:</strong> we review and respond to every request within <strong>3 working days</strong>.</li>
                        <li><strong>Processing:</strong> approved refunds are initiated within <strong>5 working days</strong> of approval.</li>
                        <li><strong>Credit to your account:</strong> once initiated, the amount reaches your original payment method in <strong>5–7 working days</strong>, depending on your bank or card issuer.</li>
                    </ul>
                    <div className={styles.infoBox}>
                        <p>💡 Refunds are always credited back to the <strong>original payment method</strong> used at checkout. We process refunds through Razorpay and cannot transfer to a different account.</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>6. How to Request a Refund</h2>
                    <p>Send us your request with the details below and we will confirm receipt within one working day:</p>
                    <ul>
                        <li>Your <strong>Application ID</strong> (from the <Link href="/orders">My Applications</Link> page)</li>
                        <li>The <strong>payment reference</strong> or transaction ID</li>
                        <li>A short description of the reason for your request</li>
                    </ul>
                    <div className={styles.contactGrid}>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📧</span>
                            <h3>Email</h3>
                            <p><a href="mailto:support@shasanseva.in">support@shasanseva.in</a></p>
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
                </div>

                <div className={styles.card}>
                    <h2>7. Disputes</h2>
                    <p>If you are not satisfied with the outcome of a refund request, you may escalate it by replying to our decision email. We will review the case again and respond within 7 working days.</p>
                    <p>This policy forms part of our <Link href="/terms">Terms of Service</Link> and is governed by the laws of India, subject to the exclusive jurisdiction of courts in Maharashtra, India.</p>
                </div>
            </div>
        </div>
    );
}
