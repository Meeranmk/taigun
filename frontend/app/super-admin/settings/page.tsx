'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/lib/store/uiStore';

export default function SuperAdminSettingsPage() {
    const { user } = useAuth();
    const { addToast } = useUIStore();

    const handleSave = () => {
        addToast({
            type: 'success',
            title: 'Settings Saved',
            message: 'Platform settings updated successfully',
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Configure platform-wide settings and preferences
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>Platform configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="platformName">Platform Name</Label>
                            <Input
                                id="platformName"
                                defaultValue="ServiceNow AI Agent Platform"
                            />
                        </div>
                        <div>
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input
                                id="supportEmail"
                                type="email"
                                defaultValue="support@platform.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="maxOrganizations">Max Organizations</Label>
                            <Input
                                id="maxOrganizations"
                                type="number"
                                defaultValue="100"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Security Settings</CardTitle>
                        <CardDescription>Platform security configuration</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Require Email Verification</Label>
                                <p className="text-sm text-gray-500">New users must verify email</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Enable Audit Logging</Label>
                                <p className="text-sm text-gray-500">Log all platform activities</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div>
                            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                            <Input
                                id="sessionTimeout"
                                type="number"
                                defaultValue="30"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Email Configuration</CardTitle>
                        <CardDescription>SMTP settings for email notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                                id="smtpHost"
                                placeholder="smtp.example.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                                id="smtpPort"
                                type="number"
                                defaultValue="587"
                            />
                        </div>
                        <div>
                            <Label htmlFor="smtpUsername">SMTP Username</Label>
                            <Input
                                id="smtpUsername"
                                type="email"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Feature Flags</CardTitle>
                        <CardDescription>Enable or disable platform features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>AI Chat Feature</Label>
                                <p className="text-sm text-gray-500">Enable AI chat for users</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Analytics Dashboard</Label>
                                <p className="text-sm text-gray-500">Enable analytics features</p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Knowledge Base</Label>
                                <p className="text-sm text-gray-500">Enable knowledge base</p>
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
