import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
    // Match only internationalized pathnames
    // Skip admin routes, API routes, and static files
    matcher: [
        // Match all pathnames except for:
        // - /admin (admin panel stays English)
        // - /api (API routes)
        // - /_next (Next.js internals)
        // - /_vercel (Vercel internals)
        // - Static files with extensions
        '/((?!admin|api|_next|_vercel|.*\\..*).*)',
    ],
};
