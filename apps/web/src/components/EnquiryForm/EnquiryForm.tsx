'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import styles from './enquiryForm.module.css';

interface EnquiryFormProps {
    isOpen: boolean;
    onClose: () => void;
    /** Pre-fills the enquiry with a scheme when opened from a scheme page. */
    schemeId?: string;
    schemeName?: string;
}

/**
 * Enquiry modal. Deliberately usable with no account — the visitor it exists for
 * has not signed up yet, so nothing here may depend on an auth token.
 */
export default function EnquiryForm({ isOpen, onClose, schemeId, schemeName }: EnquiryFormProps) {
    const t = useTranslations('Enquiry');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    // Honeypot. Hidden from people, irresistible to bots. Never filled by a real
    // submission, so any value means the request is discarded server-side.
    const [website, setWebsite] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isDone, setIsDone] = useState(false);

    // Reset when reopened, so a second enquiry does not start on the previous
    // confirmation screen.
    useEffect(() => {
        if (isOpen) {
            setError('');
            setIsDone(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!/^[6-9]\d{9}$/.test(phone)) {
            setError(t('errorPhone'));
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.request('/api/enquiries', {
                method: 'POST',
                body: {
                    name: name.trim(),
                    phone,
                    email: email.trim() || undefined,
                    message: message.trim(),
                    schemeId,
                    website,
                },
            });

            // Never report success on a failed call — the visitor would walk away
            // believing someone is going to ring them.
            if (!response.success) {
                setError(response.error?.message || t('errorGeneric'));
                return;
            }

            setIsDone(true);
            setName('');
            setPhone('');
            setEmail('');
            setMessage('');
            setWebsite('');
        } catch {
            setError(t('errorGeneric'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className={styles.overlay}
            onClick={onClose}
            role="presentation"
        >
            <div
                className={styles.card}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="enquiry-title"
            >
                <button
                    type="button"
                    className={styles.close}
                    onClick={onClose}
                    aria-label={t('close')}
                >
                    ✕
                </button>

                {isDone ? (
                    <div className={styles.done}>
                        <span className={styles.doneIcon}>✅</span>
                        <h2 id="enquiry-title">{t('successTitle')}</h2>
                        <p>{t('successBody')}</p>
                        <button type="button" className="btn btn-primary" onClick={onClose}>
                            {t('close')}
                        </button>
                    </div>
                ) : (
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <h2 id="enquiry-title" className={styles.title}>{t('title')}</h2>
                        <p className={styles.subtitle}>
                            {schemeName ? t('subtitleScheme', { scheme: schemeName }) : t('subtitle')}
                        </p>

                        {error && <div className={styles.error}>{error}</div>}

                        <label className={styles.label}>
                            {t('name')} <span className={styles.req}>*</span>
                            <input
                                type="text"
                                className="input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={100}
                                required
                                autoComplete="name"
                            />
                        </label>

                        <label className={styles.label}>
                            {t('phone')} <span className={styles.req}>*</span>
                            <input
                                type="tel"
                                className="input"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                inputMode="numeric"
                                placeholder={t('phonePlaceholder')}
                                required
                                autoComplete="tel"
                            />
                        </label>

                        <label className={styles.label}>
                            {t('email')} <span className={styles.optional}>({t('optional')})</span>
                            <input
                                type="email"
                                className="input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                maxLength={255}
                                autoComplete="email"
                            />
                        </label>

                        <label className={styles.label}>
                            {t('message')} <span className={styles.req}>*</span>
                            <textarea
                                className="input"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={4}
                                minLength={10}
                                maxLength={1000}
                                placeholder={t('messagePlaceholder')}
                                required
                            />
                        </label>

                        {/* Honeypot — hidden via CSS rather than type="hidden" so a
                            bot filling in every visible-to-it field trips it.
                            aria-hidden + tabIndex keep it away from real users. */}
                        <div className={styles.honeypot} aria-hidden="true">
                            <label>
                                Website
                                <input
                                    type="text"
                                    name="website"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    tabIndex={-1}
                                    autoComplete="off"
                                />
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <span className="spinner" /> : t('submit')}
                        </button>

                        <p className={styles.note}>{t('privacyNote')}</p>
                    </form>
                )}
            </div>
        </div>
    );
}
