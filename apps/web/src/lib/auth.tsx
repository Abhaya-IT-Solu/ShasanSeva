'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
    userId: string;
    userType: 'USER' | 'ADMIN';
    role?: string;
    phone: string;
    email?: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string, user: User) => void;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Check for existing session on mount
    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = api.getToken();
            if (storedToken) {
                try {
                    const response = await api.getMe();
                    if (response.success && response.data) {
                        setUser(response.data as User);
                        setToken(storedToken);
                    } else {
                        api.setToken(null);
                        setToken(null);
                    }
                } catch {
                    api.setToken(null);
                    setToken(null);
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, []);

    const login = (newToken: string, userData: User) => {
        api.setToken(newToken);
        setToken(newToken);
        setUser(userData);
    };

    const logout = async () => {
        await api.logout();
        setUser(null);
        setToken(null);
        router.push('/login');
    };

    const refreshUser = async () => {
        const response = await api.getMe();
        if (response.success && response.data) {
            setUser(response.data as User);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
