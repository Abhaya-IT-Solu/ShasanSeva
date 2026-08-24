import { z } from 'zod';
import type { CustomFormField } from '@shasansetu/types';

/**
 * Single definition of a scheme's custom form field, shared by the two write
 * paths (admin panel and developer portal) so their semantics cannot drift.
 *
 * Lives here rather than in `packages/types` because that package is deliberately
 * runtime-dependency-free — pulling zod in would make a types-only package a
 * runtime one for `apps/web` too, which consumes it via transpilePackages.
 */
export const customFieldSchema = z.object({
    id: z.string().min(1, 'Field ID is required').regex(/^[a-z0-9_]+$/, 'Field ID must be lowercase letters, numbers, or underscores'),
    type: z.enum(['text', 'number', 'date', 'select', 'textarea', 'email', 'phone']),
    label: z.string().min(1, 'Label is required'),
    label_mr: z.string().optional(),
    required: z.boolean(),
    placeholder: z.string().optional(),
    placeholder_mr: z.string().optional(),
    options: z.array(z.object({
        label: z.string(),
        label_mr: z.string().optional(),
        value: z.string(),
    })).optional(),
    validationRegex: z.string().optional(),
});

export const updateCustomFieldsSchema = z.object({
    customFields: z.array(customFieldSchema),
});

// Compile-time guard: if the zod shape and the shared TS type ever diverge, this
// fails the build rather than silently accepting a field the type cannot hold.
type _SchemaMatchesType = z.infer<typeof customFieldSchema> extends CustomFormField ? true : never;
const _assertSchemaMatchesType: _SchemaMatchesType = true;
void _assertSchemaMatchesType;

/**
 * Rules zod cannot express. Returns an error message, or null when the set is valid.
 *
 * The select-needs-options rule previously existed only in the portal's client-side
 * save handler, so the API accepted a dropdown the UI itself refused to create.
 */
export function validateCustomFieldSet(fields: CustomFormField[]): string | null {
    const ids = fields.map((f) => f.id);
    if (new Set(ids).size !== ids.length) {
        return 'Duplicate field IDs are not allowed';
    }

    const emptySelect = fields.find((f) => f.type === 'select' && !(f.options?.length));
    if (emptySelect) {
        return `Dropdown field "${emptySelect.label || emptySelect.id}" needs at least one option`;
    }

    return null;
}

/** Caps so application_form_data cannot be used as free-form storage. */
const MAX_FIELDS = 64;
const MAX_VALUE_LENGTH = 2000;

export interface FormDataValidationResult {
    /** Only keys matching a defined field, coerced to strings. */
    cleaned: Record<string, unknown>;
    /** Per-field messages, empty when valid. */
    errors: { field: string; message: string }[];
}

/**
 * Validate a user's submitted answers against the scheme's field definitions.
 *
 * Applied at payment time, where previously the payload was `z.record(z.any())` —
 * arbitrary JSON attached to a paid order, with `required` enforced only by a
 * client-side alert().
 *
 * Unknown keys are stripped rather than rejected: if an admin renames a field while
 * someone is mid-application, that user should not hit a hard failure at payment.
 */
export function validateFormDataAgainstFields(
    fields: CustomFormField[],
    submitted: Record<string, unknown> | undefined,
): FormDataValidationResult {
    const data = submitted || {};
    const errors: { field: string; message: string }[] = [];
    const cleaned: Record<string, unknown> = {};

    for (const field of fields.slice(0, MAX_FIELDS)) {
        const raw = data[field.id];
        const value = raw === undefined || raw === null ? '' : String(raw).trim();

        if (!value) {
            if (field.required) {
                errors.push({ field: field.id, message: `${field.label} is required` });
            }
            continue;
        }

        if (value.length > MAX_VALUE_LENGTH) {
            errors.push({ field: field.id, message: `${field.label} is too long` });
            continue;
        }

        if (field.type === 'select' && field.options?.length) {
            const allowed = field.options.map((o) => o.value);
            if (!allowed.includes(value)) {
                errors.push({ field: field.id, message: `${field.label} has an invalid selection` });
                continue;
            }
        }

        if (field.validationRegex) {
            // The pattern is admin-authored, so a malformed one must never take down
            // the payment endpoint — treat an uncompilable regex as "no constraint".
            try {
                if (!new RegExp(field.validationRegex).test(value)) {
                    errors.push({ field: field.id, message: `${field.label} is not in the expected format` });
                    continue;
                }
            } catch {
                // ignore an invalid pattern rather than failing the user's payment
            }
        }

        cleaned[field.id] = value;
    }

    return { cleaned, errors };
}
