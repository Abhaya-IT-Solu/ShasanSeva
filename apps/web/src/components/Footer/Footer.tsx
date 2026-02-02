'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import styles from './footer.module.css';

export default function Footer() {
    const t = useTranslations('Footer');
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
                            {t('tagline')}
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className={styles.linkGroup}>
                        <h4>{t('quickLinks')}</h4>
                        <ul>
                            <li><Link href="/schemes">{t('allSchemes')}</Link></li>
                            <li><Link href="/schemes?category=STUDENT">{t('studentSchemes')}</Link></li>
                            <li><Link href="/schemes?category=FARMER">{t('farmerSchemes')}</Link></li>
                            <li><Link href="/schemes?category=LOAN">{t('loanSchemes')}</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className={styles.linkGroup}>
                        <h4>{t('support')}</h4>
                        <ul>
                            <li><Link href="/help">{t('helpCenter')}</Link></li>
                            <li><Link href="/contact">{t('contactUs')}</Link></li>
                            <li><Link href="/faq">{t('faqs')}</Link></li>
                            <li><Link href="/track">{t('trackApplication')}</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className={styles.linkGroup}>
                        <h4>{t('contactUs')}</h4>
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
                                <span>{t('location')}</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className={styles.divider}></div>

                {/* Bottom Section */}
                <div className={styles.bottomSection}>
                    <p className={styles.copyright}>
                        © {currentYear} ShasanSeva. {t('allRightsReserved')}
                    </p>
                    <div className={styles.legalLinks}>
                        <Link href="/privacy">{t('privacyPolicy')}</Link>
                        <Link href="/terms">{t('termsOfService')}</Link>
                        <Link href="/disclaimer">{t('disclaimerLink')}</Link>
                    </div>
                </div>

                {/* Disclaimer */}
                <p className={styles.disclaimer}>
                    {t('disclaimer')}
                </p>
            </div>
        </footer>
    );
}

