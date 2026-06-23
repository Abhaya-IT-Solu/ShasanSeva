'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';

interface PortalAuthContextType {
    username: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string, username: string) => void;
    logout: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
    const [username, setUsername] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Verify the stored token on mount
    useEffect(() => {
        const check = async () => {
            const token = api.getToken();
            if (token) {
                const res = await api.me();
                if (res.success && res.data) {
                    setUsername(res.data.username);
                } else {
                    api.setToken(null);
                }
            }
            setIsLoading(false);
        };
        check();
    }, []);

    const login = (token: string, name: string) => {
        api.setToken(token);
        setUsername(name);
    };

    const logout = () => {
        api.setToken(null);
        setUsername(null);
        router.push('/login');
    };

    return (
        <PortalAuthContext.Provider
            value={{
                username,
                isLoading,
                isAuthenticated: !!username,
                login,
                logout,
            }}
        >
            {children}
        </PortalAuthContext.Provider>
    );
}

export function usePortalAuth() {
    const context = useContext(PortalAuthContext);
    if (context === undefined) {
        throw new Error('usePortalAuth must be used within a PortalAuthProvider');
    }
    return context;
}
