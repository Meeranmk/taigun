'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUIStore } from '@/lib/store/uiStore';
import api from '@/lib/api-client';
import {
    organizationInfoSchema,
    teamAdminInfoSchema,
    initialSettingsSchema,
    type RegistrationFormData,
} from '@/lib/validations/registration';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Organization Information', description: 'Tell us about your organization' },
    { id: 2, title: 'Team Admin Information', description: 'Set up the first admin account' },
    { id: 3, title: 'Initial Settings', description: 'Configure your workspace' },
];

const INDUSTRIES = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Other',
];

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'];

const DATA_RETENTION_POLICIES = [
    '30 days',
    '90 days',
    '180 days',
    '1 year',
    '2 years',
    'Indefinite',
];

export default function RegisterPage() {
    const router = useRouter();
    const { addToast } = useUIStore();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<Partial<RegistrationFormData>>({
        initialTeamName: 'Default Team',
        defaultLanguage: 'English',
        dataRetentionPolicy: '90 days',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get current schema based on step
    const getCurrentSchema = () => {
        switch (currentStep) {
            case 1:
                return organizationInfoSchema;
            case 2:
                return teamAdminInfoSchema;
            case 3:
                return initialSettingsSchema;
            default:
                return organizationInfoSchema;
        }
    };

    const {
        register,
        handleSubmit,
        formState: { errors },
        trigger,
    } = useForm({
        resolver: zodResolver(getCurrentSchema()),
        defaultValues: formData,
    });

    const handleNext = async (data: any) => {
        const isValid = await trigger();
        if (!isValid) return;

        setFormData({ ...formData, ...data });

        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        } else {
            await handleFinalSubmit({ ...formData, ...data });
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFinalSubmit = async (data: RegistrationFormData) => {
        setIsSubmitting(true);
        try {
            const response = await api.registerOrganization(data);

            if (response.success) {
                addToast({
                    type: 'success',
                    title: 'Registration Successful!',
                    message: 'Your organization has been created. Check your email for login credentials.',
                });

                // Redirect to login page
                setTimeout(() => {
                    router.push('/login');
                }, 2000);
            }
        } catch (error: any) {
            addToast({
                type: 'error',
                title: 'Registration Failed',
                message: error.message || 'An error occurred during registration',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep > step.id
                                            ? 'bg-green-500 text-white'
                                            : currentStep === step.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-500'
                                            }`}
                                    >
                                        {currentStep > step.id ? (
                                            <CheckCircle className="w-6 h-6" />
                                        ) : (
                                            step.id
                                        )}
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                            {step.title}
                                        </p>
                                    </div>
                                </div>
                                {index < STEPS.length - 1 && (
                                    <div
                                        className={`h-1 flex-1 mx-4 rounded transition-all ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Card */}
                <Card className="shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            {STEPS[currentStep - 1].title}
                        </CardTitle>
                        <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(handleNext)} className="space-y-6">
                            {/* Step 1: Organization Information */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="organizationName">Organization Name *</Label>
                                            <Input
                                                id="organizationName"
                                                {...register('organizationName')}
                                                placeholder="Acme Corporation"
                                            />
                                            {errors.organizationName && (
                                                <p className="text-sm text-red-600 mt-1">{errors.organizationName.message as string}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="organizationEmail">Organization Email *</Label>
                                            <Input
                                                id="organizationEmail"
                                                type="email"
                                                {...register('organizationEmail')}
                                                placeholder="contact@acme.com"
                                            />
                                            {errors.organizationEmail && (
                                                <p className="text-sm text-red-600 mt-1">{errors.organizationEmail.message as string}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="website">Website</Label>
                                        <Input
                                            id="website"
                                            {...register('website')}
                                            placeholder="https://acme.com"
                                        />
                                        {errors.website && (
                                            <p className="text-sm text-red-600 mt-1">{errors.website.message as string}</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="industry">Industry *</Label>
                                            <select
                                                id="industry"
                                                {...register('industry')}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="">Select industry</option>
                                                {INDUSTRIES.map((industry) => (
                                                    <option key={industry} value={industry}>
                                                        {industry}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.industry && (
                                                <p className="text-sm text-red-600 mt-1">{errors.industry.message as string}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="size">Organization Size *</Label>
                                            <select
                                                id="size"
                                                {...register('size')}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="">Select size</option>
                                                <option value="1-10">1-10 employees</option>
                                                <option value="11-50">11-50 employees</option>
                                                <option value="51-200">51-200 employees</option>
                                                <option value="201-500">201-500 employees</option>
                                                <option value="500+">500+ employees</option>
                                            </select>
                                            {errors.size && (
                                                <p className="text-sm text-red-600 mt-1">{errors.size.message as string}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="country">Country *</Label>
                                            <Input
                                                id="country"
                                                {...register('country')}
                                                placeholder="United States"
                                            />
                                            {errors.country && (
                                                <p className="text-sm text-red-600 mt-1">{errors.country.message as string}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="timezone">Timezone *</Label>
                                            <Input
                                                id="timezone"
                                                {...register('timezone')}
                                                placeholder="America/New_York"
                                            />
                                            {errors.timezone && (
                                                <p className="text-sm text-red-600 mt-1">{errors.timezone.message as string}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Team Admin Information */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="adminFirstName">First Name *</Label>
                                            <Input
                                                id="adminFirstName"
                                                {...register('adminFirstName')}
                                                placeholder="John"
                                            />
                                            {errors.adminFirstName && (
                                                <p className="text-sm text-red-600 mt-1">{errors.adminFirstName.message as string}</p>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="adminLastName">Last Name *</Label>
                                            <Input
                                                id="adminLastName"
                                                {...register('adminLastName')}
                                                placeholder="Doe"
                                            />
                                            {errors.adminLastName && (
                                                <p className="text-sm text-red-600 mt-1">{errors.adminLastName.message as string}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="adminEmail">Admin Email *</Label>
                                        <Input
                                            id="adminEmail"
                                            type="email"
                                            {...register('adminEmail')}
                                            placeholder="john.doe@acme.com"
                                        />
                                        {errors.adminEmail && (
                                            <p className="text-sm text-red-600 mt-1">{errors.adminEmail.message as string}</p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="adminPhone">Phone Number</Label>
                                        <Input
                                            id="adminPhone"
                                            {...register('adminPhone')}
                                            placeholder="+1 (555) 123-4567"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="initialTeamName">Initial Team Name *</Label>
                                        <Input
                                            id="initialTeamName"
                                            {...register('initialTeamName')}
                                            placeholder="Default Team"
                                        />
                                        {errors.initialTeamName && (
                                            <p className="text-sm text-red-600 mt-1">{errors.initialTeamName.message as string}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Initial Settings */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    {/* AI Configuration */}
                                    <div className="space-y-4 pt-2">
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">AI Provider Configuration</h3>
                                        <div>
                                            <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                                            <Input
                                                id="openaiApiKey"
                                                type="password"
                                                {...register('openaiApiKey')}
                                                placeholder="sk-..."
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Get your API key from OpenAI Platform</p>
                                        </div>
                                        <div>
                                            <Label htmlFor="googleApiKey">Google AI API Key</Label>
                                            <Input
                                                id="googleApiKey"
                                                type="password"
                                                {...register('googleApiKey')}
                                                placeholder="Alza..."
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">Get your API key from Google AI Studio</p>
                                        </div>
                                    </div>

                                    {/* ServiceNow Configuration */}
                                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <h3 className="font-medium text-gray-900 dark:text-gray-100">ServiceNow Configuration</h3>
                                        <div>
                                            <Label htmlFor="serviceNowInstanceUrl">ServiceNow Instance URL *</Label>
                                            <Input
                                                id="serviceNowInstanceUrl"
                                                {...register('serviceNowInstanceUrl')}
                                                placeholder="https://your-instance.service-now.com"
                                            />
                                            {errors.serviceNowInstanceUrl && (
                                                <p className="text-sm text-red-600 mt-1">{errors.serviceNowInstanceUrl.message as string}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="serviceNowUsername">Username *</Label>
                                                <Input
                                                    id="serviceNowUsername"
                                                    {...register('serviceNowUsername')}
                                                    placeholder="admin"
                                                />
                                                {errors.serviceNowUsername && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.serviceNowUsername.message as string}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="serviceNowPassword">Password *</Label>
                                                <Input
                                                    id="serviceNowPassword"
                                                    type="password"
                                                    {...register('serviceNowPassword')}
                                                    placeholder="••••••••"
                                                />
                                                {errors.serviceNowPassword && (
                                                    <p className="text-sm text-red-600 mt-1">{errors.serviceNowPassword.message as string}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="authMethod">Authentication Method *</Label>
                                            <select
                                                id="authMethod"
                                                {...register('authMethod')}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <option value="">Select method</option>
                                                <option value="oauth">OAuth</option>
                                                <option value="api_key">Basic Auth</option>
                                            </select>
                                            {errors.authMethod && (
                                                <p className="text-sm text-red-600 mt-1">{errors.authMethod.message as string}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="defaultLanguage">Default Language *</Label>
                                            <select
                                                id="defaultLanguage"
                                                {...register('defaultLanguage')}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                {LANGUAGES.map((lang) => (
                                                    <option key={lang} value={lang}>
                                                        {lang}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <Label htmlFor="dataRetentionPolicy">Data Retention Policy *</Label>
                                            <select
                                                id="dataRetentionPolicy"
                                                {...register('dataRetentionPolicy')}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                {DATA_RETENTION_POLICIES.map((policy) => (
                                                    <option key={policy} value={policy}>
                                                        {policy}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-2">
                                        <input
                                            type="checkbox"
                                            id="acceptedTerms"
                                            {...register('acceptedTerms')}
                                            className="mt-1"
                                        />
                                        <Label htmlFor="acceptedTerms" className="text-sm">
                                            I accept the{' '}
                                            <a href="/terms" className="text-blue-600 hover:underline">
                                                Terms of Service
                                            </a>{' '}
                                            and{' '}
                                            <a href="/privacy" className="text-blue-600 hover:underline">
                                                Privacy Policy
                                            </a>
                                            *
                                        </Label>
                                    </div>
                                    {errors.acceptedTerms && (
                                        <p className="text-sm text-red-600">{errors.acceptedTerms.message as string}</p>
                                    )}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleBack}
                                    disabled={currentStep === 1 || isSubmitting}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>

                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        'Submitting...'
                                    ) : currentStep === 3 ? (
                                        'Complete Registration'
                                    ) : (
                                        <>
                                            Next
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Login Link */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account?{' '}
                        <a href="/login" className="text-blue-600 hover:underline font-medium">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
