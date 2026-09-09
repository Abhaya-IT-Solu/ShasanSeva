// Enquiry Types for API

export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'CLOSED';

/** What a visitor sends. `website` is a honeypot and must always be left empty. */
export interface EnquiryRequest {
    name: string;
    phone: string;
    email?: string;
    message: string;
    schemeId?: string;
    website?: string;
}

/** A row as the admin list returns it — scheme name resolved, sourceIp withheld. */
export interface EnquiryListItem {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    message: string;
    schemeId: string | null;
    schemeName: string | null;
    status: EnquiryStatus;
    adminNote: string | null;
    handledBy: string | null;
    handledByName: string | null;
    handledAt: string | null;
    createdAt: string;
}
