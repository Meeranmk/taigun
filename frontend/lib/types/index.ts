// User Roles
export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ORG_ADMIN = 'ORG_ADMIN',
    TEAM_ADMIN = 'TEAM_ADMIN',
    USER = 'USER'
}

// Organization Types
export interface Organization {
    id: string;
    name: string;
    email: string;
    website?: string;
    industry: string;
    size: OrganizationSize;
    country: string;
    timezone: string;
    status: 'active' | 'inactive' | 'suspended';
    createdAt: string;
    updatedAt: string;
    totalTeams: number;
    totalUsers: number;
}

export type OrganizationSize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export interface OrganizationRegistration {
    // Step 1: Organization Information
    organizationName: string;
    organizationEmail: string;
    website?: string;
    industry: string;
    size: OrganizationSize;
    country: string;
    timezone: string;

    // Step 2: Team Admin Information
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone?: string;
    initialTeamName: string;

    // Step 3: Initial Settings
    serviceNowInstanceUrl: string;
    authMethod: 'oauth' | 'api_key';
    defaultLanguage: string;
    dataRetentionPolicy: string;
    acceptedTerms: boolean;
}

// Team Types
export interface Team {
    id: string;
    name: string;
    description?: string;
    organizationId: string;
    adminId: string;
    status: 'active' | 'inactive' | 'archived';
    createdAt: string;
    updatedAt: string;
    memberCount: number;
    settings?: TeamSettings;
}

export interface TeamSettings {
    aiAgentBehavior?: Record<string, any>;
    notificationPreferences?: Record<string, boolean>;
    customization?: Record<string, any>;
}

// User Types
export interface User {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    organizationId: string;
    teamId?: string;
    status: 'active' | 'inactive' | 'suspended';
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role: UserRole;
    teamId?: string;
}

// Knowledge Base Types
export interface KnowledgeBaseArticle {
    id: string;
    title: string;
    content: string;
    problem: string;
    solution: string[]; // Array of solution steps as strings
    category: string;
    tags: string[];
    priority: 'low' | 'medium' | 'high';
    status: 'draft' | 'published' | 'archived';
    teamId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
    usageCount: number;
    effectiveness: number;
    version: number;
    serviceNowArticleId?: string;
}

export interface SolutionStep {
    stepNumber: number;
    type: 'action' | 'verification' | 'note';
    description: string;
}

export interface KnowledgeBaseCategory {
    id: string;
    name: string;
    description?: string;
    articleCount: number;
}

// Analytics Types
export interface PlatformAnalytics {
    totalOrganizations: number;
    totalTeams: number;
    totalUsers: number;
    totalInteractions: number;
    averageResponseTime: number;
    platformHealth: 'healthy' | 'degraded' | 'down';
    organizationMetrics: OrganizationMetric[];
}

export interface OrganizationMetric {
    organizationId: string;
    organizationName: string;
    totalTeams: number;
    totalUsers: number;
    totalInteractions: number;
    activityStatus: 'active' | 'low' | 'inactive';
}

export interface TeamAnalytics {
    teamId: string;
    teamName: string;
    totalInteractions: number;
    averageResponseTime: number;
    successRate: number;
    resolutionMetrics: {
        resolved: number;
        pending: number;
        escalated: number;
    };
    userEngagement: number;
    knowledgeBaseHitRate: number;
    topUsers: UserPerformance[];
    topArticles: ArticleUsage[];
    trendData: TrendData[];
    userPerformance: UserPerformance[]; // Detailed user performance data
    mostUsedArticles: ArticleUsage[]; // Most frequently used articles
}

export interface UserPerformance {
    userId: string;
    userName: string; // Display name for the user
    username: string; // Username
    totalQueries: number;
    resolvedQueries: number; // Number of resolved queries
    averageResolutionTime: number;
    successRate: number;
}

export interface ArticleUsage {
    articleId: string;
    title: string;
    viewCount: number;
    usageCount: number; // Number of times article was used
    helpfulCount: number;
    effectiveness: number;
}

export interface TrendData {
    date: string;
    interactions: number;
    avgResponseTime: number;
    successRate: number;
}

export interface PersonalAnalytics {
    totalQueries: number;
    resolvedQueries: number;
    averageResolutionTime: number;
    frequentlyAskedQuestions: string[];
    mostAccessedArticles: ArticleUsage[];
    activityHistory: ActivityLog[];
}

export interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    timestamp: string;
    metadata?: Record<string, any>;
}

// Settings Types
export interface OrganizationSettings {
    organizationId: string;
    serviceNowConfig: ServiceNowConfig;
    aiAgentDefaults: Record<string, any>;
    dataRetentionPolicy: string;
    notificationDefaults: Record<string, boolean>;
    securitySettings: SecuritySettings;
    usageLimits: UsageLimits;
    branding?: BrandingConfig;
}

export interface ServiceNowConfig {
    instanceUrl: string;
    authMethod: 'oauth' | 'api_key';
    credentials?: Record<string, string>;
    isConnected: boolean;
    lastSyncAt?: string;
}

export interface SecuritySettings {
    mfaRequired: boolean;
    passwordPolicy: {
        minLength: number;
        requireSpecialChars: boolean;
        requireNumbers: boolean;
        expiryDays?: number;
    };
    sessionTimeout: number;
    ipWhitelist?: string[];
}

export interface UsageLimits {
    maxTeams: number;
    maxUsersPerTeam: number;
    maxApiCallsPerDay: number;
    maxStorageGB: number;
}

export interface BrandingConfig {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
}

// Authentication Types
export interface AuthResponse {
    success: boolean;
    message: string;
    user?: {
        id: string;
        username: string;
        email: string;
        role: UserRole;
        organizationId?: string;
        teamId?: string;
    };
    token?: string;
    refreshToken?: string;
}

export interface AuthStatus {
    isAuthenticated: boolean;
    user?: User;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface ChangePasswordInput {
    currentPassword: string;
    newPassword: string;
}

// API Response Types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// Chat Types
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: {
        suggestedArticles?: KnowledgeBaseArticle[];
        confidence?: number;
    };
}

export interface ChatSession {
    id: string;
    userId: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}

// Audit Log Types
export interface AuditLog {
    id: string;
    userId: string;
    username: string;
    organizationId?: string;
    action: AuditAction;
    resource: string;
    resourceType: string; // Type of resource being audited
    resourceId?: string;
    details: string; // Details about the action
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
}

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'ACCESS'
    | 'EXPORT';

// Notification Types
export interface Notification {
    id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    actionUrl?: string;
}

// Email Verification Types
export interface VerifyEmailResponse {
    success: boolean;
    message: string;
    organizationId?: string;
    userId?: string;
    needsPassword: boolean;
}

export interface CreatePasswordRequest {
    userId: string;
    password: string;
    confirmPassword: string;
}

// All types are already exported above
