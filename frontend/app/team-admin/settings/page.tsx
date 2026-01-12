'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/lib/store/uiStore';

export default function TeamAdminSettingsPage() {
    const { user } = useAuth();
    const { addToast } = useUIStore();

    const handleSave = () => {
        addToast({
            type: 'success',
            title: 'Settings Saved',
            message: 'Team settings updated successfully',
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Settings</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Configure team-specific settings and preferences
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Team Information</CardTitle>
                        <CardDescription>Basic team details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="teamName">Team Name</Label>
                            <Input
                                id="teamName"
                                defaultValue="Engineering Team"
                            />
                        </div>
                        <div>
                            <Label htmlFor="teamDescription">Description</Label>
                            <Textarea
                                id="teamDescription"
                                defaultValue="Main engineering team"
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>AI Agent Configuration</CardTitle>
                        <CardDescription>Customize AI behavior for your team</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="responseStyle">Response Style</Label>
                            <select
                                id="responseStyle"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="detailed">Detailed</option>
                                <option value="concise">Concise</option>
                                <option value="technical">Technical</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="maxResponseLength">Max Response Length</Label>
                            <Input
                                id="maxResponseLength"
                                type="number"
                                defaultValue="500"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Notification Preferences</CardTitle>
                        <CardDescription>Configure team notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>New Article Notifications</Label>
                                <p className="text-sm text-gray-500">Notify when new articles are published</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Weekly Reports</Label>
                                <p className="text-sm text-gray-500">Receive weekly analytics reports</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Knowledge Base Settings</CardTitle>
                        <CardDescription>Configure knowledge base preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Auto-publish Articles</Label>
                                <p className="text-sm text-gray-500">Automatically publish approved articles</p>
                            </div>
                            <input type="checkbox" className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Require Approval</Label>
                                <p className="text-sm text-gray-500">Articles need admin approval</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} size="lg">
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
