'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import styles from '../admin.module.css';

interface Announcement {
    id: string;
    type: 'MARQUEE' | 'PILL' | 'POPULAR_TAG' | 'CAROUSEL';
    title: string;
    description?: string | null;
    link?: string | null;
    imageKey?: string | null;
    imageUrl?: string | null;
    schemeId?: string | null;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
}

interface Scheme {
    id: string;
    name: string;
    slug: string;
    category: string | null;
    status: string;
}

type AnnouncementType = 'MARQUEE' | 'PILL' | 'POPULAR_TAG' | 'CAROUSEL';

const TYPE_LABELS: Record<string, string> = {
    MARQUEE: '📰 Marquee',
    PILL: '💊 Hero Pill',
    POPULAR_TAG: '🔖 Popular Tag',
    CAROUSEL: '🎠 Carousel',
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
    MARQUEE: { bg: '#eff6ff', color: '#1e40af' },
    PILL: { bg: '#fef3c7', color: '#92400e' },
    POPULAR_TAG: { bg: '#f0fdf4', color: '#166534' },
    CAROUSEL: { bg: '#fdf4ff', color: '#7e22ce' },
};

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [schemesForPicker, setSchemesForPicker] = useState<Scheme[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formType, setFormType] = useState<AnnouncementType>('MARQUEE');
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formLink, setFormLink] = useState('');
    const [formSchemeId, setFormSchemeId] = useState('');
    const [formImageKey, setFormImageKey] = useState('');
    const [formActive, setFormActive] = useState(true);
    const [formOrder, setFormOrder] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Image upload state
    const [isUploading, setIsUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAnnouncements();
        fetchSchemes();
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

    const fetchSchemes = async () => {
        try {
            const response = await api.request('/api/schemes');
            if (response.success) {
                const data = response.data as { schemes?: Scheme[] } | Scheme[];
                const list = Array.isArray(data) ? data : (data.schemes || []);
                setSchemesForPicker(list.filter((s: Scheme) => s.status === 'ACTIVE'));
            }
        } catch {
            // Silent fail — scheme picker will be empty
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormType('MARQUEE');
        setFormTitle('');
        setFormDescription('');
        setFormLink('');
        setFormSchemeId('');
        setFormImageKey('');
        setFormActive(true);
        setFormOrder(0);
        setShowForm(false);
        setImagePreview(null);
        setUploadProgress('');
    };

    const openEdit = (a: Announcement) => {
        setEditingId(a.id);
        setFormType(a.type);
        setFormTitle(a.title);
        setFormDescription(a.description || '');
        setFormLink(a.link || '');
        setFormSchemeId(a.schemeId || '');
        setFormImageKey(a.imageKey || '');
        setFormActive(a.isActive);
        setFormOrder(a.sortOrder);
        setImagePreview(a.imageUrl || null);
        setShowForm(true);
    };

    // --- Image Upload Flow ---
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Only JPEG, PNG, or WebP images are allowed');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Image must be under 10MB');
            return;
        }

        setIsUploading(true);
        setError('');
        setUploadProgress('Getting upload URL...');

        try {
            // Step 1: Get presigned URL
            const urlRes = await api.request('/api/announcements/upload-image', {
                method: 'POST',
                body: { contentType: file.type },
            });

            if (!urlRes.success) {
                setError(urlRes.error?.message || 'Failed to get upload URL');
                return;
            }

            const { uploadUrl, key } = urlRes.data as { uploadUrl: string; key: string };
            setUploadProgress('Uploading image...');

            // Step 2: PUT file to R2
            await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file,
            });

            // Step 3: Save the key in form state
            setFormImageKey(key);
            setUploadProgress('Upload complete ✓');

            // Show local preview
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        } catch {
            setError('Failed to upload image');
            setUploadProgress('');
        } finally {
            setIsUploading(false);
        }
    };

    const clearImage = () => {
        setFormImageKey('');
        setImagePreview(null);
        setUploadProgress('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Save ---
    const handleSave = async () => {
        if (!formTitle.trim()) return;

        // CAROUSEL requires a scheme
        if (formType === 'CAROUSEL' && !formSchemeId) {
            setError('Carousel items must be linked to a scheme');
            return;
        }

        setIsSaving(true);
        setError('');
        setSuccess('');

        try {
            const body: Record<string, unknown> = {
                type: formType,
                title: formTitle.trim(),
                link: formLink.trim() || undefined,
                isActive: formActive,
                sortOrder: formOrder,
            };

            // Carousel-specific fields
            if (formType === 'CAROUSEL') {
                body.description = formDescription.trim() || undefined;
                body.schemeId = formSchemeId || undefined;
                body.imageKey = formImageKey || undefined;
            } else {
                // Clear carousel fields when switching type
                if (editingId) {
                    body.description = null;
                    body.schemeId = null;
                    body.imageKey = null;
                }
            }

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

    const getSchemeNameById = (id: string | null | undefined) => {
        if (!id) return '—';
        const scheme = schemesForPicker.find((s) => s.id === id);
        return scheme ? scheme.name : id.slice(0, 8) + '...';
    };

    const isCarousel = formType === 'CAROUSEL';

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

            {error && <div className={styles.alert} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', marginBottom: 16, padding: '10px 16px', borderRadius: 8 }}>{error}</div>}
            {success && <div className={styles.alert} style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', marginBottom: 16, padding: '10px 16px', borderRadius: 8 }}>{success}</div>}

            {/* Add/Edit Form */}
            {showForm && (
                <section className={styles.section} style={{ marginBottom: 24 }}>
                    <h2>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 560, marginTop: 14 }}>

                        {/* Type */}
                        <div>
                            <label style={labelStyle}>Type</label>
                            <select
                                value={formType}
                                onChange={(e) => setFormType(e.target.value as AnnouncementType)}
                                style={inputStyle}
                            >
                                <option value="MARQUEE">📰 Marquee (scrolling ticker)</option>
                                <option value="PILL">💊 Hero Pill (badge above title)</option>
                                <option value="POPULAR_TAG">🔖 Popular Tag (below search)</option>
                                <option value="CAROUSEL">🎠 Carousel (app intro slider)</option>
                            </select>
                        </div>

                        {/* Title */}
                        <div>
                            <label style={labelStyle}>Title{isCarousel ? ' (Slide Heading)' : ' / Text'}</label>
                            <input
                                type="text"
                                value={formTitle}
                                onChange={(e) => setFormTitle(e.target.value)}
                                placeholder={isCarousel ? 'e.g. PM Kisan Samman Nidhi' : 'e.g. PM Kisan Update Available'}
                                style={inputStyle}
                            />
                        </div>

                        {/* Description — Carousel only */}
                        {isCarousel && (
                            <div>
                                <label style={labelStyle}>Description (subtitle)</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="e.g. Get ₹6000/year direct benefit transfer. Apply now!"
                                    rows={2}
                                    maxLength={500}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>{formDescription.length}/500</span>
                            </div>
                        )}

                        {/* Scheme Picker — Carousel only */}
                        {isCarousel && (
                            <div>
                                <label style={labelStyle}>Linked Scheme <span style={{ color: '#dc2626' }}>*</span></label>
                                <select
                                    value={formSchemeId}
                                    onChange={(e) => setFormSchemeId(e.target.value)}
                                    style={{ ...inputStyle, background: formSchemeId ? '#f0fdf4' : undefined }}
                                >
                                    <option value="">— Select a scheme —</option>
                                    {schemesForPicker.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name} {s.category ? `(${s.category})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {!formSchemeId && (
                                    <span style={{ fontSize: 12, color: '#dc2626' }}>Required for carousel slides</span>
                                )}
                            </div>
                        )}

                        {/* Background Image — Carousel only */}
                        {isCarousel && (
                            <div>
                                <label style={labelStyle}>Background Image (optional)</label>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    {/* Preview */}
                                    <div style={{
                                        width: 160, height: 90, borderRadius: 8, overflow: 'hidden',
                                        border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', background: '#f8fafc', flexShrink: 0,
                                    }}>
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: 8 }}>No image</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleImageSelect}
                                            style={{ display: 'none' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            style={{
                                                padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                                                background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer',
                                            }}
                                        >
                                            {isUploading ? '⏳ Uploading...' : (formImageKey ? '🔄 Replace' : '📁 Choose Image')}
                                        </button>
                                        {formImageKey && (
                                            <button
                                                type="button"
                                                onClick={clearImage}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 6, fontSize: 12,
                                                    background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer',
                                                }}
                                            >
                                                ✕ Remove
                                            </button>
                                        )}
                                        {uploadProgress && (
                                            <span style={{ fontSize: 12, color: uploadProgress.includes('✓') ? '#16a34a' : '#64748b' }}>
                                                {uploadProgress}
                                            </span>
                                        )}
                                        <span style={{ fontSize: 11, color: '#94a3b8' }}>JPEG, PNG or WebP • Max 10MB</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Link — for non-carousel */}
                        {!isCarousel && (
                            <div>
                                <label style={labelStyle}>Link (optional)</label>
                                <input
                                    type="text"
                                    value={formLink}
                                    onChange={(e) => setFormLink(e.target.value)}
                                    placeholder="e.g. /schemes?category=FARMER"
                                    style={inputStyle}
                                />
                            </div>
                        )}

                        {/* Sort Order + Active */}
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div>
                                <label style={labelStyle}>Sort Order</label>
                                <input
                                    type="number"
                                    value={formOrder}
                                    onChange={(e) => setFormOrder(Number(e.target.value))}
                                    style={{ ...inputStyle, width: 80 }}
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

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={isSaving || !formTitle.trim() || (isCarousel && !formSchemeId)}
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
                                    <th style={thStyle}>Type</th>
                                    <th style={thStyle}>Title</th>
                                    <th style={thStyle}>Details</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Order</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {announcements.map((a) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                        {/* Type badge */}
                                        <td style={{ padding: 12, fontSize: 14 }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                                                background: TYPE_COLORS[a.type]?.bg || '#f1f5f9',
                                                color: TYPE_COLORS[a.type]?.color || '#64748b',
                                            }}>
                                                {TYPE_LABELS[a.type]}
                                            </span>
                                        </td>

                                        {/* Title */}
                                        <td style={{ padding: 12, fontSize: 14, fontWeight: 500, maxWidth: 200 }}>
                                            <div style={{ lineHeight: 1.4 }}>
                                                {a.title}
                                                {a.description && (
                                                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400, marginTop: 2 }}>
                                                        {a.description.length > 60 ? a.description.slice(0, 60) + '...' : a.description}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Details (link / scheme / image) */}
                                        <td style={{ padding: 12, fontSize: 13, color: '#64748b' }}>
                                            {a.type === 'CAROUSEL' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    <span>🔗 {getSchemeNameById(a.schemeId)}</span>
                                                    <span>{a.imageKey ? '🖼️ Has image' : '📷 No image'}</span>
                                                </div>
                                            ) : (
                                                a.link || '—'
                                            )}
                                        </td>

                                        {/* Sort Order */}
                                        <td style={{ padding: 12, fontSize: 14, textAlign: 'center' }}>{a.sortOrder}</td>

                                        {/* Active toggle */}
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

                                        {/* Actions */}
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

// Shared inline styles
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#374151',
};

const inputStyle: React.CSSProperties = {
    padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, width: '100%', fontSize: 14,
};

const thStyle: React.CSSProperties = {
    padding: 12, textAlign: 'left', fontSize: 13, color: '#64748b', textTransform: 'uppercase',
};
