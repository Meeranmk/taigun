'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import {
    Building2,
    BarChart3,
    FileText,
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';
import { useUIStore } from '@/lib/store/uiStore';

const navigation = [
    { name: 'Organizations', href: '/super-admin', icon: Building2 },
    { name: 'Analytics', href: '/super-admin/analytics', icon: BarChart3 },
    { name: 'Audit Logs', href: '/super-admin/audit-logs', icon: FileText },
    { name: 'Settings', href: '/super-admin/settings', icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { sidebarOpen, toggleSidebar } = useUIStore();

    return (
        <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                {/* Sidebar */}
                <div
                    className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        } lg:translate-x-0`}
                >
                    <div className="flex flex-col h-full">
                        {/* Logo */}
                        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Super Admin
                            </h1>
                            <button
                                onClick={toggleSidebar}
                                className="lg:hidden text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => router.push(item.href)}
                                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Icon className="w-5 h-5 mr-3" />
                                        {item.name}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* User Info */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {user?.username}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Super Admin
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={logout}
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className={`transition-all duration-200 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-64'}`}>
                    {/* Top Bar */}
                    <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between h-16 px-6">
                            <button
                                onClick={toggleSidebar}
                                className="lg:hidden text-gray-500 hover:text-gray-700"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div className="flex-1" />
                        </div>
                    </div>

                    {/* Page Content */}
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
