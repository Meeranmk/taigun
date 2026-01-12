'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/lib/store/uiStore';
import api from '@/lib/api-client';

export default function OrgAdminSettingsPage() {
    const { user } = useAuth();
    const { addToast } = useUIStore();
    const [settings, setSettings] = useState({
        serviceNowUrl: '',
        authMethod: 'oauth',
        defaultLanguage: 'English',
        dataRetention: '90 days',
        maxTeams: 10,
        maxUsersPerTeam: 50,
    });

    const handleSave = async () => {
        try {
            await api.updateOrganizationSettings(user?.organizationId!, settings);

            addToast({
                type: 'success',
                title: 'Settings Saved',
                message: 'Organization settings updated successfully',
            });
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Save Failed',
                message: error.message,
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Manage organization-wide settings and configurations
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>ServiceNow Integration</CardTitle>
                        <CardDescription>Configure ServiceNow connection settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="serviceNowUrl">ServiceNow Instance URL</Label>
                            <Input
                                id="serviceNowUrl"
                                value={settings.serviceNowUrl}
                                onChange={(e) => setSettings({ ...settings, serviceNowUrl: e.target.value })}
                                placeholder="https://your-instance.service-now.com"
                            />
                        </div>
                        <div>
                            <Label htmlFor="authMethod">Authentication Method</Label>
                            <select
                                id="authMethod"
                                value={settings.authMethod}
                                onChange={(e) => setSettings({ ...settings, authMethod: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="oauth">OAuth</option>
                                <option value="api_key">API Key</option>
                            </select>
                        </div>
                        <Button variant="outline">Test Connection</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>General Settings</CardTitle>
                        <CardDescription>Organization preferences</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="defaultLanguage">Default Language</Label>
                            <select
                                id="defaultLanguage"
                                value={settings.defaultLanguage}
                                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="English">English</option>
                                <option value="Spanish">Spanish</option>
                                <option value="French">French</option>
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="dataRetention">Data Retention Policy</Label>
                            <select
                                id="dataRetention"
                                value={settings.dataRetention}
                                onChange={(e) => setSettings({ ...settings, dataRetention: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="30 days">30 days</option>
                                <option value="90 days">90 days</option>
                                <option value="180 days">180 days</option>
                                <option value="1 year">1 year</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Usage Limits</CardTitle>
                        <CardDescription>Set limits for teams and users</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="maxTeams">Maximum Teams</Label>
                            <Input
                                id="maxTeams"
                                type="number"
                                value={settings.maxTeams}
                                onChange={(e) => setSettings({ ...settings, maxTeams: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="maxUsersPerTeam">Maximum Users per Team</Label>
                            <Input
                                id="maxUsersPerTeam"
                                type="number"
                                value={settings.maxUsersPerTeam}
                                onChange={(e) => setSettings({ ...settings, maxUsersPerTeam: parseInt(e.target.value) })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Security Settings</CardTitle>
                        <CardDescription>Configure security and compliance</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Require MFA</Label>
                                <p className="text-sm text-gray-500">Enforce multi-factor authentication</p>
                            </div>
                            <input type="checkbox" className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Password Expiry</Label>
                                <p className="text-sm text-gray-500">Passwords expire after 90 days</p>
                            </div>
                            <input type="checkbox" className="h-4 w-4" />
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
