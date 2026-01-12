'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { KnowledgeBaseArticle } from '@/lib/types';
import { Plus, Search, BookOpen, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';

export default function TeamAdminKnowledgeBasePage() {
    const router = useRouter();
    const { user } = useAuth();
    const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            setLoading(true);
            const response = await api.getKnowledgeBase({ teamId: user?.teamId });
            setArticles(response.data);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredArticles = articles.filter(article =>
        article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.problem.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const publishedCount = articles.filter(a => a.status === 'published').length;
    const draftCount = articles.filter(a => a.status === 'draft').length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Manage your team's knowledge base articles
                    </p>
                </div>
                <Button onClick={() => router.push('/team-admin/knowledge-base/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Article
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Articles</CardTitle>
                        <BookOpen className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{articles.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Published</CardTitle>
                        <Eye className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{publishedCount}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Drafts</CardTitle>
                        <BookOpen className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{draftCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>All Articles</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search articles..."
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
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Views</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredArticles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                            No articles found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredArticles.map((article) => (
                                        <TableRow key={article.id}>
                                            <TableCell className="font-medium">{article.title || article.problem}</TableCell>
                                            <TableCell>{article.category}</TableCell>
                                            <TableCell>
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${article.priority === 'high'
                                                            ? 'bg-red-100 text-red-800'
                                                            : article.priority === 'medium'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-green-100 text-green-800'
                                                        }`}
                                                >
                                                    {article.priority}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={`px-2 py-1 text-xs font-medium rounded-full ${article.status === 'published'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    {article.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{article.usageCount}</TableCell>
                                            <TableCell>{formatDate(article.createdAt)}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm">
                                                    Edit
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
