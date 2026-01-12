'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { KnowledgeBaseArticle } from '@/lib/types';
import { Search, BookOpen, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-provider';

export default function UserKnowledgeBasePage() {
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
            const response = await api.getKnowledgeBase({
                teamId: user?.teamId,
                status: 'published'
            });
            setArticles(response.data);
        } catch (error) {
            console.error('Failed to fetch articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            fetchArticles();
            return;
        }

        try {
            setLoading(true);
            const response = await api.searchKnowledgeBase(searchQuery, user?.teamId);
            if (response.success && response.data) {
                setArticles(response.data);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const categories = [...new Set(articles.map(a => a.category))];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Search and browse articles to find solutions
                </p>
            </div>

            {/* Search Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                placeholder="Search for solutions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 h-12 text-lg"
                            />
                        </div>
                        <Button onClick={handleSearch} size="lg">
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Categories */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Browse by Category
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((category) => (
                        <Card
                            key={category}
                            className="cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => setSearchQuery(category)}
                        >
                            <CardContent className="pt-6 text-center">
                                <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                                <p className="font-medium text-gray-900 dark:text-white">{category}</p>
                                <p className="text-sm text-gray-500">
                                    {articles.filter(a => a.category === category).length} articles
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Articles */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {searchQuery ? 'Search Results' : 'Recent Articles'}
                </h2>
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <Skeleton key={i} className="h-32" />
                        ))}
                    </div>
                ) : articles.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">
                            No articles found
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {articles.map((article) => (
                            <Card
                                key={article.id}
                                className="cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => router.push(`/user/knowledge-base/${article.id}`)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <CardTitle className="text-lg">{article.title || article.problem}</CardTitle>
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
                                    </div>
                                    <CardDescription>{article.category}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between text-sm text-gray-500">
                                        <span>{article.usageCount} views</span>
                                        <div className="flex items-center">
                                            <Star className="w-4 h-4 text-yellow-500 mr-1" />
                                            <span>{article.effectiveness}%</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
