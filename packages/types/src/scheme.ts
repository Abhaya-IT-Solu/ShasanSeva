// Scheme Types for API

export interface SchemeListItem {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category?: string;
    schemeType?: string;
    serviceFee: string;
    status: string;
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
