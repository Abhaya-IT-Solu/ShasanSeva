'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import styles from '../../../admin.module.css';
import formStyles from '../../new/newScheme.module.css';

interface RequiredDoc {
    type: string;
    label: string;
    required: boolean;
    description: string;
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
        status: 'ACTIVE',
    });

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
                        status: scheme.status || 'ACTIVE',
                    });

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
            { type: '', label: '', required: true, description: '' },
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSaving(true);

        try {
            // Send data in the new translations format
            const response = await api.request(`/api/schemes/${schemeId}`, {
                method: 'PATCH',
                body: {
                    ...formData,
                    requiredDocs: requiredDocs.filter(doc => doc.type && doc.label),
                    translations: {
                        en: englishData,
                        mr: marathiData.name ? marathiData : undefined,
                    },
                },
            });

            if (response.success) {
                setSuccess('Scheme updated successfully!');
                setTimeout(() => {
                    router.push('/admin/schemes');
                }, 1500);
            } else {
                setError(response.error?.message || 'Failed to update scheme');
            }
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
                                        <option value="OTHER">Other Services</option>
                                        <option value="HEALTH">Health Schemes</option>
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
