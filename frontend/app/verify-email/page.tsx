'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link');
            return;
        }

        verifyEmail(token);
    }, [searchParams]);

    const verifyEmail = async (token: string) => {
        try {
            const response = await api.verifyEmail(token);

            if (response.success && response.needsPassword) {
                setUserId(response.userId!);
                setStatus('success');
                setMessage('Email verified! Redirecting to create password...');

                // Redirect to password creation after 2 seconds
                setTimeout(() => {
                    router.push(`/create-password?userId=${response.userId}`);
                }, 2000);
            } else if (response.success && !response.needsPassword) {
                setStatus('success');
                setMessage('Email verified successfully! Redirecting to login...');

                // Redirect to login after 2 seconds
                setTimeout(() => {
                    router.push('/login?message=Email verified successfully. Please log in.');
                }, 2000);
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(error.response?.data?.detail || error.response?.data?.message || 'Verification failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
                {status === 'loading' && (
                    <div className="text-center">
                        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-700 text-lg">Verifying your email...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center text-green-600">
                        <svg className="h-16 w-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xl font-semibold">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <div className="text-red-600">
                            <svg className="h-16 w-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xl font-semibold mb-4">{message}</p>
                        </div>
                        {/* Show resend button if token expired */}
                        <button
                            onClick={() => router.push('/resend-verification')}
                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 shadow-md hover:shadow-lg"
                        >
                            Resend Verification Email
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
                    <div className="text-center">
                        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-700 text-lg">Loading...</p>
                    </div>
                </div>
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
