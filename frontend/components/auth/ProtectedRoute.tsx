'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { UserRole } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    allowedRoles,
    redirectTo = '/login',
}: ProtectedRouteProps) {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAuthStore();

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push(redirectTo);
                return;
            }

            if (allowedRoles && user && !allowedRoles.includes(user.role)) {
                // Redirect to appropriate dashboard based on role
                switch (user.role) {
                    case 'platform_owner':
                        router.push('/super-admin');
                        break;
                    case 'org_admin':
                        router.push('/org-admin');
                        break;
                    case 'team_admin':
                        router.push('/team-admin');
                        break;
                    case 'user':
                        router.push('/user');
                        break;
                    default:
                        router.push('/login');
                }
            }
        }
    }, [isLoading, isAuthenticated, user, allowedRoles, router, redirectTo]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="space-y-4 w-full max-w-md">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
}
