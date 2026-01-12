'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { User, UserRole } from '@/lib/types';
import { ArrowLeft, Save } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useUIStore } from '@/lib/store/uiStore';

export default function UserEditPage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useUIStore();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchUser();
        }
    }, [params.id]);

    const fetchUser = async () => {
        try {
            setLoading(true);
            const response = await api.getUser(params.id as string);

            if (response.success && response.data) {
                setUser(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch user:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        try {
            setSaving(true);
            await api.updateUser(user.id, {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status,
            });

            addToast({
                type: 'success',
                title: 'User Updated',
                message: 'User information has been updated successfully',
            });

            router.back();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Update Failed',
                message: error.message,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">User not found</p>
                <Button onClick={() => router.back()} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit User</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Update user information and settings
                        </p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Information</CardTitle>
                            <CardDescription>Basic user details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={user.firstName}
                                        onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input
                                        id="lastName"
                                        value={user.lastName}
                                        onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={user.username}
                                    disabled
                                    className="bg-gray-100"
                                />
                                <p className="text-sm text-gray-500 mt-1">Username cannot be changed</p>
                            </div>

                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={user.email}
                                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="role">Role</Label>
                                    <Select
                                        value={user.role}
                                        onValueChange={(value) => setUser({ ...user, role: value as UserRole })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USER">User</SelectItem>
                                            <SelectItem value="TEAM_ADMIN">Team Admin</SelectItem>
                                            <SelectItem value="ORG_ADMIN">Org Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={user.status}
                                        onValueChange={(value) => setUser({ ...user, status: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">User ID</p>
                                <p className="font-medium">{user.id}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Created At</p>
                                <p className="font-medium">{formatDate(user.createdAt, 'long')}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Last Login</p>
                                <p className="font-medium">
                                    {user.lastLoginAt ? formatDate(user.lastLoginAt, 'long') : 'Never'}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500">Organization</p>
                                <p className="font-medium">{user.organizationId}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Team</p>
                                <p className="font-medium">{user.teamId || 'Not assigned'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Danger Zone</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Button variant="destructive" className="w-full">
                                Delete User
                            </Button>
                            <p className="text-xs text-gray-500 mt-2">
                                This action cannot be undone
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
