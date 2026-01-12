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

export default function OrgAdminAnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<TeamAnalytics[]>([]);
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

            const response = await api.getOrganizationAnalytics(user?.organizationId!, {
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
                <Skeleton className="h-96" />
            </div>
        );
    }

    const totalInteractions = analytics.reduce((sum, team) => sum + team.totalInteractions, 0);
    const avgResponseTime = analytics.reduce((sum, team) => sum + team.averageResponseTime, 0) / analytics.length || 0;
    const avgSuccessRate = analytics.reduce((sum, team) => sum + team.successRate, 0) / analytics.length || 0;

    const teamComparisonData = analytics.map(team => ({
        name: team.teamName,
        interactions: team.totalInteractions,
        successRate: team.successRate,
        responseTime: team.averageResponseTime,
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Team-wise performance metrics and insights
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
                        <div className="text-2xl font-bold">{formatNumber(totalInteractions)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg Response Time</CardTitle>
                        <Clock className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgResponseTime.toFixed(1)}s</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPercentage(avgSuccessRate)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Active Teams</CardTitle>
                        <Users className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Team Interactions</CardTitle>
                        <CardDescription>Total interactions by team</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={teamComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="interactions" fill="#3B82F6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Success Rate Comparison</CardTitle>
                        <CardDescription>Success rate across teams</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={teamComparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="successRate" fill="#10B981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Team Performance Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Team Performance Details</CardTitle>
                    <CardDescription>Detailed metrics for each team</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics.map((team) => (
                            <div key={team.teamId} className="p-4 border rounded-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg">{team.teamName}</h3>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {formatNumber(team.totalInteractions)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Avg Response Time</p>
                                        <p className="font-semibold">{team.averageResponseTime.toFixed(1)}s</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Success Rate</p>
                                        <p className="font-semibold">{formatPercentage(team.successRate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">User Engagement</p>
                                        <p className="font-semibold">{formatPercentage(team.userEngagement)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
