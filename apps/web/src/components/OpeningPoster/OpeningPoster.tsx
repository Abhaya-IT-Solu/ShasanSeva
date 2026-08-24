'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { COOKIE_CONSENT_EVENT } from '@/components/CookieConsent/CookieConsent';
import styles from './openingPoster.module.css';

/**
 * A promotional poster shown once when a visitor opens the site.
 *
 * Driven by the existing CAROUSEL announcement type rather than a hardcoded
 * constant: `/api/announcements/public` already returns those items enriched with
 * a fresh R2 image URL and the linked scheme, the admin panel already manages
 * them, and the mobile app already consumes the same data. Whichever active
 * CAROUSEL item sorts first becomes the poster; deactivating it turns the poster
 * off. No new backend and no new admin screen.
 */

const COOKIE_CONSENT_KEY = 'shasanseva_cookie_consent';
// Keyed per announcement rather than a single global flag, so publishing a new
// poster shows it again while the same poster never nags twice.
const seenKey = (id: string) => `shasanseva_poster_seen:${id}`;

interface CarouselItem {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    link: string | null;
    scheme: { slug: string; name: string } | null;
}

export default function OpeningPoster() {
    const t = useTranslations('Poster');
    const [poster, setPoster] = useState<CarouselItem | null>(null);
    const [show, setShow] = useState(false);

    // Fetch first; nothing renders until the consent gate opens as well.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/announcements/public');
                const data = await res.json();
                const first: CarouselItem | undefined = data?.data?.carousel?.[0];
                if (cancelled || !first?.imageUrl) return;
                if (localStorage.getItem(seenKey(first.id))) return;
                setPoster(first);
            } catch {
                // A missing poster is not worth surfacing to the visitor
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Never overlap the cookie banner: either consent is already answered, or we
    // wait for it to be. Cheaper and more predictable than a z-index fight.
    useEffect(() => {
        if (!poster) return;

        const reveal = () => setTimeout(() => setShow(true), 800);

        if (localStorage.getItem(COOKIE_CONSENT_KEY)) {
            const timer = reveal();
            return () => clearTimeout(timer);
        }

        let timer: ReturnType<typeof setTimeout>;
        const onConsent = () => { timer = reveal(); };
        window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
        return () => {
            window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
            if (timer) clearTimeout(timer);
        };
    }, [poster]);

    /** Dismissed by the visitor — remember it so the same poster never nags twice. */
    const dismiss = useCallback(() => {
        if (poster) localStorage.setItem(seenKey(poster.id), '1');
        setShow(false);
    }, [poster]);

    /**
     * Hidden because the image would not load. Deliberately does NOT mark the
     * poster seen: R2 URLs expire and buckets get misconfigured, and a transient
     * failure must not suppress the poster for that visitor permanently.
     */
    const hideBroken = useCallback(() => setShow(false), []);

    useEffect(() => {
        if (!show) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [show, dismiss]);

    if (!show || !poster) return null;

    const href = poster.scheme?.slug ? `/schemes/${poster.scheme.slug}` : null;

    return (
        <div className={styles.overlay} onClick={dismiss} role="dialog" aria-modal="true">
            <div className={styles.card} onClick={(e) => e.stopPropagation()}>
                <button className={styles.close} onClick={dismiss} aria-label={t('close')}>
                    <span className="material-icons">close</span>
                </button>

                {/* Plain <img>: next.config.js has no images block, so remote R2 URLs
                    are not configured for next/image. The presigned URL can expire,
                    so a failure hides the poster rather than showing a broken frame. */}
                <div className={styles.imageWrap}>
                    <img
                        src={poster.imageUrl!}
                        alt={poster.title}
                        className={styles.image}
                        onError={hideBroken}
                    />
                </div>

                <div className={styles.body}>
                    <h2 className={styles.title}>{poster.title}</h2>
                    {poster.description && <p className={styles.description}>{poster.description}</p>}
                    {href && (
                        <Link href={href} className={styles.cta} onClick={dismiss}>
                            {t('viewScheme')}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
