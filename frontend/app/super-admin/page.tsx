'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { Organization } from '@/lib/types';
import { Search, Building2, Users, Briefcase, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate, formatNumber } from '@/lib/utils';

export default function SuperAdminDashboard() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({
        totalOrganizations: 0,
        totalTeams: 0,
        totalUsers: 0,
        activeOrganizations: 0,
    });

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            setLoading(true);
            const response = await api.getOrganizations({ page: 1, limit: 100 });
            setOrganizations(response.data);

            // Calculate stats
            const totalOrgs = response.total;
            const totalTeams = response.data.reduce((sum, org) => sum + org.totalTeams, 0);
            const totalUsers = response.data.reduce((sum, org) => sum + org.totalUsers, 0);
            const activeOrgs = response.data.filter(org => org.status === 'active').length;

            setStats({
                totalOrganizations: totalOrgs,
                totalTeams,
                totalUsers,
                activeOrganizations: activeOrgs,
            });
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrganizations = organizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'inactive':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            case 'suspended':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Platform Overview
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage and monitor all organizations across the platform
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Total Organizations
                        </CardTitle>
                        <Building2 className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{formatNumber(stats.totalOrganizations)}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Total Teams
                        </CardTitle>
                        <Briefcase className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{formatNumber(stats.totalTeams)}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Total Users
                        </CardTitle>
                        <Users className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{formatNumber(stats.totalUsers)}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Active Organizations
                        </CardTitle>
                        <Activity className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{formatNumber(stats.activeOrganizations)}</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Organizations Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Organizations</CardTitle>
                            <CardDescription>View and manage all registered organizations</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search organizations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization</TableHead>
                                    <TableHead>Industry</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Teams</TableHead>
                                    <TableHead>Users</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrganizations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                                            No organizations found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrganizations.map((org) => (
                                        <TableRow key={org.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {org.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{org.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{org.industry}</TableCell>
                                            <TableCell>{org.size}</TableCell>
                                            <TableCell>{org.totalTeams}</TableCell>
                                            <TableCell>{org.totalUsers}</TableCell>
                                            <TableCell>
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                                        org.status
                                                    )}`}
                                                >
                                                    {org.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{formatDate(org.createdAt)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/super-admin/organizations/${org.id}`)}
                                                >
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
