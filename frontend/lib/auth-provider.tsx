'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api-client';
import { useUIStore } from '@/lib/store/uiStore';
import type { LoginCredentials, User } from '@/lib/types';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, setUser, setLoading, logout: storeLogout } = useAuthStore();
    const { addToast } = useUIStore();

    const checkAuth = async () => {
        try {
            setLoading(true);
            const response = await api.getAuthStatus();
            if (response.isAuthenticated && response.user) {
                setUser(response.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials: LoginCredentials) => {
        try {
            const response = await api.login(credentials);

            if (response.success && response.user) {
                setUser(response.user as User);

                addToast({
                    type: 'success',
                    title: 'Login Successful',
                    message: `Welcome back, ${response.user.username}!`,
                });

                // Redirect based on role
                switch (response.user.role) {
                    case 'SUPER_ADMIN':
                        router.push('/super-admin');
                        break;
                    case 'ORG_ADMIN':
                        router.push('/org-admin');
                        break;
                    case 'TEAM_ADMIN':
                        router.push('/team-admin');
                        break;
                    case 'USER':
                        router.push('/user');
                        break;
                    default:
                        router.push('/dashboard');
                }
            }
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Login Failed',
                message: error.message || 'Invalid credentials',
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            await api.logout();
            storeLogout();
            addToast({
                type: 'info',
                title: 'Logged Out',
                message: 'You have been successfully logged out',
            });
            router.push('/login');
        } catch (error) {
            // Still logout locally even if API call fails
            storeLogout();
            router.push('/login');
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                isLoading,
                login,
                logout,
                checkAuth,
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
