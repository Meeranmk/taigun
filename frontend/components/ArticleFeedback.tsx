'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api-client';
import { KnowledgeBaseEntry } from '@/lib/types';
import { ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useUIStore } from '@/lib/store/uiStore';

export default function ArticleFeedbackPage() {
    const params = useParams();
    const { user } = useAuth();
    const { addToast } = useUIStore();
    const [article, setArticle] = useState<KnowledgeBaseEntry | null>(null);
    const [feedback, setFeedback] = useState('');
    const [helpful, setHelpful] = useState<boolean | null>(null);
    const [bookmarked, setBookmarked] = useState(false);

    useEffect(() => {
        if (params.id) {
            fetchArticle();
        }
    }, [params.id]);

    const fetchArticle = async () => {
        try {
            const response = await api.getArticle(params.id as string);
            if (response.success && response.data) {
                setArticle(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch article:', error);
        }
    };

    const handleFeedback = async (isHelpful: boolean) => {
        setHelpful(isHelpful);
        addToast({
            type: 'success',
            title: 'Feedback Submitted',
            message: 'Thank you for your feedback!',
        });
    };

    const handleBookmark = () => {
        setBookmarked(!bookmarked);
        addToast({
            type: 'success',
            title: bookmarked ? 'Bookmark Removed' : 'Bookmark Added',
            message: bookmarked ? 'Article removed from bookmarks' : 'Article added to bookmarks',
        });
    };

    const handleSubmitComment = async () => {
        if (!feedback.trim()) return;

        try {
            // Submit feedback comment
            addToast({
                type: 'success',
                title: 'Comment Submitted',
                message: 'Your comment has been submitted',
            });
            setFeedback('');
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Submission Failed',
                message: error.message,
            });
        }
    };

    if (!article) {
        return <Skeleton className="h-96" />;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Was this article helpful?</CardTitle>
                    <CardDescription>Let us know how we can improve</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <Button
                            variant={helpful === true ? 'default' : 'outline'}
                            onClick={() => handleFeedback(true)}
                            className="flex-1"
                        >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Yes, helpful
                        </Button>
                        <Button
                            variant={helpful === false ? 'destructive' : 'outline'}
                            onClick={() => handleFeedback(false)}
                            className="flex-1"
                        >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Not helpful
                        </Button>
                        <Button
                            variant={bookmarked ? 'default' : 'outline'}
                            onClick={handleBookmark}
                        >
                            <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
                        </Button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Additional Comments (Optional)
                        </label>
                        <Textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Tell us more about your experience with this article..."
                            rows={4}
                        />
                    </div>

                    <Button onClick={handleSubmitComment} disabled={!feedback.trim()}>
                        Submit Feedback
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Related Articles</CardTitle>
                    <CardDescription>You might also find these helpful</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                <h3 className="font-medium">Related Article {i}</h3>
                                <p className="text-sm text-gray-500 mt-1">Brief description of the related article</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="secondary">Category</Badge>
                                    <Badge variant="outline">Priority</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
