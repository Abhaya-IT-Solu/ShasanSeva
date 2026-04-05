'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import styles from '../infoPage.module.css';

export default function TrackPage() {
    const [orderId, setOrderId] = useState('');
    const router = useRouter();

    const handleTrack = () => {
        const trimmed = orderId.trim();
        if (!trimmed) return;
        router.push(`/orders/${trimmed}` as never);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleTrack();
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>Track Application</span>
                </div>

                <h1 className={styles.pageTitle}>Track Your Application  -- (Public Application Tracking Coming soon... )</h1>
                <p className={styles.pageSubtitle}>Enter your Application ID to check the current status of your application.</p>
                <p className={styles.lastUpdated}></p>

                <div className={styles.card}>
                    <h2>🔍 Track by Application ID</h2>
                    <p>Your Application ID was provided when you submitted your application. You can also find it in your <Link href="/orders">My Applications</Link> page.</p>

                    <div className={styles.trackForm}>
                        <input
                            type="text"
                            className={styles.trackInput}
                            placeholder="Enter your Application ID..."
                            value={orderId}
                            onChange={(e) => setOrderId(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            className={styles.trackButton}
                            onClick={handleTrack}
                            disabled={!orderId.trim()}
                        >
                            Track
                        </button>
                    </div>

                    <div className={styles.infoBox}>
                        <p>💡 Tip: Make sure you&apos;re logged in to view your application details.</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>📊 Application Status Guide</h2>
                    <ul>
                        <li><strong>Pending Payment</strong> — Your application has been created but payment is not yet received.</li>
                        <li><strong>Payment Received</strong> — Payment confirmed. Our team will begin processing shortly.</li>
                        <li><strong>Processing</strong> — Our team is reviewing and working on your application.</li>
                        <li><strong>Documents Verified</strong> — All your uploaded documents have been verified.</li>
                        <li><strong>Under Review</strong> — Application has been submitted to the authority for review.</li>
                        <li><strong>Completed</strong> — Your application process has been completed successfully.</li>
                        <li><strong>Rejected</strong> — Application was not approved. Check the reason on the order page.</li>
                    </ul>
                </div>

                <div className={styles.card}>
                    <h2>Need Help?</h2>
                    <p>If you&apos;re having trouble tracking your application or the status seems incorrect, please <Link href="/contact">contact our support team</Link> with your Application ID.</p>
                </div>
            </div>
        </div>
    );
}
