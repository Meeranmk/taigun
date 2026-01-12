'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api-client';
import { TeamAnalytics } from '@/lib/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, CheckCircle, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { formatNumber, formatPercentage } from '@/lib/utils';

export default function TeamAdminAnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('30');

    useEffect(() => {
        fetchAnalytics();
    }, [dateRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(dateRange));

            const response = await api.getTeamAnalytics(user?.teamId!, {
                start: startDate.toISOString(),
                end: endDate.toISOString(),
            });

            if (response.success && response.data) {
                setAnalytics(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    const userPerformanceData = analytics?.userPerformance.map(user => ({
        name: user.userName,
        queries: user.totalQueries,
        resolved: user.resolvedQueries,
    })) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Analytics</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Monitor team performance and user activity
                    </p>
                </div>
                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Interactions</CardTitle>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(analytics?.totalInteractions || 0)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
                        <Clock className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.averageResponseTime.toFixed(1)}s</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPercentage(analytics?.successRate || 0)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
                        <Users className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.userPerformance.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* User Performance Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>User Performance</CardTitle>
                    <CardDescription>Queries and resolutions by user</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={userPerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="queries" fill="#3B82F6" name="Total Queries" />
                            <Bar dataKey="resolved" fill="#10B981" name="Resolved" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* User Performance Details */}
            <Card>
                <CardHeader>
                    <CardTitle>User Performance Details</CardTitle>
                    <CardDescription>Detailed metrics for each team member</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics?.userPerformance.map((user) => (
                            <div key={user.userId} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg">{user.userName}</h3>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {formatNumber(user.totalQueries)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Resolved Queries</p>
                                        <p className="font-semibold">{user.resolvedQueries}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Avg Resolution Time</p>
                                        <p className="font-semibold">{user.averageResolutionTime.toFixed(1)}s</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Success Rate</p>
                                        <p className="font-semibold">
                                            {formatPercentage((user.resolvedQueries / user.totalQueries) * 100)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Most Used Articles */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Used Knowledge Base Articles</CardTitle>
                    <CardDescription>Top performing articles in your team</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analytics?.mostUsedArticles.map((article, index) => (
                            <div key={article.articleId} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{article.title}</p>
                                        <p className="text-sm text-gray-500">{article.usageCount} uses</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-green-600">{article.effectiveness}% effective</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
