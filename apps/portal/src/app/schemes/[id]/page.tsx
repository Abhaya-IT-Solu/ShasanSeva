'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CustomFormField } from '@shasansetu/types';
import { api } from '@/lib/api';
import { usePortalAuth } from '@/lib/auth';
import PortalHeader from '@/components/PortalHeader';
import styles from './builder.module.css';

const FIELD_TYPES: { value: CustomFormField['type']; label: string }[] = [
    { value: 'text', label: 'Short Text' },
    { value: 'textarea', label: 'Long Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'select', label: 'Dropdown' },
];

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

export default function CustomFieldsBuilderPage() {
    const router = useRouter();
    const params = useParams();
    const schemeId = params.id as string;
    const { isAuthenticated, isLoading: authLoading } = usePortalAuth();

    const [schemeName, setSchemeName] = useState('');
    const [fields, setFields] = useState<EditableField[]>([]);
    const [newOptionInputs, setNewOptionInputs] = useState<Record<number, string>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!isAuthenticated || !schemeId) return;
        const load = async () => {
            setLoading(true);
            const res = await api.getScheme(schemeId);
            if (res.success && res.data) {
                setSchemeName(res.data.name || res.data.slug);
                setFields((res.data.customFields || []).map(toEditable));
            } else {
                setError(res.error?.message || 'Failed to load scheme');
            }
            setLoading(false);
        };
        load();
    }, [isAuthenticated, schemeId]);

    const addField = () => {
        setFields((prev) => [
            ...prev,
            {
                id: '',
                type: 'text',
                label: '',
                label_mr: '',
                required: true,
                placeholder: '',
                placeholder_mr: '',
                options: [],
                validationRegex: '',
            },
        ]);
    };

    const updateField = (index: number, key: keyof EditableField, value: unknown) => {
        setFields((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    const removeField = (index: number) => {
        setFields((prev) => prev.filter((_, i) => i !== index));
        setNewOptionInputs((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    };

    const addOption = (fieldIndex: number) => {
        const value = (newOptionInputs[fieldIndex] || '').trim();
        if (!value) return;
        setFields((prev) => {
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
        setFields((prev) => {
            const next = [...prev];
            next[fieldIndex] = {
                ...next[fieldIndex],
                options: next[fieldIndex].options.filter((o) => o.value !== optionValue),
            };
            return next;
        });
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');

        // Keep only complete fields
        const usable = fields.filter((f) => f.id.trim() && f.label.trim());

        // Validate IDs are unique
        const ids = usable.map((f) => f.id.trim());
        if (new Set(ids).size !== ids.length) {
            setError('Duplicate field IDs are not allowed.');
            return;
        }

        // Dropdowns must have at least one option
        const badSelect = usable.find((f) => f.type === 'select' && f.options.length === 0);
        if (badSelect) {
            setError(`Dropdown field "${badSelect.label || badSelect.id}" needs at least one option.`);
            return;
        }

        setSaving(true);
        const res = await api.updateCustomFields(schemeId, usable.map(toPayload));
        if (res.success) {
            setSuccess('Custom fields saved successfully. Returning to schemes list...');
            // Redirect back to schemes list after a brief moment so the user sees confirmation
            setTimeout(() => router.push('/'), 1200);
        } else {
            setError(res.error?.message || 'Failed to save custom fields');
        }
        setSaving(false);
    };

    if (authLoading || !isAuthenticated || loading) {
        return (
            <>
                <PortalHeader />
                <div className={styles.centered}>
                    <div className="spinner spinner-lg" />
                </div>
            </>
        );
    }

    return (
        <>
            <PortalHeader />
            <main className={styles.main}>
                <Link href="/" className={styles.backLink}>
                    &larr; Back to Schemes
                </Link>

                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.title}>Custom Form Fields</h1>
                        <p className={styles.subtitle}>{schemeName}</p>
                    </div>
                </div>

                <p className={styles.hint}>
                    Define the details users must fill in when applying for this scheme (e.g. College Name, Date of Birth).
                    Changes go live immediately after saving.
                </p>

                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

                {fields.length === 0 ? (
                    <div className={styles.empty}>
                        No custom fields yet. Use the &quot;+ Add Field&quot; button below.
                    </div>
                ) : (
                    <div className={styles.fieldList}>
                        {fields.map((field, index) => (
                            <div key={index} className={styles.fieldCard}>
                                <div className={styles.fieldGrid}>
                                    <div className="input-group">
                                        <label className="input-label">Field ID</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g. college_name"
                                            value={field.id}
                                            onChange={(e) =>
                                                updateField(index, 'id', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                                            }
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Type</label>
                                        <select
                                            className="input"
                                            value={field.type}
                                            onChange={(e) => updateField(index, 'type', e.target.value)}
                                        >
                                            {FIELD_TYPES.map((t) => (
                                                <option key={t.value} value={t.value}>
                                                    {t.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Label (English)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g. College Name"
                                            value={field.label}
                                            onChange={(e) => updateField(index, 'label', e.target.value)}
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label">Label (Marathi)</label>
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g. महाविद्यालयाचे नाव"
                                            value={field.label_mr}
                                            onChange={(e) => updateField(index, 'label_mr', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className={styles.fieldFooter}>
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            onChange={(e) => updateField(index, 'required', e.target.checked)}
                                        />
                                        Required
                                    </label>
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => removeField(index)}
                                    >
                                        Remove
                                    </button>
                                </div>

                                {field.type === 'select' && (
                                    <div className={styles.optionsBuilder}>
                                        <div className={styles.optionsLabel}>Dropdown Options</div>
                                        <div className={styles.optionChips}>
                                            {field.options.length === 0 ? (
                                                <span className={styles.optionsEmpty}>No options added yet</span>
                                            ) : (
                                                field.options.map((opt) => (
                                                    <span key={opt.value} className={styles.optionChip}>
                                                        {opt.label}
                                                        <button
                                                            type="button"
                                                            className={styles.optionChipRemove}
                                                            onClick={() => removeOption(index, opt.value)}
                                                            title={`Remove "${opt.label}"`}
                                                        >
                                                            &times;
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                        <div className={styles.optionInputRow}>
                                            <input
                                                type="text"
                                                className="input"
                                                placeholder="Type an option and press Enter"
                                                value={newOptionInputs[index] || ''}
                                                onChange={(e) =>
                                                    setNewOptionInputs((prev) => ({ ...prev, [index]: e.target.value }))
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addOption(index);
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => addOption(index)}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.saveBar}>
                    <button type="button" onClick={addField} className="btn btn-secondary">
                        + Add Field
                    </button>
                    <div className={styles.saveBarActions}>
                        <Link href="/" className="btn btn-secondary">
                            Cancel
                        </Link>
                        <button type="button" onClick={handleSave} className="btn btn-primary btn-lg" disabled={saving}>
                            {saving ? <span className="spinner" /> : 'Save Custom Fields'}
                        </button>
                    </div>
                </div>
            </main>
        </>
    );
}
