'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { PersonalAnalytics } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { formatNumber } from '@/lib/utils';

export default function UserAnalyticsPage() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await api.getPersonalAnalytics(user?.id!);

            if (response.success && response.data) {
                setAnalytics(response.data);
            }
        } catch (error: any) {
            console.error('Failed to fetch analytics:', error);
            // Set default analytics if endpoint doesn't exist
            if (error.response?.status === 404) {
                setAnalytics({
                    userId: user?.id || '',
                    queriesLast30Days: 0,
                    avgResponseTime: 0,
                    contributionScore: 0,
                    recentActivity: [],
                    totalQueries: 0,
                    resolvedQueries: 0,
                    averageResolutionTime: 0,
                    mostAccessedArticles: [],
                    frequentlyAskedQuestions: []
                } as any);
            }
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Analytics</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Track your personal usage and performance
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Queries</CardTitle>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(analytics?.totalQueries || 0)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Resolved</CardTitle>
                        <CheckCircle className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(analytics?.resolvedQueries || 0)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg Resolution Time</CardTitle>
                        <Clock className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.averageResolutionTime?.toFixed(1) || '0.0'}s</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Articles Viewed</CardTitle>
                        <BookOpen className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics?.mostAccessedArticles?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Most Accessed Articles */}
            <Card>
                <CardHeader>
                    <CardTitle>Most Accessed Articles</CardTitle>
                    <CardDescription>Your frequently viewed knowledge base articles</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analytics?.mostAccessedArticles?.map((article, index) => (
                            <div key={article.articleId} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{article.title}</p>
                                        <p className="text-sm text-gray-500">{article.viewCount} views</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-green-600">{article.effectiveness}% helpful</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Frequently Asked Questions */}
            <Card>
                <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Your common queries</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {analytics?.frequentlyAskedQuestions?.map((question, index) => (
                            <li key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-sm text-gray-900 dark:text-white">{question}</p>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
