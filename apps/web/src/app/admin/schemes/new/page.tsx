'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getSourceUrlWarning } from '@/lib/sourceUrl';
import type { CustomFormField } from '@shasansetu/types';
import styles from '../../admin.module.css';
import formStyles from './newScheme.module.css';

interface RequiredDoc {
    type: string;
    label: string;
    label_mr: string;
    required: boolean;
    description: string;
    description_mr: string;
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
 * controlled. Same shape the edit page uses.
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

export default function NewSchemePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('english');

    // English fields
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        category: 'STUDENT',
        schemeType: 'GOVERNMENT',
        eligibility: '',
        benefits: '',
        serviceFee: '',
        status: 'ACTIVE',
        averageCompletionDays: '',
        displayOrder: '',
        sourceUrl: '',
        logoUrl: '',
        referenceImageUrl: '',
    });

    // Advisory only — never blocks saving. See lib/sourceUrl.ts.
    const sourceUrlWarning = getSourceUrlWarning(formData.sourceUrl, formData.schemeType);

    // Image upload states — for new scheme, use URL input (upload after creation)
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [refImageFile, setRefImageFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [refImagePreview, setRefImagePreview] = useState<string | null>(null);

    // Marathi translations
    const [marathiData, setMarathiData] = useState({
        nameMr: '',
        descriptionMr: '',
        eligibilityMr: '',
        benefitsMr: '',
    });

    const [requiredDocs, setRequiredDocs] = useState<RequiredDoc[]>([
        { type: 'AADHAAR', label: 'Aadhaar Card', label_mr: 'आधार कार्ड', required: true, description: '', description_mr: '' },
    ]);

    // Custom form fields — the extra details an applicant fills in for this
    // scheme. Sent after creation, since POST /api/schemes deliberately does not
    // accept them (see createSchemeSchema).
    const [customFields, setCustomFields] = useState<EditableField[]>([]);
    const [newOptionInputs, setNewOptionInputs] = useState<Record<number, string>>({});
    const [showAdvanced, setShowAdvanced] = useState<Record<number, boolean>>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-generate slug from name
        if (name === 'name') {
            const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Mirror the server's validateCustomFieldSet so the admin gets the message
        // before the scheme is created. Incomplete rows are dropped rather than
        // flagged — same as the edit page.
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

        setIsLoading(true);

        try {
            // Send data with translations in the new nested format
            const response = await api.request('/api/schemes', {
                method: 'POST',
                body: {
                    slug: formData.slug,
                    category: formData.category,
                    schemeType: formData.schemeType,
                    serviceFee: formData.serviceFee,
                    status: formData.status,
                    requiredDocs: requiredDocs.filter(doc => doc.type && doc.label),
                    averageCompletionDays: formData.averageCompletionDays ? Number(formData.averageCompletionDays) : undefined,
                    displayOrder: formData.displayOrder ? Number(formData.displayOrder) : 0,
                    sourceUrl: formData.sourceUrl.trim() || null,
                    translations: {
                        en: {
                            name: formData.name,
                            description: formData.description,
                            eligibility: formData.eligibility,
                            benefits: formData.benefits,
                        },
                        mr: marathiData.nameMr ? {
                            name: marathiData.nameMr,
                            description: marathiData.descriptionMr,
                            eligibility: marathiData.eligibilityMr,
                            benefits: marathiData.benefitsMr,
                        } : undefined,
                    },
                },
            });

            if (response.success) {
                const createdScheme = response.data as any;
                const schemeId = createdScheme?.id;

                // Custom fields go through their own endpoint — POST /api/schemes
                // does not accept them, so they are attached to the new scheme here.
                let fieldsError = '';
                if (schemeId && usable.length > 0) {
                    try {
                        const fieldsResponse = await api.request(`/api/schemes/${schemeId}/custom-fields`, {
                            method: 'PATCH',
                            body: { customFields: usable.map(toPayload) },
                        });
                        if (!fieldsResponse.success) {
                            fieldsError = fieldsResponse.error?.message || 'unknown error';
                        }
                    } catch {
                        fieldsError = 'could not reach the server';
                    }
                }

                // Upload images if files were selected
                const failedUploads: string[] = [];
                if (schemeId && (logoFile || refImageFile)) {
                    const uploadImage = async (file: File, type: 'logo' | 'reference') => {
                        try {
                            // Convert file to base64
                            const fileData = await new Promise<string>((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                    const result = reader.result as string;
                                    resolve(result.split(',')[1]);
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                            });

                            // Upload via backend proxy (bypasses CORS)
                            const uploadResponse = await api.request(`/api/schemes/${schemeId}/upload-image`, {
                                method: 'POST',
                                body: { type, contentType: file.type, fileData },
                            });
                            // A non-success response was previously ignored, so a failed
                            // upload still reported "Scheme created successfully!"
                            if (!uploadResponse.success) failedUploads.push(type);
                        } catch (err) {
                            console.error(`Failed to upload ${type} image`, err);
                            failedUploads.push(type);
                        }
                    };
                    if (logoFile) await uploadImage(logoFile, 'logo');
                    if (refImageFile) await uploadImage(refImageFile, 'reference');
                }

                // The scheme itself was created — say so, but don't claim the images
                // or fields made it. Both can be redone from the edit page.
                const problems: string[] = [];
                if (fieldsError) problems.push(`the custom form fields did not save (${fieldsError})`);
                if (failedUploads.length > 0) problems.push(`the ${failedUploads.join(' and ')} image failed to upload`);

                if (problems.length > 0) {
                    setSuccess(`Scheme created, but ${problems.join(', and ')}. Fix it from the edit page.`);
                } else {
                    setSuccess('Scheme created successfully!');
                }
                setTimeout(() => {
                    router.push('/admin/schemes');
                }, problems.length > 0 ? 3000 : 1500);
            } else {
                setError(response.error?.message || 'Failed to create scheme');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <header className={styles.pageHeader}>
                <div>
                    <Link href="/admin/schemes" className={formStyles.backLink}>
                        ← Back to Schemes
                    </Link>
                    <h1>Add New Scheme</h1>
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
                                        value={formData.name}
                                        onChange={handleInputChange}
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
                                    value={formData.description}
                                    onChange={handleInputChange}
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
                                        <option value="CERTIFICATE">Certificates</option>
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
                                <label className="input-label">Official Government Source URL</label>
                                <input
                                    type="url"
                                    name="sourceUrl"
                                    className="input"
                                    value={formData.sourceUrl}
                                    onChange={handleInputChange}
                                    placeholder="https://mahadbt.maharashtra.gov.in/scheme/..."
                                    maxLength={500}
                                />
                                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                    The official page for <strong>this specific scheme</strong>, not a portal homepage.
                                    Shown to users as the source; left out entirely when blank.
                                </span>
                                {sourceUrlWarning && (
                                    <span style={{ fontSize: 12, color: '#b45309', marginTop: 4 }}>
                                        ⚠️ {sourceUrlWarning}
                                    </span>
                                )}
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
                                    value={formData.eligibility}
                                    onChange={handleInputChange}
                                    rows={4}
                                    placeholder="Enter eligibility criteria..."
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Benefits</label>
                                <textarea
                                    name="benefits"
                                    className={`input ${formStyles.textarea}`}
                                    value={formData.benefits}
                                    onChange={handleInputChange}
                                    rows={4}
                                    placeholder="Enter scheme benefits..."
                                />
                            </div>
                        </section>

                        {/* Images Section */}
                        <section className={formStyles.section}>
                            <h2>Scheme Images (Optional)</h2>
                            <p style={{ fontSize: 14, color: 'var(--color-gray-500)', marginBottom: 16 }}>
                                Images will be uploaded after the scheme is created.
                            </p>
                            <div className={formStyles.row}>
                                <div className="input-group">
                                    <label className="input-label">Scheme Logo</label>
                                    <div className={formStyles.imageUploadBox}>
                                        {logoPreview ? (
                                            <div className={formStyles.imagePreview}>
                                                <img src={logoPreview} alt="Logo preview" />
                                                <button type="button" className={formStyles.removeImageBtn} onClick={() => {
                                                    setLogoPreview(null);
                                                    setLogoFile(null);
                                                }}>✕</button>
                                            </div>
                                        ) : (
                                            <label className={formStyles.uploadLabel}>
                                                <span className="material-icons" style={{ fontSize: 32, color: 'var(--color-gray-400)' }}>add_photo_alternate</span>
                                                <span>Select Logo</span>
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                                    hidden
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setLogoFile(file);
                                                            setLogoPreview(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Reference / Sample Image</label>
                                    <div className={formStyles.imageUploadBox}>
                                        {refImagePreview ? (
                                            <div className={formStyles.imagePreview}>
                                                <img src={refImagePreview} alt="Reference preview" />
                                                <button type="button" className={formStyles.removeImageBtn} onClick={() => {
                                                    setRefImagePreview(null);
                                                    setRefImageFile(null);
                                                }}>✕</button>
                                            </div>
                                        ) : (
                                            <label className={formStyles.uploadLabel}>
                                                <span className="material-icons" style={{ fontSize: 32, color: 'var(--color-gray-400)' }}>add_photo_alternate</span>
                                                <span>Select Reference Image</span>
                                                <input
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                                                    hidden
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setRefImageFile(file);
                                                            setRefImagePreview(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
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
                                name="nameMr"
                                className="input"
                                value={marathiData.nameMr}
                                onChange={handleMarathiChange}
                                placeholder="योजनेचे नाव मराठीत लिहा..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">वर्णन (Description)</label>
                            <textarea
                                name="descriptionMr"
                                className={`input ${formStyles.textarea}`}
                                value={marathiData.descriptionMr}
                                onChange={handleMarathiChange}
                                rows={3}
                                placeholder="वर्णन मराठीत लिहा..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">पात्रता निकष (Eligibility Criteria)</label>
                            <textarea
                                name="eligibilityMr"
                                className={`input ${formStyles.textarea}`}
                                value={marathiData.eligibilityMr}
                                onChange={handleMarathiChange}
                                rows={4}
                                placeholder="पात्रता निकष मराठीत लिहा..."
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">फायदे (Benefits)</label>
                            <textarea
                                name="benefitsMr"
                                className={`input ${formStyles.textarea}`}
                                value={marathiData.benefitsMr}
                                onChange={handleMarathiChange}
                                rows={4}
                                placeholder="फायदे मराठीत लिहा..."
                            />
                        </div>
                    </section>
                )}

                {/* Required Documents (shown on both tabs) */}
                <section className={formStyles.section}>
                    <div className={formStyles.sectionHeader}>
                        <h2>Required Documents</h2>
                        <button type="button" onClick={addDocument} className="btn btn-secondary">
                            + Add Document
                        </button>
                    </div>

                    <div className={formStyles.documentsList}>
                        {requiredDocs.map((doc, index) => (
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
                        ))}
                    </div>
                </section>

                {/* Custom Form Fields (shown on both tabs) — the extra details a
                    user fills in when applying for this scheme. */}
                <section className={formStyles.section}>
                    <div className={formStyles.sectionHeader}>
                        <h2>Custom Form Fields</h2>
                        <button type="button" onClick={addCustomField} className="btn btn-secondary btn-sm">
                            + Add Field
                        </button>
                    </div>
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 13, marginBottom: 'var(--space-3)' }}>
                        Extra details the applicant must provide for this scheme (e.g. College Name).
                        These are saved once the scheme is created.
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
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="spinner" /> : 'Create Scheme'}
                    </button>
                </div>
            </form>
        </>
    );
}
