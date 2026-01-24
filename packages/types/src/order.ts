// Order Types for API

export interface OrderListItem {
    id: string;
    schemeName: string;
    schemeCategory?: string;
    status: string;
    paymentAmount: string;
    createdAt: string;
}

export interface OrderDetail {
    id: string;
    userId: string;
    scheme: {
        id: string;
        name: string;
        category?: string;
        schemeType?: string;
    };
    status: string;
    paymentId: string;
    paymentAmount: string;
    paymentTimestamp: string;
    documents: OrderDocument[];
    proofs: OrderProof[];
    adminNotes?: string;
    assignedTo?: string;
    createdAt: string;
    updatedAt: string;
}

export interface OrderDocument {
    id: string;
    docType: string;
    fileUrl: string;
    status: string;
    rejectionReason?: string;
    uploadedAt: string;
    verifiedAt?: string;
}

export interface OrderProof {
    id: string;
    fileUrl: string;
    proofType?: string;
    description?: string;
    uploadedAt: string;
}

// Order creation (before payment)
export interface CreateOrderRequest {
    schemeId: string;
    documents: UploadedDocument[];
    consentAccepted: boolean;
    termsVersion: string;
}

export interface UploadedDocument {
    docType: string;
    fileUrl: string;
    fileKey: string;
}

// Order status update (admin)
export interface UpdateOrderStatusRequest {
    status: string;
    adminNotes?: string;
}

// Document verification (admin)
export interface VerifyDocumentRequest {
    documentId: string;
    status: 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
    rejectionReason?: string;
}
