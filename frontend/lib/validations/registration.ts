import { z } from 'zod';

// Step 1: Organization Information
export const organizationInfoSchema = z.object({
    organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
    organizationEmail: z.string().email('Invalid email address'),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    industry: z.string().min(1, 'Please select an industry'),
    size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+'], {
        errorMap: () => ({ message: 'Please select organization size' }),
    }),
    country: z.string().min(1, 'Please select a country'),
    timezone: z.string().min(1, 'Please select a timezone'),
});

// Step 2: Team Admin Information
export const teamAdminInfoSchema = z.object({
    adminFirstName: z.string().min(2, 'First name must be at least 2 characters'),
    adminLastName: z.string().min(2, 'Last name must be at least 2 characters'),
    adminEmail: z.string().email('Invalid email address'),
    adminPhone: z.string().optional(),
    initialTeamName: z.string().min(2, 'Team name must be at least 2 characters'),
});

// Step 3: Initial Settings
export const initialSettingsSchema = z.object({
    serviceNowInstanceUrl: z.string().url('Invalid ServiceNow instance URL'),
    serviceNowUsername: z.string().min(1, 'Username is required'),
    serviceNowPassword: z.string().min(1, 'Password is required'),
    authMethod: z.enum(['oauth', 'api_key'], {
        errorMap: () => ({ message: 'Please select an authentication method' }),
    }),
    googleApiKey: z.string().optional(),
    openaiApiKey: z.string().optional(),
    defaultLanguage: z.string().min(1, 'Please select a language'),
    dataRetentionPolicy: z.string().min(1, 'Please select a data retention policy'),
    acceptedTerms: z.boolean().refine((val) => val === true, {
        message: 'You must accept the terms of service',
    }),
});

// Combined schema for full registration
export const registrationSchema = organizationInfoSchema
    .merge(teamAdminInfoSchema)
    .merge(initialSettingsSchema);

export type OrganizationInfoFormData = z.infer<typeof organizationInfoSchema>;
export type TeamAdminInfoFormData = z.infer<typeof teamAdminInfoSchema>;
export type InitialSettingsFormData = z.infer<typeof initialSettingsSchema>;
export type RegistrationFormData = z.infer<typeof registrationSchema>;
