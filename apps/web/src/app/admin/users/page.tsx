'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import styles from './users.module.css';

interface User {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    profileCompleted: boolean;
    createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function UsersPage() {
    const { user, token, isLoading: authLoading } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        if (token) {
            fetchUsers();
        }
    }, [token]);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
            } else {
                setError(data.error?.message || 'Failed to load users');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter((u) => {
        const term = searchTerm.toLowerCase();
        return (
            u.name?.toLowerCase().includes(term) ||
            u.phone.includes(term) ||
            u.email?.toLowerCase().includes(term)
        );
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (authLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className="spinner" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <span className={styles.logoIcon}>🏛️</span>
                        ShasanSetu
                    </div>
                    <span className={styles.badge}>{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
                </div>
                <nav className={styles.nav}>
                    <Link href="/admin/dashboard" className={styles.navLink}>📊 Dashboard</Link>
                    <Link href="/admin/schemes" className={styles.navLink}>📋 Schemes</Link>
                    <Link href="/admin/orders" className={styles.navLink}>📦 Orders</Link>
                    <Link href="/admin/users" className={`${styles.navLink} ${styles.active}`}>👥 Users</Link>
                    {isSuperAdmin && (
                        <Link href="/admin/admins" className={styles.navLink}>🔐 Admins</Link>
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1>Users</h1>
                        <p className={styles.subtitle}>View all registered users</p>
                    </div>
                    <div className={styles.searchBox}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {loading ? (
                    <div className={styles.loading}><div className="spinner" /></div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Profile</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <tr key={u.id}>
                                        <td className={styles.nameCell}>{u.name || '-'}</td>
                                        <td>{u.phone}</td>
                                        <td>{u.email || '-'}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${u.profileCompleted ? styles.complete : styles.incomplete}`}>
                                                {u.profileCompleted ? 'Complete' : 'Incomplete'}
                                            </span>
                                        </td>
                                        <td>{formatDate(u.createdAt)}</td>
                                        <td>
                                            <button className={styles.viewBtn} onClick={() => setSelectedUser(u)}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className={styles.empty}>
                                {searchTerm ? 'No users match your search' : 'No users found'}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.stats}>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{users.length}</span>
                        <span className={styles.statLabel}>Total Users</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{users.filter(u => u.profileCompleted).length}</span>
                        <span className={styles.statLabel}>Complete Profiles</span>
                    </div>
                </div>
            </main>

            {/* User Details Modal */}
            {selectedUser && (
                <div className={styles.modalOverlay} onClick={() => setSelectedUser(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>User Details</h2>
                        <div className={styles.details}>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Name</span>
                                <span>{selectedUser.name || '-'}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Phone</span>
                                <span>{selectedUser.phone}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Email</span>
                                <span>{selectedUser.email || '-'}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Profile Status</span>
                                <span className={`${styles.statusBadge} ${selectedUser.profileCompleted ? styles.complete : styles.incomplete}`}>
                                    {selectedUser.profileCompleted ? 'Complete' : 'Incomplete'}
                                </span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.label}>Joined</span>
                                <span>{formatDate(selectedUser.createdAt)}</span>
                            </div>
                        </div>
                        <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
