// API Response Types

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
    message?: string;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface PaginationParams {
    page?: number;
    pageSize?: number;
}

// Auth Types
export interface AuthSession {
    userId: string;
    userType: 'USER' | 'ADMIN';
    role?: string; // ADMIN, SUPER_ADMIN for admin users
    phone: string;
    email?: string;
    name?: string;
    expiresAt: number;
}

export interface OtpSession {
    sessionId: string;
    phone: string;
    attempts: number;
    expiresAt: number;
    method: 'SMS' | 'WHATSAPP';
}

// Request Types
export interface SendOtpRequest {
    phone: string;
    method: 'SMS' | 'WHATSAPP';
}

export interface VerifyOtpRequest {
    phone: string;
    otp: string;
}

export interface GoogleAuthCallbackRequest {
    code: string;
    state?: string;
}

// Response Types
export interface SendOtpResponse {
    success: boolean;
    message: string;
    expiresIn: number; // seconds
}

export interface VerifyOtpResponse {
    success: boolean;
    token: string;
    user: UserProfile | AdminProfile;
    userType: 'USER' | 'ADMIN';
}

export interface UserProfile {
    id: string;
    phone: string;
    email?: string;
    name?: string;
    category?: string;
    profileComplete: boolean;
    address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        pincode?: string;
    };
    createdAt: string;
}

export interface AdminProfile {
    id: string;
    phone: string;
    email?: string;
    name: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
    isActive: boolean;
    createdAt: string;
}
