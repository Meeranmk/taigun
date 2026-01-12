import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { UserRole } from '../types';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
    hasRole: (role: UserRole) => boolean;
    hasAnyRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: true,

            setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

            setLoading: (loading) => set({ isLoading: loading }),

            logout: () => set({ user: null, isAuthenticated: false }),

            hasRole: (role) => {
                const { user } = get();
                return user?.role === role;
            },

            hasAnyRole: (roles) => {
                const { user } = get();
                return user ? roles.includes(user.role) : false;
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
        }
    )
);
