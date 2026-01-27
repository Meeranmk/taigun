'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api-client';
import { User } from '@/lib/types';
import { Search, UserPlus } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/lib/store/uiStore';

export default function TeamAdminUsersPage() {
    const { user } = useAuth();
    const { addToast } = useUIStore();
    const [users, setUsers] = useState<User[]>([]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [addingMember, setAddingMember] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (isAddMemberDialogOpen) {
            fetchAvailableUsers();
        }
    }, [isAddMemberDialogOpen]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.getUsers({ teamId: user?.teamId });
            setUsers(response.items || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableUsers = async () => {
        try {
            const response = await api.getUsers({ organizationId: user?.organizationId });
            const allOrgUsers = response.items || [];
            const available = allOrgUsers.filter(u => u.teamId !== user?.teamId);
            setAvailableUsers(available);
        } catch (error) {
            console.error('Failed to fetch available users:', error);
            addToast({
                type: 'error',
                title: 'Failed to Load Users',
                message: 'Unable to fetch available users',
            });
        }
    };

    const handleAddMember = async () => {
        if (!selectedUserId) {
            addToast({
                type: 'error',
                title: 'Validation Error',
                message: 'Please select a user to add',
            });
            return;
        }

        try {
            setAddingMember(true);
            await api.updateUser(selectedUserId, { teamId: user?.teamId });

            addToast({
                type: 'success',
                title: 'Member Added',
                message: 'User has been added to your team successfully',
            });

            setIsAddMemberDialogOpen(false);
            setSelectedUserId('');
            fetchUsers();
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Failed to Add Member',
                message: error.response?.data?.detail || error.message || 'An error occurred',
            });
        } finally {
            setAddingMember(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Members</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Manage members in your team
                    </p>
                </div>
                <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Team Member</DialogTitle>
                            <DialogDescription>
                                Add an existing user from your organization to your team
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="user">Select User *</Label>
                                {availableUsers.length === 0 ? (
                                    <div className="p-3 border rounded-md bg-gray-50 text-gray-500 text-sm">
                                        No available users. All users in your organization are already in your team.
                                    </div>
                                ) : (
                                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a user to add" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableUsers.map((u) => (
                                                <SelectItem key={u.id} value={u.id}>
                                                    {u.firstName} {u.lastName} ({u.email})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <p className="text-sm text-gray-500 mt-2">
                                    Only users from your organization who are not already in your team are shown.
                                </p>
                            </div>
                            <Button
                                onClick={handleAddMember}
                                className="w-full"
                                disabled={addingMember || !selectedUserId}
                            >
                                {addingMember ? 'Adding...' : 'Add to Team'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Members ({users.length})</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search members..."
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
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Login</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                                            No members found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{u.firstName} {u.lastName}</div>
                                                    <div className="text-sm text-gray-500">{u.username}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${u.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    {u.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</TableCell>
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
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
