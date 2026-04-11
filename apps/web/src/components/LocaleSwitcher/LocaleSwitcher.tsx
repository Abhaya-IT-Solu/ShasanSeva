'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './LocaleSwitcher.module.css';

export function LocaleSwitcher() {
    const locale = useLocale();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const switchLocale = (newLocale: string) => {
        // Replace current locale prefix with new one, preserving query params
        const segments = pathname.split('/');
        segments[1] = newLocale;
        const newPath = segments.join('/');
        const queryString = searchParams.toString();
        router.push(queryString ? `${newPath}?${queryString}` : newPath);
    };

    return (
        <div className={styles.switcher}>
            <button
                onClick={() => switchLocale('en')}
                className={`${styles.localeBtn} ${locale === 'en' ? styles.active : ''}`}
                disabled={locale === 'en'}
            >
                EN
            </button>
            <span className={styles.divider}>|</span>
            <button
                onClick={() => switchLocale('mr')}
                className={`${styles.localeBtn} ${locale === 'mr' ? styles.active : ''}`}
                disabled={locale === 'mr'}
            >
                मरा
            </button>
        </div>
    );
}
