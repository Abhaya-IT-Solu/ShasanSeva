'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { usePortalAuth } from '@/lib/auth';
import styles from './login.module.css';

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, login } = usePortalAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in, bounce to the schemes list
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace('/');
        }
    }, [authLoading, isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const res = await api.login(username.trim(), password);
        if (res.success && res.data) {
            login(res.data.token, res.data.username);
            router.replace('/');
        } else {
            setError(res.error?.message || 'Login failed');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>ShasanSeva</h1>
                    <p className={styles.subtitle}>Developer Portal — Custom Forms</p>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className="input-group">
                        <label className="input-label">Username</label>
                        <input
                            type="text"
                            className="input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={isLoading}>
                        {isLoading ? <span className="spinner" /> : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
