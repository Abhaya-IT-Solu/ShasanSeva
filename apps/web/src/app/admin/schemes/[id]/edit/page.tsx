'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { CustomFormField } from '@shasansetu/types';
import styles from '../../../admin.module.css';
import formStyles from '../../new/newScheme.module.css';

interface RequiredDoc {
    type: string;
    label: string;
    label_mr: string;
    required: boolean;
    description: string;
    description_mr: string;
}

interface Translation {
    name: string;
    description?: string;
    eligibility?: string;
    benefits?: string;
}

interface SchemeData {
    id: string;
    slug: string;
    category: string;
    schemeType: string;
    serviceFee: string;
    status: string;
    requiredDocs: RequiredDoc[];
    translations: {
        en?: Translation;
        mr?: Translation;
    };
    averageCompletionDays?: string | null;
    displayOrder?: number;
    customFields?: CustomFormField[];
    logoUrl?: string | null;
    referenceImageUrl?: string | null;
}


const FIELD_TYPES: { value: CustomFormField['type']; label: string }[] = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'select', label: 'Dropdown' },
];

/**
 * The wire type with every optional turned into '' / [], so React inputs stay
 * controlled. Ported from the developer portal's builder.
 */
interface EditableField {
    id: string;
    type: CustomFormField['type'];
    label: string;
    label_mr: string;
    required: boolean;
    placeholder: string;
    placeholder_mr: string;
    options: { label: string; label_mr: string; value: string }[];
    validationRegex: string;
}

function toEditable(f: CustomFormField): EditableField {
    return {
        id: f.id || '',
        type: f.type || 'text',
        label: f.label || '',
        label_mr: f.label_mr || '',
        required: !!f.required,
        placeholder: f.placeholder || '',
        placeholder_mr: f.placeholder_mr || '',
        options: (f.options || []).map((o) => ({
            label: o.label,
            label_mr: o.label_mr || o.label,
            value: o.value,
        })),
        validationRegex: f.validationRegex || '',
    };
}

function toPayload(f: EditableField): CustomFormField {
    const out: CustomFormField = {
        id: f.id.trim(),
        type: f.type,
        label: f.label.trim(),
        required: f.required,
    };
    if (f.label_mr.trim()) out.label_mr = f.label_mr.trim();
    if (f.placeholder.trim()) out.placeholder = f.placeholder.trim();
    if (f.placeholder_mr.trim()) out.placeholder_mr = f.placeholder_mr.trim();
    if (f.validationRegex.trim()) out.validationRegex = f.validationRegex.trim();
    if (f.type === 'select' && f.options.length > 0) out.options = f.options;
    return out;
}

type TabType = 'english' | 'marathi';

export default function EditSchemePage() {
    const router = useRouter();
    const params = useParams();
    const schemeId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('english');

    // Base scheme fields
    const [formData, setFormData] = useState({
        slug: '',
        category: 'STUDENT',
        schemeType: 'GOVERNMENT',
        serviceFee: '',
        averageCompletionDays: '',
        displayOrder: '',
        status: 'ACTIVE',
    });

    // Image upload states
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [refImagePreview, setRefImagePreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingRef, setUploadingRef] = useState(false);

    // Pending image changes, written only when the form is saved.
    //   undefined -> untouched, omit from the PATCH body
    //   null      -> removal requested, send null
    //   string    -> newly uploaded R2 key, send the key
    // Never hold a resolved public URL here: the API writes whatever it receives
    // straight into the column, which expects a key.
    const [pendingLogoKey, setPendingLogoKey] = useState<string | null | undefined>(undefined);
    const [pendingRefKey, setPendingRefKey] = useState<string | null | undefined>(undefined);

    // English translations
    const [englishData, setEnglishData] = useState({
        name: '',
        description: '',
        eligibility: '',
        benefits: '',
    });

    // Marathi translations
    const [marathiData, setMarathiData] = useState({
        name: '',
        description: '',
        eligibility: '',
        benefits: '',
    });

    const [requiredDocs, setRequiredDocs] = useState<RequiredDoc[]>([]);

    // Custom form fields — authored here since the developer portal was retired.
    const [customFields, setCustomFields] = useState<EditableField[]>([]);
    const [newOptionInputs, setNewOptionInputs] = useState<Record<number, string>>({});
    const [showAdvanced, setShowAdvanced] = useState<Record<number, boolean>>({});
    // Field ids present when the page loaded. Renaming one orphans the answers
    // already stored against it on existing orders, so we warn on change.
    const [originalFieldIds, setOriginalFieldIds] = useState<string[]>([]);

    // Fetch existing scheme data with translations
    useEffect(() => {
        const fetchScheme = async () => {
            try {
                // Use the new by-id endpoint
                const response = await api.request(`/api/schemes/by-id/${schemeId}`);
                if (response.success) {
                    const scheme = response.data as SchemeData;
                    setFormData({
                        slug: scheme.slug || '',
                        category: scheme.category || 'STUDENT',
                        schemeType: scheme.schemeType || 'GOVERNMENT',
                        serviceFee: scheme.serviceFee || '',
                        averageCompletionDays: scheme.averageCompletionDays || '',
                        // 0 is the "no preference" default — show it as blank, not "0"
                        displayOrder: scheme.displayOrder ? String(scheme.displayOrder) : '',
                        status: scheme.status || 'ACTIVE',
                    });

                    // Set image previews from existing public URLs
                    if (scheme.logoUrl) {
                        setLogoPreview(scheme.logoUrl); // Already a public URL from the API
                    }
                    if (scheme.referenceImageUrl) {
                        setRefImagePreview(scheme.referenceImageUrl); // Already a public URL from the API
                    }

                    // Set English translations
                    if (scheme.translations?.en) {
                        setEnglishData({
                            name: scheme.translations.en.name || '',
                            description: scheme.translations.en.description || '',
                            eligibility: scheme.translations.en.eligibility || '',
                            benefits: scheme.translations.en.benefits || '',
                        });
                    }

                    // Set Marathi translations
                    if (scheme.translations?.mr) {
                        setMarathiData({
                            name: scheme.translations.mr.name || '',
                            description: scheme.translations.mr.description || '',
                            eligibility: scheme.translations.mr.eligibility || '',
                            benefits: scheme.translations.mr.benefits || '',
                        });
                    }

                    setRequiredDocs(scheme.requiredDocs || []);
                    const loadedFields = (scheme.customFields || []).map(toEditable);
                    setCustomFields(loadedFields);
                    setOriginalFieldIds(loadedFields.map((f) => f.id));
                } else {
                    setError('Scheme not found');
                }
            } catch {
                setError('Failed to load scheme');
            } finally {
                setIsLoading(false);
            }
        };

        if (schemeId) {
            fetchScheme();
        }
    }, [schemeId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEnglishChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEnglishData(prev => ({ ...prev, [name]: value }));
    };

    const handleMarathiChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setMarathiData(prev => ({ ...prev, [name]: value }));
    };

    const addDocument = () => {
        setRequiredDocs([
            ...requiredDocs,
            { type: '', label: '', label_mr: '', required: true, description: '', description_mr: '' },
        ]);
    };

    const updateDocument = (index: number, field: keyof RequiredDoc, value: string | boolean) => {
        const updated = [...requiredDocs];
        updated[index] = { ...updated[index], [field]: value };
        setRequiredDocs(updated);
    };

    const removeDocument = (index: number) => {
        setRequiredDocs(requiredDocs.filter((_, i) => i !== index));
    };

    const addCustomField = () => {
        setCustomFields((prev) => [...prev, {
            id: '', type: 'text', label: '', label_mr: '', required: true,
            placeholder: '', placeholder_mr: '', options: [], validationRegex: '',
        }]);
    };

    const updateCustomField = (index: number, key: keyof EditableField, value: unknown) => {
        setCustomFields((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    const removeCustomField = (index: number) => {
        setCustomFields((prev) => prev.filter((_, i) => i !== index));
        setNewOptionInputs((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const addOption = (fieldIndex: number) => {
        const value = (newOptionInputs[fieldIndex] || '').trim();
        if (!value) return;
        setCustomFields((prev) => {
            const next = [...prev];
            const existing = next[fieldIndex].options;
            if (existing.some((o) => o.value === value)) return prev;
            next[fieldIndex] = {
                ...next[fieldIndex],
                options: [...existing, { value, label: value, label_mr: value }],
            };
            return next;
        });
        setNewOptionInputs((prev) => ({ ...prev, [fieldIndex]: '' }));
    };

    const removeOption = (fieldIndex: number, optionValue: string) => {
        setCustomFields((prev) => {
            const next = [...prev];
            next[fieldIndex] = {
                ...next[fieldIndex],
                options: next[fieldIndex].options.filter((o) => o.value !== optionValue),
            };
            return next;
        });
    };

    const handleImageUpload = async (file: File, type: 'logo' | 'reference') => {
        const setUploading = type === 'logo' ? setUploadingLogo : setUploadingRef;
        const setPreview = type === 'logo' ? setLogoPreview : setRefImagePreview;
        const setPendingKey = type === 'logo' ? setPendingLogoKey : setPendingRefKey;

        setUploading(true);
        setError('');
        try {
            // Convert file to base64
            const fileData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    // Remove the data:image/xxx;base64, prefix
                    resolve(result.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Upload via backend proxy (bypasses CORS)
            const response = await api.request(`/api/schemes/${schemeId}/upload-image`, {
                method: 'POST',
                body: { type, contentType: file.type, fileData },
            });

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to upload image');
            }

            // The upload endpoint persists the key itself and returns it along with
            // the resolved public URL. Track the key so a later save cannot clobber it.
            const { key, publicUrl } = (response.data || {}) as { key?: string; publicUrl?: string | null };
            if (key) setPendingKey(key);

            // Prefer the real URL — it proves the image is actually reachable.
            // A local blob would render fine even when the server cannot resolve a
            // URL at all (e.g. R2_PUBLIC_URL unset), hiding a broken configuration.
            if (publicUrl) {
                setPreview(publicUrl);
            } else {
                setPreview(URL.createObjectURL(file));
                setError('Image uploaded, but the server returned no public URL for it (R2_PUBLIC_URL may not be configured). It will not display to users.');
            }
        } catch (err: any) {
            setError(err.message || `Failed to upload ${type} image`);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Mirror the server's validateCustomFieldSet so the admin gets the message
        // before a round trip. Incomplete rows are dropped rather than flagged.
        const usable = customFields.filter((f) => f.id.trim() && f.label.trim());
        const ids = usable.map((f) => f.id.trim());
        if (new Set(ids).size !== ids.length) {
            setError('Duplicate custom field IDs are not allowed.');
            return;
        }
        const badSelect = usable.find((f) => f.type === 'select' && f.options.length === 0);
        if (badSelect) {
            setError(`Dropdown field "${badSelect.label || badSelect.id}" needs at least one option.`);
            return;
        }

        setIsSaving(true);

        try {
            // Send data in the new translations format
            const response = await api.request(`/api/schemes/${schemeId}`, {
                method: 'PATCH',
                body: {
                    slug: formData.slug,
                    category: formData.category,
                    schemeType: formData.schemeType,
                    serviceFee: formData.serviceFee,
                    averageCompletionDays: formData.averageCompletionDays ? Number(formData.averageCompletionDays) : null,
                    displayOrder: formData.displayOrder ? Number(formData.displayOrder) : 0,
                    status: formData.status,
                    requiredDocs: requiredDocs.filter(doc => doc.type && doc.label),
                    // Only sent when the admin actually changed an image. The API
                    // ignores undefined, so an untouched image is left alone.
                    ...(pendingLogoKey !== undefined && { logoUrl: pendingLogoKey }),
                    ...(pendingRefKey !== undefined && { referenceImageUrl: pendingRefKey }),
                    translations: {
                        en: englishData,
                        mr: marathiData.name ? marathiData : undefined,
                    },
                },
            });

            if (!response.success) {
                setError(response.error?.message || 'Failed to update scheme');
                return;
            }

            // Custom fields go through their own endpoint so that a general scheme
            // save can never wipe them. Only redirect once both calls succeed.
            const usableFields = customFields.filter((f) => f.id.trim() && f.label.trim());
            const fieldsResponse = await api.request(`/api/schemes/${schemeId}/custom-fields`, {
                method: 'PATCH',
                body: { customFields: usableFields.map(toPayload) },
            });

            if (!fieldsResponse.success) {
                setError(`Scheme saved, but the custom fields did not: ${fieldsResponse.error?.message || 'unknown error'}`);
                return;
            }

            setSuccess('Scheme updated successfully!');
            setTimeout(() => {
                router.push('/admin/schemes');
            }, 1500);
        } catch {
            setError('Failed to connect to server');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={formStyles.loading}>
                <div className="spinner" />
            </div>
        );
    }

    return (
        <>
            <header className={styles.pageHeader}>
                <div>
                    <Link href="/admin/schemes" className={formStyles.backLink}>
                        ← Back to Schemes
                    </Link>
                    <h1>Edit Scheme</h1>
                </div>
            </header>

            {error && (
                <div className={formStyles.error}>{error}</div>
            )}

            {success && (
                <div className={formStyles.success}>{success}</div>
            )}

            <form onSubmit={handleSubmit} className={formStyles.form}>
                {/* Language Tabs */}
                <div className={formStyles.tabs}>
                    <button
                        type="button"
                        className={`${formStyles.tab} ${activeTab === 'english' ? formStyles.activeTab : ''}`}
                        onClick={() => setActiveTab('english')}
                    >
                        English
                    </button>
                    <button
                        type="button"
                        className={`${formStyles.tab} ${activeTab === 'marathi' ? formStyles.activeTab : ''}`}
                        onClick={() => setActiveTab('marathi')}
                    >
                        मराठी (Marathi)
                    </button>
                </div>

                {/* English Tab Content */}
                {activeTab === 'english' && (
                    <>
                        {/* Basic Info */}
                        <section className={formStyles.section}>
                            <h2>Basic Information</h2>

                            <div className={formStyles.row}>
                                <div className="input-group">
                                    <label className="input-label">Scheme Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        className="input"
                                        value={englishData.name}
                                        onChange={handleEnglishChange}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Slug *</label>
                                    <input
                                        type="text"
                                        name="slug"
                                        className="input"
                                        value={formData.slug}
                                        onChange={handleInputChange}
                                        pattern="[a-z0-9-]+"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Description</label>
                                <textarea
                                    name="description"
                                    className={`input ${formStyles.textarea}`}
                                    value={englishData.description}
                                    onChange={handleEnglishChange}
                                    rows={3}
                                />
                            </div>

                            <div className={formStyles.row}>
                                <div className="input-group">
                                    <label className="input-label">Category *</label>
                                    <select
                                        name="category"
                                        className="input"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                    >
                                        <option value="STUDENT">Student</option>
                                        <option value="FARMER">Farmer</option>
                                        <option value="LOAN">Loan</option>
                                        <option value="CERTIFICATE">Important Certificates</option>
                                        <option value="JOBS">Jobs Application Assistance</option>
                                        <option value="HEALTH">Health Schemes</option>
                                        <option value="GOVT_CARD">Government Cards</option>
                                        <option value="LICENCE">Licences</option>
                                        <option value="TAX">Tax Section</option>
                                        <option value="OTHER">Other Services</option>

                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Scheme Type *</label>
                                    <select
                                        name="schemeType"
                                        className="input"
                                        value={formData.schemeType}
                                        onChange={handleInputChange}
                                    >
                                        <option value="GOVERNMENT">Government</option>
                                        <option value="PRIVATE">Private</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Service Fee (₹) *</label>
                                    <input
                                        type="number"
                                        name="serviceFee"
                                        className="input"
                                        value={formData.serviceFee}
                                        onChange={handleInputChange}
                                        min="0"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                 <div className="input-group">
                                    <label className="input-label">Avg. Completion Time (Days)</label>
                                    <input
                                        type="number"
                                        name="averageCompletionDays"
                                        className="input"
                                        value={formData.averageCompletionDays}
                                        onChange={handleInputChange}
                                        min="1"
                                        max="3650"
                                        placeholder="e.g. 30"
                                    />
                                  </div>
                                <div className="input-group">
                                    <label className="input-label">Display Order</label>
                                    <input
                                        type="number"
                                        name="displayOrder"
                                        className="input"
                                        value={formData.displayOrder}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="9999"
                                        placeholder="Leave blank for A-Z"
                                    />
                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                        Lower numbers appear first. Blank = sort alphabetically, after the numbered ones.
                                    </span>
                                  </div>
                                
                            </div>

                            <div className="input-group">
                                <label className="input-label">Status</label>
                                <select
                                    name="status"
                                    className="input"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        </section>

                        {/* Eligibility & Benefits */}
                        <section className={formStyles.section}>
                            <h2>Eligibility & Benefits</h2>

                            <div className="input-group">
                                <label className="input-label">Eligibility Criteria</label>
                                <textarea
                                    name="eligibility"
                                    className={`input ${formStyles.textarea}`}
                                    value={englishData.eligibility}
                                    onChange={handleEnglishChange}
                                    rows={4}
                                    placeholder="Enter eligibility criteria..."
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Benefits</label>
                                <textarea
                                    name="benefits"
                                    className={`input ${formStyles.textarea}`}
                                    value={englishData.benefits}
                                    onChange={handleEnglishChange}
                                    rows={4}
                                    placeholder="Enter scheme benefits..."
                                />
                            </div>
                        </section>

                        {/* Images Section */}
                        <section className={formStyles.section}>
                            <h2>Scheme Images (Optional)</h2>
                            <div className={formStyles.row}>
                                <div className="input-group">
                                    <label className="input-label">Scheme Logo</label>
                                    <div className={formStyles.imageUploadBox}>
                                        {logoPreview ? (
                                            <div className={formStyles.imagePreview}>
                                                <img src={logoPreview} alt="Logo preview" />
                                                {/* Removal is staged locally and applied on save, so
                                                    navigating away without saving loses nothing. */}
                                                <button type="button" className={formStyles.removeImageBtn} onClick={() => {
                                                    setLogoPreview(null);
                                                    setPendingLogoKey(null);
                                                }}>✕</button>
                                            </div>
                                        ) : null}
                                        {/* Always reachable, so replacing an image never requires
                                            removing the existing one first. */}
                                        <label className={formStyles.uploadLabel}>
                                            <span className="material-icons" style={{ fontSize: 32, color: 'var(--color-gray-400)' }}>add_photo_alternate</span>
                                            <span>{uploadingLogo ? 'Uploading...' : logoPreview ? 'Replace Logo' : 'Upload Logo'}</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                                hidden
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(file, 'logo');
                                                    e.target.value = '';
                                                }}
                                                disabled={uploadingLogo}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Reference / Sample Image</label>
                                    <div className={formStyles.imageUploadBox}>
                                        {refImagePreview ? (
                                            <div className={formStyles.imagePreview}>
                                                <img src={refImagePreview} alt="Reference preview" />
                                                {/* Removal is staged locally and applied on save, so
                                                    navigating away without saving loses nothing. */}
                                                <button type="button" className={formStyles.removeImageBtn} onClick={() => {
                                                    setRefImagePreview(null);
                                                    setPendingRefKey(null);
                                                }}>✕</button>
                                            </div>
                                        ) : null}
                                        {/* Always reachable, so replacing an image never requires
                                            removing the existing one first. */}
                                        <label className={formStyles.uploadLabel}>
                                            <span className="material-icons" style={{ fontSize: 32, color: 'var(--color-gray-400)' }}>add_photo_alternate</span>
                                            <span>{uploadingRef ? 'Uploading...' : refImagePreview ? 'Replace Reference Image' : 'Upload Reference Image'}</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                                hidden
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(file, 'reference');
                                                    e.target.value = '';
                                                }}
                                                disabled={uploadingRef}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                )}

                {/* Marathi Tab Content */}
                {activeTab === 'marathi' && (
                    <section className={formStyles.section}>
                        <h2>मराठी भाषांतर (Marathi Translation)</h2>

                        <div className="input-group">
                            <label className="input-label">योजनेचे नाव (Scheme Name)</label>
                            <input
                                type="text"
                                name="name"
                                className="input"
                                value={marathiData.name}
                                onChange={handleMarathiChange}
                                placeholder="योजनेचे नाव मराठीत लिहा..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">वर्णन (Description)</label>
                            <textarea
                                name="description"
                                className={`input ${formStyles.textarea}`}
                                value={marathiData.description}
                                onChange={handleMarathiChange}
                                rows={3}
                                placeholder="वर्णन मराठीत लिहा..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">पात्रता निकष (Eligibility Criteria)</label>
                            <textarea
                                name="eligibility"
                                className={`input ${formStyles.textarea}`}
                                value={marathiData.eligibility}
                                onChange={handleMarathiChange}
                                rows={4}
                                placeholder="पात्रता निकष मराठीत लिहा..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">फायदे (Benefits)</label>
                            <textarea
                                name="benefits"
                                className={`input ${formStyles.textarea}`}
                                value={marathiData.benefits}
                                onChange={handleMarathiChange}
                                rows={4}
                                placeholder="फायदे मराठीत लिहा..."
                            />
                        </div>
                    </section>
                )}

                {/* Required Documents */}
                <section className={formStyles.section}>
                    <div className={formStyles.sectionHeader}>
                        <h2>Required Documents</h2>
                        <button type="button" onClick={addDocument} className="btn btn-secondary">
                            + Add Document
                        </button>
                    </div>

                    <div className={formStyles.documentsList}>
                        {requiredDocs.length === 0 ? (
                            <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: 'var(--space-4)' }}>
                                No documents added. Click &quot;+ Add Document&quot; to add required documents.
                            </p>
                        ) : (
                            requiredDocs.map((doc, index) => (
                                <div key={index} className={formStyles.documentRow}>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Type (e.g., AADHAAR)"
                                        value={doc.type}
                                        onChange={(e) => updateDocument(index, 'type', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Label (e.g., Aadhaar Card)"
                                        value={doc.label}
                                        onChange={(e) => updateDocument(index, 'label', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Label in Marathi (मराठी)"
                                        value={doc.label_mr || ''}
                                        onChange={(e) => updateDocument(index, 'label_mr', e.target.value)}
                                    />

                                    <label className={formStyles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={doc.required}
                                            onChange={(e) => updateDocument(index, 'required', e.target.checked)}
                                        />
                                        Required
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => removeDocument(index)}
                                        className={formStyles.removeBtn}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Custom Form Fields — the extra details a user fills in when applying.
                    Authored here now that the developer portal is retired. */}
                <section className={formStyles.section}>
                    <div className={formStyles.sectionHeader}>
                        <h2>Custom Form Fields</h2>
                        <button type="button" onClick={addCustomField} className="btn btn-secondary btn-sm">
                            + Add Field
                        </button>
                    </div>
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 13, marginBottom: 'var(--space-3)' }}>
                        Extra details the applicant must provide for this scheme (e.g. College Name).
                        Changes go live immediately after saving.
                    </p>

                    <div className={formStyles.documentsList}>
                        {customFields.length === 0 ? (
                            <p style={{ color: 'var(--color-gray-500)', textAlign: 'center', padding: 'var(--space-4)' }}>
                                No custom fields. Add one if this scheme needs information beyond the standard profile.
                            </p>
                        ) : (
                            customFields.map((field, index) => (
                                <div
                                    key={index}
                                    className={formStyles.documentRow}
                                    style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}
                                >
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Field ID (e.g. college_name)"
                                            value={field.id}
                                            onChange={(e) => updateCustomField(index, 'id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        />
                                        <select
                                            className="input"
                                            value={field.type}
                                            onChange={(e) => updateCustomField(index, 'type', e.target.value)}
                                        >
                                            {FIELD_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Label (English)"
                                            value={field.label}
                                            onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Label (Marathi)"
                                            value={field.label_mr}
                                            onChange={(e) => updateCustomField(index, 'label_mr', e.target.value)}
                                        />
                                    </div>

                                    {/* Answers on existing orders are stored against the field id,
                                        and both order pages resolve labels by it. Renaming one
                                        orphans that history with no way to repair it afterwards. */}
                                    {originalFieldIds.length > 0 && index < originalFieldIds.length
                                        && field.id !== originalFieldIds[index] && (
                                        <span style={{ fontSize: 12, color: '#dc2626' }}>
                                            Renaming &quot;{originalFieldIds[index]}&quot; orphans answers already saved on past orders.
                                        </span>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                        <label className={formStyles.checkboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateCustomField(index, 'required', e.target.checked)}
                                            />
                                            Required
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowAdvanced((prev) => ({ ...prev, [index]: !prev[index] }))}
                                            style={{ background: 'none', border: 'none', color: '#475569', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            {showAdvanced[index] ? 'Hide advanced' : 'Advanced'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeCustomField(index)}
                                            className={formStyles.removeBtn}
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    {showAdvanced[index] && (
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Placeholder (English)"
                                                value={field.placeholder}
                                                onChange={(e) => updateCustomField(index, 'placeholder', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Placeholder (Marathi)"
                                                value={field.placeholder_mr}
                                                onChange={(e) => updateCustomField(index, 'placeholder_mr', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Validation regex (optional)"
                                                value={field.validationRegex}
                                                onChange={(e) => updateCustomField(index, 'validationRegex', e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {field.type === 'select' && (
                                        <div className={formStyles.optionsBuilder}>
                                            <div className={formStyles.optionsBuilderLabel}>Dropdown Options</div>
                                            <div className={formStyles.optionChips}>
                                                {field.options.length === 0 ? (
                                                    <span className={formStyles.optionsEmpty}>No options added yet</span>
                                                ) : (
                                                    field.options.map((opt) => (
                                                        <span key={opt.value} className={formStyles.optionChip}>
                                                            {opt.label}
                                                            <button
                                                                type="button"
                                                                className={formStyles.optionChipRemove}
                                                                onClick={() => removeOption(index, opt.value)}
                                                            >
                                                                &times;
                                                            </button>
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                            <div className={formStyles.optionInputRow}>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="Type an option and press Enter"
                                                    value={newOptionInputs[index] || ''}
                                                    onChange={(e) => setNewOptionInputs((prev) => ({ ...prev, [index]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addOption(index);
                                                        }
                                                    }}
                                                />
                                                <button type="button" className={formStyles.addOptionBtn} onClick={() => addOption(index)}>
                                                    + Add
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Submit */}
                <div className={formStyles.submitRow}>
                    <Link href="/admin/schemes" className="btn btn-secondary">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={isSaving}
                    >
                        {isSaving ? <span className="spinner" /> : 'Update Scheme'}
                    </button>
                </div>
            </form>
        </>
    );
}
