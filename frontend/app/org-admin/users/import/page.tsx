'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUIStore } from '@/lib/store/uiStore';
import { Upload, FileText, X } from 'lucide-react';

export default function BulkImportPage() {
    const { addToast } = useUIStore();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            // Simulate upload
            await new Promise(resolve => setTimeout(resolve, 2000));

            addToast({
                type: 'success',
                title: 'Import Successful',
                message: `Successfully imported users from ${file.name}`,
            });

            setFile(null);
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Import Failed',
                message: error.message,
            });
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = () => {
        const csvContent = 'firstName,lastName,email,username,role\nJohn,Doe,john@example.com,johndoe,USER\n';
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user-import-template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulk Import Users</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Import multiple users from a CSV file
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Upload CSV File</CardTitle>
                        <CardDescription>Select a CSV file containing user data</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            {file ? (
                                <div className="space-y-4">
                                    <FileText className="w-12 h-12 mx-auto text-blue-600" />
                                    <div>
                                        <p className="font-medium">{file.name}</p>
                                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFile(null)}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                                    <div>
                                        <Label htmlFor="file-upload" className="cursor-pointer">
                                            <span className="text-blue-600 hover:underline">Click to upload</span>
                                            <span className="text-gray-500"> or drag and drop</span>
                                        </Label>
                                        <p className="text-sm text-gray-500 mt-1">CSV file up to 10MB</p>
                                    </div>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="w-full"
                        >
                            {uploading ? 'Uploading...' : 'Upload and Import'}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Instructions</CardTitle>
                        <CardDescription>How to prepare your CSV file</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h3 className="font-semibold mb-2">Required Columns:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                <li>firstName</li>
                                <li>lastName</li>
                                <li>email</li>
                                <li>username</li>
                                <li>role (USER, TEAM_ADMIN, or ORG_ADMIN)</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Example:</h3>
                            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                                {`firstName,lastName,email,username,role
John,Doe,john@example.com,johndoe,USER
Jane,Smith,jane@example.com,janesmith,TEAM_ADMIN`}
                            </pre>
                        </div>

                        <Button variant="outline" onClick={downloadTemplate} className="w-full">
                            Download Template
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
