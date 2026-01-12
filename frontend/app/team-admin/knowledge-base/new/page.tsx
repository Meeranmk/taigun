'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/lib/store/uiStore';
import api from '@/lib/api-client';
import { ArrowLeft, Plus, X } from 'lucide-react';

export default function CreateArticlePage() {
    const router = useRouter();
    const { user } = useAuth();
    const { addToast } = useUIStore();

    const [article, setArticle] = useState({
        title: '',
        problem: '',
        solution: [''],
        category: '',
        tags: [] as string[],
        priority: 'medium',
        status: 'draft',
    });

    const [newTag, setNewTag] = useState('');

    const handleAddSolutionStep = () => {
        setArticle({ ...article, solution: [...article.solution, ''] });
    };

    const handleRemoveSolutionStep = (index: number) => {
        const newSolution = article.solution.filter((_, i) => i !== index);
        setArticle({ ...article, solution: newSolution });
    };

    const handleSolutionChange = (index: number, value: string) => {
        const newSolution = [...article.solution];
        newSolution[index] = value;
        setArticle({ ...article, solution: newSolution });
    };

    const handleAddTag = () => {
        if (newTag.trim() && !article.tags.includes(newTag.trim())) {
            setArticle({ ...article, tags: [...article.tags, newTag.trim()] });
            setNewTag('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setArticle({ ...article, tags: article.tags.filter(t => t !== tag) });
    };

    const handleSave = async (publish: boolean = false) => {
        try {
            const response = await api.createArticle({
                ...article,
                teamId: user?.teamId!,
                status: publish ? 'published' : 'draft',
                createdBy: user?.username!,
            });

            if (response.success) {
                addToast({
                    type: 'success',
                    title: publish ? 'Article Published' : 'Article Saved',
                    message: `Article has been ${publish ? 'published' : 'saved as draft'}`,
                });
                router.push('/team-admin');
            }
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
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Article</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Add a new knowledge base article
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleSave(false)}>
                        Save as Draft
                    </Button>
                    <Button onClick={() => handleSave(true)}>
                        Publish
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Article Content</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    value={article.title}
                                    onChange={(e) => setArticle({ ...article, title: e.target.value })}
                                    placeholder="Enter article title"
                                />
                            </div>

                            <div>
                                <Label htmlFor="problem">Problem Description</Label>
                                <Textarea
                                    id="problem"
                                    value={article.problem}
                                    onChange={(e) => setArticle({ ...article, problem: e.target.value })}
                                    placeholder="Describe the problem or issue"
                                    rows={4}
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Solution Steps</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddSolutionStep}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Step
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {article.solution.map((step, index) => (
                                        <div key={index} className="flex gap-2">
                                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                                                {index + 1}
                                            </div>
                                            <Textarea
                                                value={step}
                                                onChange={(e) => handleSolutionChange(index, e.target.value)}
                                                placeholder={`Step ${index + 1}`}
                                                rows={2}
                                                className="flex-1"
                                            />
                                            {article.solution.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveSolutionStep(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Article Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={article.category}
                                    onChange={(e) => setArticle({ ...article, category: e.target.value })}
                                    placeholder="e.g., Network, Hardware"
                                />
                            </div>

                            <div>
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={article.priority}
                                    onValueChange={(value) => setArticle({ ...article, priority: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Tags</Label>
                                <div className="flex gap-2 mb-2">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        placeholder="Add tag"
                                    />
                                    <Button type="button" onClick={handleAddTag} size="sm">
                                        Add
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {article.tags.map((tag) => (
                                        <Badge key={tag} variant="secondary" className="cursor-pointer">
                                            {tag}
                                            <X
                                                className="w-3 h-3 ml-1"
                                                onClick={() => handleRemoveTag(tag)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Title:</span>
                                    <p className="font-medium">{article.title || 'No title'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Category:</span>
                                    <p className="font-medium">{article.category || 'No category'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Priority:</span>
                                    <Badge variant={article.priority === 'high' ? 'destructive' : 'secondary'}>
                                        {article.priority}
                                    </Badge>
                                </div>
                                <div>
                                    <span className="text-gray-500">Solution Steps:</span>
                                    <p className="font-medium">{article.solution.filter(s => s.trim()).length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
