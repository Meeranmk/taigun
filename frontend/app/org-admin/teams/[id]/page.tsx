'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '@/lib/api-client';
import { Team, User } from '@/lib/types';
import { ArrowLeft, Users, Settings, Trash2 } from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import { useUIStore } from '@/lib/store/uiStore';

export default function TeamDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { addToast } = useUIStore();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchTeamDetails();
        }
    }, [params.id]);

    const fetchTeamDetails = async () => {
        try {
            setLoading(true);
            const [teamResponse, membersResponse] = await Promise.all([
                api.getTeam(params.id as string),
                api.getUsers({ teamId: params.id as string }),
            ]);

            if (teamResponse.success && teamResponse.data) {
                setTeam(teamResponse.data);
            }
            setMembers(membersResponse.data);
        } catch (error) {
            console.error('Failed to fetch team details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTeam = async () => {
        if (!confirm('Are you sure you want to delete this team?')) return;

        try {
            await api.deleteTeam(params.id as string);
            addToast({
                type: 'success',
                title: 'Team Deleted',
                message: 'Team has been deleted successfully',
            });
            router.push('/org-admin');
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Delete Failed',
                message: error.message,
            });
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
            </div>
        );
    }

    if (!team) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Team not found</p>
                <Button onClick={() => router.push('/org-admin')} className="mt-4">
                    Back to Teams
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/org-admin')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">{team.description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteTeam}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
                        <Users className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(team.memberCount)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span
                            className={`px-3 py-1 text-sm font-medium rounded-full ${team.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                        >
                            {team.status}
                        </span>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Created</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{formatDate(team.createdAt, 'short')}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Team Members */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>All members in this team</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                        No members found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{member.firstName} {member.lastName}</div>
                                                <div className="text-sm text-gray-500">{member.username}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                {member.role.replace('_', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${member.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {member.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>{formatDate(member.createdAt)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm">
                                                Remove
                                            </Button>
                                        </TableCell>
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
