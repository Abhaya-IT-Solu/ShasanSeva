// Scheme Types for API

export interface CustomFormField {
    id: string;               // e.g., 'college_name', 'marks_10th'
    type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'email' | 'phone';
    label: string;            // English label
    label_mr?: string;        // Marathi label
    required: boolean;
    placeholder?: string;
    placeholder_mr?: string;
    options?: { label: string; label_mr?: string; value: string }[]; // For type = 'select'
    validationRegex?: string; // Optional regex pattern
}

export interface SchemeListItem {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    schemeType?: string;
    serviceFee: string;
    status: string;
    customFields?: CustomFormField[];
}

export interface SchemeDetail {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    schemeType?: string;
    eligibility?: string;
    benefits?: string;
    requiredDocs: RequiredDocumentInfo[];
    customFields?: CustomFormField[];
    serviceFee: string;
    status: string;
}

export interface RequiredDocumentInfo {
    type: string;
    label: string;
    required: boolean;
    description?: string;
}

// Scheme Filter Types
export interface SchemeFilters {
    category?: string;
    schemeType?: string;
    status?: string;
    search?: string;
}
