'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import styles from './admins.module.css';

interface Admin {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: 'ADMIN' | 'SUPER_ADMIN';
    isActive: boolean;
    createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminManagementPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);

    // Create form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
    });

    // Edit form state
    const [editFormData, setEditFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN',
    });

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        if (!authLoading && !isSuperAdmin) {
            router.push('/admin/dashboard');
        }
    }, [authLoading, isSuperAdmin, router]);

    useEffect(() => {
        if (api.getToken() && isSuperAdmin) {
            fetchAdmins();
        }
    }, [isSuperAdmin]);

    const fetchAdmins = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/admins`, {
                headers: { Authorization: `Bearer ${api.getToken()}` },
            });
            const data = await res.json();
            if (data.success) {
                setAdmins(data.data);
            } else {
                setError(data.error?.message || 'Failed to load admins');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/api/admin/admins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${api.getToken()}`,
                },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                setShowCreateModal(false);
                setFormData({ name: '', phone: '', email: '', password: '', role: 'ADMIN' });
                setSuccess('Admin created successfully!');
                fetchAdmins();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error?.message || 'Failed to create admin');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setCreating(false);
        }
    };

    const handleEditClick = (admin: Admin) => {
        setEditingAdmin(admin);
        setEditFormData({
            name: admin.name,
            phone: admin.phone,
            email: admin.email || '',
            password: '',  // Don't pre-fill password
            role: admin.role,
        });
        setShowEditModal(true);
        setError('');
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAdmin) return;

        setUpdating(true);
        setError('');

        try {
            // Only send fields that changed
            const updates: Record<string, string> = {};
            if (editFormData.name !== editingAdmin.name) updates.name = editFormData.name;
            if (editFormData.phone !== editingAdmin.phone) updates.phone = editFormData.phone;
            if (editFormData.email !== (editingAdmin.email || '')) updates.email = editFormData.email;
            if (editFormData.role !== editingAdmin.role) updates.role = editFormData.role;
            if (editFormData.password) updates.password = editFormData.password;

            if (Object.keys(updates).length === 0) {
                setShowEditModal(false);
                return;
            }

            const res = await fetch(`${API_URL}/api/admin/admins/${editingAdmin.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${api.getToken()}`,
                },
                body: JSON.stringify(updates),
            });
            const data = await res.json();
            if (data.success) {
                setShowEditModal(false);
                setEditingAdmin(null);
                setSuccess('Admin updated successfully!');
                fetchAdmins();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.error?.message || 'Failed to update admin');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setUpdating(false);
        }
    };

    const handleToggleActive = async (adminId: string) => {
        setToggling(adminId);
        try {
            const res = await fetch(`${API_URL}/api/admin/admins/${adminId}/toggle-active`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${api.getToken()}` },
            });
            const data = await res.json();
            if (data.success) {
                fetchAdmins();
            } else {
                setError(data.error?.message || 'Failed to toggle status');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setToggling(null);
        }
    };

    if (authLoading || !isSuperAdmin) {
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
                        <Image src="/logo/logo_icon.png" alt="Logo" width={200} height={100} />
                    </div>
                    <span className={styles.badge}>Super Admin</span>
                </div>
                <nav className={styles.nav}>
                    <Link href="/admin/dashboard" className={styles.navLink}>📊 Dashboard</Link>
                    <Link href="/admin/schemes" className={styles.navLink}>📋 Schemes</Link>
                    <Link href="/admin/orders" className={styles.navLink}>📦 Orders</Link>
                    <Link href="/admin/users" className={styles.navLink}>👥 Users</Link>
                    <Link href="/admin/admins" className={`${styles.navLink} ${styles.active}`}>🔐 Admins</Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1>Admin Management</h1>
                        <p className={styles.subtitle}>Manage admin accounts and permissions</p>
                    </div>
                    <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
                        + Add Admin
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

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
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {admins.map((admin) => (
                                    <tr key={admin.id}>
                                        <td className={styles.nameCell}>{admin.name}</td>
                                        <td>{admin.phone}</td>
                                        <td>{admin.email || '-'}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${admin.role === 'SUPER_ADMIN' ? styles.superAdmin : ''}`}>
                                                {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${admin.isActive ? styles.active : styles.inactive}`}>
                                                {admin.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className={styles.actionsCell}>
                                            {/* Edit Button */}
                                            <button
                                                className={styles.editBtn}
                                                onClick={() => handleEditClick(admin)}
                                                title="Edit Admin"
                                            >
                                                ✏️
                                            </button>
                                            {/* Toggle Active Button */}
                                            {admin.id !== user?.userId && (
                                                <button
                                                    className={`${styles.toggleBtn} ${admin.isActive ? styles.deactivate : styles.activate}`}
                                                    onClick={() => handleToggleActive(admin.id)}
                                                    disabled={toggling === admin.id}
                                                >
                                                    {toggling === admin.id ? '...' : admin.isActive ? 'Deactivate' : 'Activate'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {admins.length === 0 && (
                            <div className={styles.empty}>No admins found</div>
                        )}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Admin</h2>
                        <form onSubmit={handleCreate}>
                            <div className={styles.formGroup}>
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Phone *</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Role *</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'SUPER_ADMIN' })}
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingAdmin && (
                <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Edit Admin</h2>
                        <form onSubmit={handleUpdate}>
                            <div className={styles.formGroup}>
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Phone *</label>
                                <input
                                    type="tel"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    required
                                    pattern="[0-9]{10}"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>New Password <span className={styles.hint}>(leave blank to keep current)</span></label>
                                <input
                                    type="password"
                                    value={editFormData.password}
                                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                    minLength={8}
                                    placeholder="Enter new password..."
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Role *</label>
                                <select
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'ADMIN' | 'SUPER_ADMIN' })}
                                    disabled={editingAdmin.id === user?.userId}
                                >
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                                {editingAdmin.id === user?.userId && (
                                    <span className={styles.hint}>Cannot change your own role</span>
                                )}
                            </div>
                            <div className={styles.modalActions}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={updating}>
                                    {updating ? 'Updating...' : 'Update Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
