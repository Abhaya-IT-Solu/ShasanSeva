'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './footer.module.css';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                {/* Top Section */}
                <div className={styles.topSection}>
                    {/* Brand */}
                    <div className={styles.brand}>
                        <Link href="/" className={styles.logo}>
                            <Image
                                src="/logo/logo_icon.png"
                                alt="ShasanSeva"
                                width={180}
                                height={50}
                                style={{ filter: 'brightness(2)' }}
                            />
                        </Link>
                        <p className={styles.tagline}>
                            Your trusted partner for government scheme assistance
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className={styles.linkGroup}>
                        <h4>Quick Links</h4>
                        <ul>
                            <li><Link href="/schemes">All Schemes</Link></li>
                            <li><Link href="/schemes?category=STUDENT">Student Schemes</Link></li>
                            <li><Link href="/schemes?category=FARMER">Farmer Schemes</Link></li>
                            <li><Link href="/schemes?category=LOAN">Loan Schemes</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className={styles.linkGroup}>
                        <h4>Support</h4>
                        <ul>
                            <li><Link href="/help">Help Center</Link></li>
                            <li><Link href="/contact">Contact Us</Link></li>
                            <li><Link href="/faq">FAQs</Link></li>
                            <li><Link href="/track">Track Application</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className={styles.linkGroup}>
                        <h4>Contact Us</h4>
                        <ul className={styles.contactList}>
                            <li>
                                <span className={styles.icon}>📞</span>
                                <a href="tel:+919876543210">+91 98765 43210</a>
                            </li>
                            <li>
                                <span className={styles.icon}>📧</span>
                                <a href="mailto:support@shasanseva.com">support@shasanseva.com</a>
                            </li>
                            <li>
                                <span className={styles.icon}>📍</span>
                                <span>Maharashtra, India</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className={styles.divider}></div>

                {/* Bottom Section */}
                <div className={styles.bottomSection}>
                    <p className={styles.copyright}>
                        © {currentYear} ShasanSeva. All rights reserved.
                    </p>
                    <div className={styles.legalLinks}>
                        <Link href="/privacy">Privacy Policy</Link>
                        <Link href="/terms">Terms of Service</Link>
                        <Link href="/disclaimer">Disclaimer</Link>
                    </div>
                </div>

                {/* Disclaimer */}
                <p className={styles.disclaimer}>
                    Disclaimer: ShasanSeva is a paid assistance platform. We do not guarantee approval of any scheme.
                    We provide professional assistance with document handling and application support.
                </p>
            </div>
        </footer>
    );
}
