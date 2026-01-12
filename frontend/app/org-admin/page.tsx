'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { Team } from '@/lib/types';
import { Plus, Search, Users, Briefcase } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/lib/store/uiStore';

export default function OrgAdminTeamsPage() {
    const { user } = useAuth();
    const { addToast } = useUIStore();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchTeams();
    }, []);

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const response = await api.getTeams(user?.organizationId);
            setTeams(response.data);
        } catch (error) {
            console.error('Failed to fetch teams:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTeam = async () => {
        try {
            await api.createTeam({
                name: newTeam.name,
                description: newTeam.description,
                organizationId: user?.organizationId!,
                status: 'active',
            });

            addToast({
                type: 'success',
                title: 'Team Created',
                message: `${newTeam.name} has been created successfully`,
            });

            setIsCreateDialogOpen(false);
            setNewTeam({ name: '', description: '' });
            fetchTeams();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Failed to Create Team',
                message: error.message,
            });
        }
    };

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Manage teams within your organization
                    </p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Team
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Team</DialogTitle>
                            <DialogDescription>Add a new team to your organization</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="teamName">Team Name *</Label>
                                <Input
                                    id="teamName"
                                    value={newTeam.name}
                                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                    placeholder="Engineering Team"
                                />
                            </div>
                            <div>
                                <Label htmlFor="teamDescription">Description</Label>
                                <Input
                                    id="teamDescription"
                                    value={newTeam.description}
                                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                                    placeholder="Team description"
                                />
                            </div>
                            <Button onClick={handleCreateTeam} className="w-full">
                                Create Team
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Teams</CardTitle>
                        <Briefcase className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{teams.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Members</CardTitle>
                        <Users className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {teams.reduce((sum, team) => sum + team.memberCount, 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Teams</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search teams..."
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
                                    <TableHead>Team Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Members</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTeams.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            No teams found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTeams.map((team) => (
                                        <TableRow key={team.id}>
                                            <TableCell className="font-medium">{team.name}</TableCell>
                                            <TableCell className="text-gray-500">{team.description || '-'}</TableCell>
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
                                            <TableCell>
                                                <Button variant="ghost" size="sm">
                                                    Manage
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
