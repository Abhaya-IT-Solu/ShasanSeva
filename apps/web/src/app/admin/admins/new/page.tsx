'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import layoutStyles from '../../dashboard/dashboard.module.css';
import styles from './newAdmin.module.css';

const createAdminSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

type CreateAdminForm = z.infer<typeof createAdminSchema>;

export default function NewAdminPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const { register, handleSubmit, formState: { errors } } = useForm<CreateAdminForm>({
        resolver: zodResolver(createAdminSchema),
        defaultValues: {
            role: 'ADMIN',
        }
    });

    const onSubmit = async (data: CreateAdminForm) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await api.request('/api/admin/admins', {
                method: 'POST',
                body: data,
            });

            if (response.success) {
                router.push('/admin/admins');
            } else {
                setError(response.error?.message || 'Failed to create admin');
            }
        } catch (error) {
            console.error('Failed to create admin:', error);
            setError('An unexpected error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={layoutStyles.container}>
            {/* Sidebar */}
            <aside className={layoutStyles.sidebar}>
                <div className={layoutStyles.sidebarHeader}>
                    <Link href="/" className={layoutStyles.logo}>
                        <span className={layoutStyles.logoIcon}>🏛️</span>
                        ShasanSetu
                    </Link>
                    <span className={layoutStyles.badge}>
                        {isSuperAdmin ? 'Super Admin' : 'Admin'}
                    </span>
                </div>

                <nav className={layoutStyles.nav}>
                    <Link href="/admin/dashboard" className={layoutStyles.navLink}>
                        📊 Dashboard
                    </Link>
                    <Link href="/admin/orders" className={layoutStyles.navLink}>
                        📦 Orders
                    </Link>
                    <Link href="/admin/schemes" className={layoutStyles.navLink}>
                        📋 Schemes
                    </Link>
                    <Link href="/admin/users" className={layoutStyles.navLink}>
                        👥 Users
                    </Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={`${layoutStyles.navLink} ${layoutStyles.active}`}>
                            🛡️ Manage Admins
                        </Link>
                    )}
                </nav>

                <div className={layoutStyles.sidebarFooter}>
                    <span className={layoutStyles.userName}>{user?.name || user?.phone}</span>
                    <button onClick={logout} className="btn btn-secondary btn-full">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={layoutStyles.main}>
                <header className={layoutStyles.pageHeader}>
                    <h1>Create New Admin</h1>
                    <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>Add a new administrator to the system</p>
                </header>

                <div className={styles.formCard}>
                    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                        {error && (
                            <div className={styles.errorAlert}>
                                {error}
                            </div>
                        )}

                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Full Name
                                </label>
                                <input
                                    {...register('name')}
                                    type="text"
                                    className={styles.input}
                                    placeholder="John Doe"
                                />
                                {errors.name && (
                                    <p className={styles.errorMessage}>{errors.name.message}</p>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Phone Number
                                </label>
                                <input
                                    {...register('phone')}
                                    type="tel"
                                    className={styles.input}
                                    placeholder="9999999999"
                                />
                                {errors.phone && (
                                    <p className={styles.errorMessage}>{errors.phone.message}</p>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Email Address (Optional)
                                </label>
                                <input
                                    {...register('email')}
                                    type="email"
                                    className={styles.input}
                                    placeholder="admin@example.com"
                                />
                                {errors.email && (
                                    <p className={styles.errorMessage}>{errors.email.message}</p>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Role
                                </label>
                                <select
                                    {...register('role')}
                                    className={styles.select}
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                                {errors.role && (
                                    <p className={styles.errorMessage}>{errors.role.message}</p>
                                )}
                            </div>

                            <div className={`${styles.formGroup} ${styles.columnSpan2}`}>
                                <label className={styles.label}>
                                    Password
                                </label>
                                <input
                                    {...register('password')}
                                    type="password"
                                    className={styles.input}
                                    placeholder="••••••••"
                                />
                                {errors.password && (
                                    <p className={styles.errorMessage}>{errors.password.message}</p>
                                )}
                                <p className={styles.helperText}>
                                    Must be at least 8 characters long
                                </p>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={styles.submitButton}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Admin'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
