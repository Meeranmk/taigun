'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { KnowledgeBaseArticle } from '@/lib/types';
import { ArrowLeft, Calendar, User, Eye, ThumbsUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import ArticleFeedback from '@/components/ArticleFeedback';

export default function ArticleDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [article, setArticle] = useState<KnowledgeBaseArticle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchArticle();
        }
    }, [params.id]);

    const fetchArticle = async () => {
        try {
            setLoading(true);
            const response = await api.getArticle(params.id as string);

            if (response.success && response.data) {
                setArticle(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch article:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (!article) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Article not found</p>
                <Button onClick={() => router.back()} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {article.title || article.problem}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(article.createdAt)}
                        </div>
                        <div className="flex items-center">
                            <Eye className="w-4 h-4 mr-1" />
                            {article.usageCount} views
                        </div>
                        <div className="flex items-center">
                            <ThumbsUp className="w-4 h-4 mr-1" />
                            {article.effectiveness}% helpful
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant={article.priority === 'high' ? 'destructive' : article.priority === 'medium' ? 'warning' : 'success'}>
                        {article.priority}
                    </Badge>
                    <Badge variant={article.status === 'published' ? 'success' : 'secondary'}>
                        {article.status}
                    </Badge>
                </div>
            </div>

            {/* Article Content */}
            <Card>
                <CardHeader>
                    <CardTitle>Problem Description</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {article.problem}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Solution</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {article.solution.map((step, index) => (
                            <div key={index} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-gray-700 dark:text-gray-300">{step}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Article Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Category</p>
                            <p className="font-medium">{article.category}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tags</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {article.tags.map((tag) => (
                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Created By</p>
                            <p className="font-medium">{article.createdBy}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-500">Total Views</p>
                            <p className="text-2xl font-bold">{article.usageCount}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Effectiveness</p>
                            <p className="text-2xl font-bold text-green-600">{article.effectiveness}%</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Last Updated</p>
                            <p className="font-medium">{formatDate(article.updatedAt)}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Related ServiceNow Article */}
            {article.serviceNowArticleId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Related ServiceNow Article</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500">Article ID: {article.serviceNowArticleId}</p>
                        <Button variant="outline" className="mt-2">
                            View in ServiceNow
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Article Feedback */}
            <ArticleFeedback />
        </div>
    );
}
