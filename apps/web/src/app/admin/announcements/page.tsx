'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import styles from '../admin.module.css';

interface Announcement {
    id: string;
    type: 'MARQUEE' | 'PILL' | 'POPULAR_TAG';
    title: string;
    link?: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
    MARQUEE: '📰 Marquee',
    PILL: '💊 Hero Pill',
    POPULAR_TAG: '🔖 Popular Tag',
};

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formType, setFormType] = useState<'MARQUEE' | 'PILL' | 'POPULAR_TAG'>('MARQUEE');
    const [formTitle, setFormTitle] = useState('');
    const [formLink, setFormLink] = useState('');
    const [formActive, setFormActive] = useState(true);
    const [formOrder, setFormOrder] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            const response = await api.request('/api/announcements');
            if (response.success) {
                setAnnouncements(response.data as Announcement[]);
            }
        } catch {
            setError('Failed to load announcements');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormType('MARQUEE');
        setFormTitle('');
        setFormLink('');
        setFormActive(true);
        setFormOrder(0);
        setShowForm(false);
    };

    const openEdit = (a: Announcement) => {
        setEditingId(a.id);
        setFormType(a.type);
        setFormTitle(a.title);
        setFormLink(a.link || '');
        setFormActive(a.isActive);
        setFormOrder(a.sortOrder);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim()) return;
        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const body = {
                type: formType,
                title: formTitle.trim(),
                link: formLink.trim() || undefined,
                isActive: formActive,
                sortOrder: formOrder,
            };

            if (editingId) {
                const res = await api.request(`/api/announcements/${editingId}`, { method: 'PATCH', body });
                if (res.success) setSuccess('Announcement updated');
                else setError(res.error?.message || 'Update failed');
            } else {
                const res = await api.request('/api/announcements', { method: 'POST', body });
                if (res.success) setSuccess('Announcement created');
                else setError(res.error?.message || 'Create failed');
            }

            resetForm();
            fetchAnnouncements();
        } catch {
            setError('Failed to save announcement');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this announcement?')) return;
        setError('');
        setSuccess('');
        try {
            const res = await api.request(`/api/announcements/${id}`, { method: 'DELETE' });
            if (res.success) {
                setSuccess('Announcement deleted');
                fetchAnnouncements();
            } else {
                setError(res.error?.message || 'Delete failed');
            }
        } catch {
            setError('Failed to delete');
        }
    };

    const toggleActive = async (a: Announcement) => {
        try {
            await api.request(`/api/announcements/${a.id}`, {
                method: 'PATCH',
                body: { isActive: !a.isActive },
            });
            fetchAnnouncements();
        } catch {
            setError('Failed to toggle');
        }
    };

    return (
        <>
            <header className={styles.pageHeader}>
                <h1>📢 Announcements</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => { resetForm(); setShowForm(true); }}
                >
                    + Add Announcement
                </button>
            </header>

            {error && <div className={styles.alert} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>{error}</div>}
            {success && <div className={styles.alert} style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>{success}</div>}

            {/* Add/Edit Form */}
            {showForm && (
                <section className={styles.section} style={{ marginBottom: 24 }}>
                    <h2>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500, marginTop: 12 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Type</label>
                            <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value as 'MARQUEE' | 'PILL' | 'POPULAR_TAG')}
                                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: '100%', fontSize: 14 }}
                            >
                                <option value="MARQUEE">📰 Marquee (scrolling ticker)</option>
                                <option value="PILL">💊 Hero Pill (badge above title)</option>
                                <option value="POPULAR_TAG">🔖 Popular Tag (below search)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Title / Text</label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder="e.g. PM Kisan Samman Nidhi Update Available"
                                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: '100%', fontSize: 14 }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Link (optional)</label>
                            <input
                                type="text"
                                value={formLink}
                                onChange={(e) => setFormLink(e.target.value)}
                                placeholder="e.g. /schemes?category=FARMER"
                                style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: '100%', fontSize: 14 }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Sort Order</label>
                                <input
                                    type="number"
                                    value={formOrder}
                                    onChange={(e) => setFormOrder(Number(e.target.value))}
                                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: 80, fontSize: 14 }}
                                />
                            </div>
                            <div style={{ marginTop: 20 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formActive}
                                        onChange={(e) => setFormActive(e.target.checked)}
                                        style={{ width: 18, height: 18 }}
                                    />
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>Active</span>
                                </label>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={isSaving || !formTitle.trim()}
                            >
                                {isSaving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                            </button>
                            <button className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                        </div>
                    </div>
                </section>
            )}

            {/* Announcements Table */}
            <section className={styles.section}>
                {isLoading ? (
                    <div className={styles.emptyState}><div className="spinner" /></div>
                ) : announcements.length === 0 ? (
                    <div className={styles.emptyState}><p>No announcements yet. Click &quot;+ Add Announcement&quot; to create one.</p></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-gray-200)' }}>
                                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>Type</th>
                                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>Title</th>
                                    <th style={{ padding: 12, textAlign: 'left', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>Link</th>
                                    <th style={{ padding: 12, textAlign: 'center', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>Order</th>
                                    <th style={{ padding: 12, textAlign: 'center', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: 12, textAlign: 'right', fontSize: 13, color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {announcements.map((a) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                        <td style={{ padding: 12, fontSize: 14 }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                background: a.type === 'MARQUEE' ? '#eff6ff' : a.type === 'PILL' ? '#fef3c7' : '#f0fdf4',
                                                color: a.type === 'MARQUEE' ? '#1e40af' : a.type === 'PILL' ? '#92400e' : '#166534',
                                            }}>
                                                {TYPE_LABELS[a.type]}
                                            </span>
                                        </td>
                                        <td style={{ padding: 12, fontSize: 14, fontWeight: 500 }}>{a.title}</td>
                                        <td style={{ padding: 12, fontSize: 13, color: '#64748b' }}>{a.link || '—'}</td>
                                        <td style={{ padding: 12, fontSize: 14, textAlign: 'center' }}>{a.sortOrder}</td>
                                        <td style={{ padding: 12, textAlign: 'center' }}>
                                            <button
                                                onClick={() => toggleActive(a)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                                    border: 'none', cursor: 'pointer',
                                                    background: a.isActive ? '#dcfce7' : '#f1f5f9',
                                                    color: a.isActive ? '#166534' : '#64748b',
                                                }}
                                            >
                                                {a.isActive ? '✓ Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td style={{ padding: 12, textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                <button
                                                    onClick={() => openEdit(a)}
                                                    style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </>
    );
}
