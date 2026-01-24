'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import styles from './newScheme.module.css';

interface RequiredDoc {
    type: string;
    label: string;
    required: boolean;
    description: string;
}

export default function NewSchemePage() {
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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

    const [requiredDocs, setRequiredDocs] = useState<RequiredDoc[]>([
        { type: 'AADHAAR', label: 'Aadhaar Card', required: true, description: '' },
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
        setIsLoading(true);

        try {
            const response = await api.request('/api/schemes', {
                method: 'POST',
                body: {
                    ...formData,
                    requiredDocs: requiredDocs.filter(doc => doc.type && doc.label),
                },
            });

            if (response.success) {
                router.push('/admin/schemes');
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
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/admin/schemes" className={styles.backLink}>
                    ← Back to Schemes
                </Link>
                <h1>Add New Scheme</h1>
            </header>

            {error && (
                <div className={styles.error}>{error}</div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Basic Info */}
                <section className={styles.section}>
                    <h2>Basic Information</h2>

                    <div className={styles.row}>
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
                            className={`input ${styles.textarea}`}
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                        />
                    </div>

                    <div className={styles.row}>
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
                <section className={styles.section}>
                    <h2>Eligibility & Benefits</h2>

                    <div className="input-group">
                        <label className="input-label">Eligibility Criteria</label>
                        <textarea
                            name="eligibility"
                            className={`input ${styles.textarea}`}
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
                            className={`input ${styles.textarea}`}
                            value={formData.benefits}
                            onChange={handleInputChange}
                            rows={4}
                            placeholder="Enter scheme benefits..."
                        />
                    </div>
                </section>

                {/* Required Documents */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>Required Documents</h2>
                        <button type="button" onClick={addDocument} className="btn btn-secondary">
                            + Add Document
                        </button>
                    </div>

                    <div className={styles.documentsList}>
                        {requiredDocs.map((doc, index) => (
                            <div key={index} className={styles.documentRow}>
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
                                <label className={styles.checkboxLabel}>
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
                                    className={styles.removeBtn}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Submit */}
                <div className={styles.submitRow}>
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
        </div>
    );
}
