'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api-client';
import { Organization, Team } from '@/lib/types';
import { ArrowLeft, Building2, Users, Briefcase, Globe, Calendar } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';

export default function OrganizationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchOrganizationDetails();
        }
    }, [params.id]);

    const fetchOrganizationDetails = async () => {
        try {
            setLoading(true);
            const [orgResponse, teamsResponse] = await Promise.all([
                api.getOrganization(params.id as string),
                api.getTeams(params.id as string),
            ]);

            if (orgResponse.success && orgResponse.data) {
                setOrganization(orgResponse.data);
            }
            setTeams(teamsResponse.data);
        } catch (error) {
            console.error('Failed to fetch organization details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!organization) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Organization not found</p>
                <Button onClick={() => router.push('/super-admin')} className="mt-4">
                    Back to Organizations
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/super-admin')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {organization.name}
                        </h1>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">
                            {organization.email}
                        </p>
                    </div>
                </div>
                <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${organization.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : organization.status === 'suspended'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                >
                    {organization.status}
                </span>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Teams
                        </CardTitle>
                        <Briefcase className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(organization.totalTeams)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Users
                        </CardTitle>
                        <Users className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(organization.totalUsers)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Member Since
                        </CardTitle>
                        <Calendar className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatDate(organization.createdAt, 'short')}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Organization Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Organization Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Industry</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{organization.industry}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Organization Size</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{organization.size} employees</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Country</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{organization.country}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Timezone</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">{organization.timezone}</dd>
                        </div>
                        {organization.website && (
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Website</dt>
                                <dd className="mt-1 text-sm text-blue-600 hover:underline">
                                    <a href={organization.website} target="_blank" rel="noopener noreferrer">
                                        {organization.website}
                                    </a>
                                </dd>
                            </div>
                        )}
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Created At</dt>
                            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                                {formatDate(organization.createdAt, 'long')}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {/* Teams List */}
            <Card>
                <CardHeader>
                    <CardTitle>Teams</CardTitle>
                    <CardDescription>All teams within this organization</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Team Name</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teams.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                                        No teams found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                teams.map((team) => (
                                    <TableRow key={team.id}>
                                        <TableCell className="font-medium">{team.name}</TableCell>
                                        <TableCell>{team.memberCount}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${team.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {team.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>{formatDate(team.createdAt)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
