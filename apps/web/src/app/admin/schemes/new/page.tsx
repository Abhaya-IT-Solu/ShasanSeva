'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
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
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
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
                setSuccess('Scheme created successfully!');
                setTimeout(() => {
                    router.push('/admin/schemes');
                }, 1500);
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
