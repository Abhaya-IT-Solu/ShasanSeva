'use client';

import { useState, useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'shasanseva_cookie_consent';

export default function CookieConsent() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            // Slight delay so it doesn't flash on load
            const timer = setTimeout(() => setShow(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        setShow(false);
    };

    const decline = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
        setShow(false);
    };

    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: '0 16px 16px',
            pointerEvents: 'none',
            animation: 'cookieSlideUp 0.4s ease-out',
        }}>
            <div style={{
                maxWidth: 520,
                margin: '0 auto',
                background: '#0a3015',
                border: '1px solid rgba(46, 125, 50, 0.4)',
                borderRadius: 16,
                padding: '20px 24px',
                color: '#e2e8f0',
                boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.15)',
                pointerEvents: 'all',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 14,
            }}>
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>🍪</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>Cookie Consent</span>
                </div>

                {/* Message */}
                <p style={{
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: '#94a3b8',
                    margin: 0,
                }}>
                    We use essential cookies to keep you logged in and remember your preferences. 
                    We do not use advertising or tracking cookies. 
                    <a href="/en/privacy" style={{ color: '#4ade80', marginLeft: 4 }}>Privacy Policy</a>
                </p>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button
                        onClick={accept}
                        style={{
                            flex: 1,
                            padding: '10px 20px',
                            background: '#2e7d32',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#388e3c')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#2e7d32')}
                    >
                        Accept All
                    </button>
                    <button
                        onClick={decline}
                        style={{
                            padding: '10px 20px',
                            background: 'transparent',
                            color: '#94a3b8',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#94a3b8';
                            e.currentTarget.style.color = '#e2e8f0';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                            e.currentTarget.style.color = '#94a3b8';
                        }}
                    >
                        Decline
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes cookieSlideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
