'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import layoutStyles from '../dashboard/dashboard.module.css';
import styles from './users.module.css';

interface User {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    category: string | null;
    profileComplete: boolean;
    createdAt: string;
}

export default function UsersPage() {
    const { user, logout } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.request('/api/admin/users');
            if (response.success) {
                setUsers(response.data as User[]);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
        u.phone.includes(search) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    );

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
                    <Link href="/admin/users" className={`${layoutStyles.navLink} ${layoutStyles.active}`}>
                        👥 Users
                    </Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={layoutStyles.navLink}>
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
                    <h1>Users</h1>
                    <p style={{ color: 'var(--color-gray-500)', marginTop: '0.25rem' }}>View and manage registered users</p>
                </header>

                {/* Search */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <input
                        type="text"
                        placeholder="Search by name, phone or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                        style={{ maxWidth: '400px' }}
                    />
                </div>

                {isLoading ? (
                    <div className={styles.spinnerWrapper}>
                        <div className={styles.spinner} />
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th className={styles.tableHeadCell}>User</th>
                                        <th className={styles.tableHeadCell}>Contact</th>
                                        <th className={styles.tableHeadCell}>Category</th>
                                        <th className={styles.tableHeadCell}>Profile Status</th>
                                        <th className={styles.tableHeadCell}>Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className={styles.emptyState}>
                                                No users found matching your search.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u.id}>
                                                <td className={styles.tableCell}>
                                                    <div className={styles.userInfo}>
                                                        <div className={styles.userAvatar}>
                                                            {(u.name || u.phone).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className={styles.userName}>
                                                            {u.name || 'Unnamed User'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={styles.tableCell}>
                                                    <div className={styles.userContact}>
                                                        <span className={styles.userPhone}>{u.phone}</span>
                                                        <span className={styles.userEmail}>{u.email}</span>
                                                    </div>
                                                </td>
                                                <td className={styles.tableCell}>
                                                    <span className={styles.categoryBadge}>
                                                        {u.category?.replace('_', ' ') || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className={styles.tableCell}>
                                                    <span className={`${styles.statusBadge} ${u.profileComplete
                                                        ? styles.statusComplete
                                                        : styles.statusIncomplete
                                                        }`}>
                                                        {u.profileComplete ? 'Complete' : 'Incomplete'}
                                                    </span>
                                                </td>
                                                <td className={styles.tableCell}>
                                                    <span className={styles.dateText}>
                                                        {new Date(u.createdAt).toLocaleDateString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
