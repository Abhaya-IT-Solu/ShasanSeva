import type { ApiResponse } from '@shasansetu/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        // Load token from localStorage on client
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('auth_token');
        }
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('auth_token', token);
            } else {
                localStorage.removeItem('auth_token');
            }
        }
    }

    getToken() {
        return this.token;
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const { method = 'GET', body, headers = {} } = options;

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        if (this.token) {
            requestHeaders['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' },
                };
            }

            return data;
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to connect to server',
                },
            };
        }
    }

    // Auth endpoints
    async register(phone: string, password: string, name?: string) {
        return this.request<{
            success: boolean;
            token: string;
            user: unknown;
            userType: 'USER' | 'ADMIN';
        }>('/api/auth/register', {
            method: 'POST',
            body: { phone, password, name },
        });
    }

    async login(phone: string, password: string) {
        return this.request<{
            success: boolean;
            token: string;
            user: unknown;
            userType: 'USER' | 'ADMIN';
        }>('/api/auth/login', {
            method: 'POST',
            body: { phone, password },
        });
    }

    async changePassword(currentPassword: string, newPassword: string) {
        return this.request('/api/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword },
        });
    }

    async logout() {
        const result = await this.request('/api/auth/logout', { method: 'POST' });
        this.setToken(null);
        return result;
    }

    async getMe() {
        return this.request('/api/auth/me');
    }

    // User endpoints
    async getProfile() {
        return this.request('/api/users/profile');
    }

    async updateProfile(data: {
        name?: string;
        email?: string;
        phone?: string;
        category?: string;
        address?: {
            line1?: string;
            line2?: string;
            city?: string;
            state?: string;
            pincode?: string;
        };
    }) {
        return this.request('/api/users/profile', {
            method: 'PATCH',
            body: data,
        });
    }
}

export const api = new ApiClient(API_URL);
