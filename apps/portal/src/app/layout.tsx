import type { Metadata } from 'next';
import './globals.css';
import { PortalAuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
    title: 'ShasanSeva — Developer Portal',
    description: 'Custom forms management for ShasanSeva schemes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <PortalAuthProvider>{children}</PortalAuthProvider>
            </body>
        </html>
    );
}
