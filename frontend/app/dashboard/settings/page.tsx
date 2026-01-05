'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        serviceNowUrl: '',
        serviceNowUsername: '',
        serviceNowPassword: '',
        openaiApiKey: '',
        googleApiKey: '',
        ticketCheckInterval: 30000,
        enableTicketMonitor: true,
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings');
            const data = await response.json();
            if (data) {
                setSettings({
                    serviceNowUrl: data.serviceNowUrl || '',
                    serviceNowUsername: data.serviceNowUsername || '',
                    serviceNowPassword: '', // Don't show password
                    openaiApiKey: '', // Don't show API key
                    googleApiKey: '', // Don't show API key
                    ticketCheckInterval: data.ticketCheckInterval || 30000,
                    enableTicketMonitor: data.enableTicketMonitor !== false,
                });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
                credentials: 'include',
            });

            if (response.ok) {
                setMessage('Settings saved successfully! Please restart the backend server for changes to take effect.');
            } else {
                const error = await response.json();
                setMessage(`Failed to save settings: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            setMessage('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
                <p className="text-gray-600 dark:text-gray-400">Configure ServiceNow connection, AI providers, and application settings</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <form onSubmit={handleSave} className="space-y-6">
                    {/* AI Provider Settings */}
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Provider Configuration</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    OpenAI API Key
                                </label>
                                <input
                                    type="password"
                                    value={settings.openaiApiKey}
                                    onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">OpenAI Platform</a>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Google AI API Key
                                </label>
                                <input
                                    type="password"
                                    value={settings.googleApiKey}
                                    onChange={(e) => setSettings({ ...settings, googleApiKey: e.target.value })}
                                    placeholder="AIza..."
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ServiceNow Settings */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">ServiceNow Configuration</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Instance URL
                                </label>
                                <input
                                    type="url"
                                    value={settings.serviceNowUrl}
                                    onChange={(e) => setSettings({ ...settings, serviceNowUrl: e.target.value })}
                                    placeholder="https://your-instance.service-now.com"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={settings.serviceNowUsername}
                                    onChange={(e) => setSettings({ ...settings, serviceNowUsername: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={settings.serviceNowPassword}
                                    onChange={(e) => setSettings({ ...settings, serviceNowPassword: e.target.value })}
                                    placeholder="Leave blank to keep current password"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Ticket Monitor Settings */}
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ticket Monitor</h2>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="enableMonitor"
                                    checked={settings.enableTicketMonitor}
                                    onChange={(e) => setSettings({ ...settings, enableTicketMonitor: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="enableMonitor" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    Enable automatic ticket monitoring
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Check Interval (ms)
                                </label>
                                <input
                                    type="number"
                                    value={settings.ticketCheckInterval}
                                    onChange={(e) => setSettings({ ...settings, ticketCheckInterval: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                            {message}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
                        >
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
