import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 50%, #fff7e0 100%)',
            padding: '24px',
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '480px',
            }}>
                {/* 404 Number */}
                <div style={{
                    fontSize: '120px',
                    fontWeight: 800,
                    lineHeight: 1,
                    background: 'linear-gradient(135deg, #1b5e20, #2e7d32, #ff9800)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '16px',
                }}>
                    404
                </div>

                {/* Message */}
                <h1 style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#1b5e20',
                    marginBottom: '12px',
                }}>
                    Page Not Found
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    lineHeight: 1.6,
                    marginBottom: '40px',
                }}>
                    The page you are looking for doesn&apos;t exist or has been moved. 
                    Let&apos;s get you back on track.
                </p>

                {/* Navigation Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap' as const,
                }}>
                    <Link href="/" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 28px',
                        background: '#1b5e20',
                        color: 'white',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(27, 94, 32, 0.2)',
                    }}>
                        <span className="material-icons" style={{ fontSize: 18 }}>home</span>
                        Go Home
                    </Link>
                    <Link href="/en/schemes" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 28px',
                        background: 'white',
                        color: '#1b5e20',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '14px',
                        border: '2px solid #c8e6c9',
                        transition: 'all 0.2s',
                    }}>
                        <span className="material-icons" style={{ fontSize: 18 }}>search</span>
                        Browse Schemes
                    </Link>
                </div>

                {/* Decorative Element */}
                <div style={{
                    marginTop: '48px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1b5e20', opacity: 0.3 }}></span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff9800', opacity: 0.5 }}></span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1b5e20', opacity: 0.3 }}></span>
                </div>
            </div>
        </div>
    );
}
