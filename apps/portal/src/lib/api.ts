import type { ApiResponse, CustomFormField } from '@shasansetu/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const TOKEN_KEY = 'portal_token';

export interface PortalSchemeListItem {
    id: string;
    slug: string;
    name: string | null;
    category: string | null;
    status: string | null;
    fieldCount: number;
}

export interface PortalSchemeDetail {
    id: string;
    slug: string;
    name: string | null;
    category: string | null;
    status: string | null;
    customFields: CustomFormField[] | null;
}

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
}

class PortalApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem(TOKEN_KEY);
        }
    }

    setToken(token: string | null) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem(TOKEN_KEY, token);
            } else {
                localStorage.removeItem(TOKEN_KEY);
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
        } catch {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    }

    login(username: string, password: string) {
        return this.request<{ token: string; username: string }>('/api/portal/auth/login', {
            method: 'POST',
            body: { username, password },
        });
    }

    me() {
        return this.request<{ username: string }>('/api/portal/auth/me');
    }

    listSchemes() {
        return this.request<PortalSchemeListItem[]>('/api/portal/schemes');
    }

    getScheme(id: string) {
        return this.request<PortalSchemeDetail>(`/api/portal/schemes/${id}`);
    }

    updateCustomFields(id: string, customFields: CustomFormField[]) {
        return this.request<PortalSchemeDetail>(`/api/portal/schemes/${id}/custom-fields`, {
            method: 'PATCH',
            body: { customFields },
        });
    }
}

export const api = new PortalApiClient(API_URL);
