'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Analytics } from '@/lib/types';

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const data = await api.getAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Analytics Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Knowledge base usage and performance metrics</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Entries */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Entries</p>
                            <p className="text-3xl font-bold mt-2">{analytics?.totalEntries || 0}</p>
                        </div>
                        <div className="text-4xl opacity-50">📚</div>
                    </div>
                </div>

                {/* Categories */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm font-medium">Categories</p>
                            <p className="text-3xl font-bold mt-2">{Object.keys(analytics?.byCategory || {}).length}</p>
                        </div>
                        <div className="text-4xl opacity-50">🏷️</div>
                    </div>
                </div>

                {/* High Priority */}
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm font-medium">High Priority</p>
                            <p className="text-3xl font-bold mt-2">{analytics?.byPriority?.high || 0}</p>
                        </div>
                        <div className="text-4xl opacity-50">🔴</div>
                    </div>
                </div>

                {/* Most Used */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Total Usage</p>
                            <p className="text-3xl font-bold mt-2">
                                {analytics?.mostUsed.reduce((sum, entry) => sum + entry.usageCount, 0) || 0}
                            </p>
                        </div>
                        <div className="text-4xl opacity-50">📈</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Used Entries */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Most Used Entries</h2>
                    <div className="space-y-3">
                        {analytics?.mostUsed.slice(0, 5).map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.problem.substring(0, 50)}...</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{entry.category}</p>
                                </div>
                                <span className="ml-4 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-sm font-medium rounded-full">
                                    {entry.usageCount} uses
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Category */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">By Category</h2>
                    <div className="space-y-3">
                        {Object.entries(analytics?.byCategory || {}).map(([category, count]) => (
                            <div key={category} className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{category}</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full"
                                            style={{ width: `${(count / (analytics?.totalEntries || 1)) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8 text-right">{count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
