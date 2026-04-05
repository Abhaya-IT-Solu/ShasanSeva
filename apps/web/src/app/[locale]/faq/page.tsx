'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import styles from '../infoPage.module.css';

interface FAQItem {
    question: string;
    answer: string;
}

const faqData: FAQItem[] = [
    {
        question: 'What is ShasanSeva?',
        answer: 'ShasanSeva is a professional assistance platform that helps citizens apply for government and private schemes. We handle document verification, application preparation, and submission support — making the process simple and hassle-free.',
    },
    {
        question: 'Is ShasanSeva a government website?',
        answer: 'No. ShasanSeva is a private, third-party service provider. We are not affiliated with any government department. We provide paid assistance to help citizens navigate the application process for government schemes.',
    },
    {
        question: 'What does the service fee cover?',
        answer: 'The service fee covers our professional assistance — including document verification, application form preparation, submission support, and status tracking. It does not include any government fees that may apply separately.',
    },
    {
        question: 'Do you guarantee scheme approval?',
        answer: 'No. We provide professional application assistance only. The approval or rejection of any scheme is solely at the discretion of the respective government authority. Our fee is for the service provided, not the outcome.',
    },
    {
        question: 'What documents do I need?',
        answer: 'Required documents vary by scheme but commonly include Aadhaar Card, PAN Card, Income Certificate, and category-specific documents. Each scheme page lists the specific documents required.',
    },
    {
        question: 'How do I track my application?',
        answer: 'After applying, go to "My Applications" in your dashboard. You can see real-time status updates for each application. You can also use the Track Application page with your Application ID.',
    },
    {
        question: 'Can I upload documents later?',
        answer: 'Yes! You can skip document upload during the application process and upload them later from your order details page. However, faster document submission leads to faster processing.',
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major payment methods through Razorpay, including UPI, debit/credit cards, net banking, and popular wallets.',
    },
    {
        question: 'How long does processing take?',
        answer: 'Processing time varies by scheme. Typically, our team verifies and submits your application within 2-5 working days. Final approval timelines depend on the government authority.',
    },
    {
        question: 'Can I get a refund?',
        answer: 'Refunds are considered if we are unable to submit your application due to a system error or if a duplicate payment was processed. We cannot refund if the application is rejected by the government, as our service was still provided. Refund requests must be raised within 7 days.',
    },
    {
        question: 'Is my data safe?',
        answer: 'Yes. We use industry-standard encryption for data transmission and storage. Documents are stored in encrypted cloud storage with time-limited access URLs. We do not share your data with any third parties for marketing purposes.',
    },
    {
        question: 'How do I contact support?',
        answer: 'You can reach us via phone (+91 98765 43210), email (support@shasanseva.com), or WhatsApp. Our support hours are Monday to Saturday, 9 AM to 7 PM.',
    },
];

export default function FAQPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.breadcrumb}>
                    <Link href="/">Home</Link>
                    <span>›</span>
                    <span>FAQs</span>
                </div>

                <h1 className={styles.pageTitle}>Frequently Asked Questions</h1>
                <p className={styles.pageSubtitle}>Find answers to common questions about ShasanSeva.</p>
                <p className={styles.lastUpdated}></p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {faqData.map((faq, index) => (
                        <div key={index} className={styles.faqItem}>
                            <button
                                className={styles.faqQuestion}
                                onClick={() => toggle(index)}
                            >
                                <span>{faq.question}</span>
                                <span className={`${styles.faqArrow} ${openIndex === index ? styles.faqArrowOpen : ''}`}>
                                    ▼
                                </span>
                            </button>
                            {openIndex === index && (
                                <div className={styles.faqAnswer}>
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className={styles.card} style={{ marginTop: 32 }}>
                    <h2>Still Have Questions?</h2>
                    <p>Can&apos;t find what you&apos;re looking for? Our support team is happy to help.</p>
                    <div className={styles.contactGrid}>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📧</span>
                            <h3>Email Us</h3>
                            <p><a href="mailto:support@shasanseva.in">support@shasanseva.in</a></p>
                        </div>
                        <div className={styles.contactCard}>
                            <span className={styles.icon}>📞</span>
                            <h3>Call Us</h3>
                            <p><a href="tel:+917517866060">+91 7517866060</a></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
