'use client';

import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="max-w-4xl w-full">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                            <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            Taigun - A ServiceNow AI Agent
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            AI-powered knowledge base and ticket management system
                        </p>
                    </div>

                    {/* Portal Cards */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Chat Portal */}
                        <Link href="/chat">
                            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer border-2 border-transparent hover:border-blue-500">
                                <div className="h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Ask the Assistant
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Get instant answers from our knowledge base using AI
                                </p>
                                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                                    Start chatting
                                    <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        {/* Admin Portal */}
                        <Link href="/login">
                            <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-8 cursor-pointer border-2 border-transparent hover:border-indigo-500">
                                <div className="h-16 w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Admin Portal
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">
                                    Manage knowledge base, users, and view analytics
                                </p>
                                <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-medium">
                                    Sign in
                                    <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Features */}
                    <div className="mt-12 grid grid-cols-3 gap-6 text-center">
                        <div>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">AI-Powered</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Smart answers from knowledge base</p>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">24/7 Available</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Get help anytime you need</p>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">Fast & Accurate</div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Instant responses with sources</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
