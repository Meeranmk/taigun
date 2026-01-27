export type UserRole = 'platform_owner' | 'org_admin' | 'team_admin' | 'user';

export interface User {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: 'active' | 'inactive';
    organizationId?: string;
    teamId?: string;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface KnowledgeBaseEntry {
    id: string;
    problem: string;
    solution: SolutionStep[];
    category: string;
    tags: string[];
    priority: 'low' | 'medium' | 'high';
    usageCount: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    effectiveness: number;
}

export interface SolutionStep {
    stepNumber: number;
    type: 'action' | 'verification' | 'note';
    description: string;
}

export interface KnowledgeBaseArticle {
    id: string;
    title?: string;
    problem: string;
    solution: string[];
    category: string;
    tags: string[];
    priority: 'low' | 'medium' | 'high';
    status: 'draft' | 'published' | 'archived';
    usageCount: number;
    effectiveness: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    serviceNowArticleId?: string;
}

export interface Analytics {
    totalEntries: number;
    mostUsed: KnowledgeBaseEntry[];
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
}

export interface TeamAnalytics {
    totalInteractions: number;
    averageResponseTime: number;
    successRate: number;
    userPerformance: {
        userId: string;
        userName: string;
        totalQueries: number;
        resolvedQueries: number;
        averageResolutionTime: number;
    }[];
    mostUsedArticles: {
        articleId: string;
        title: string;
        usageCount: number;
        effectiveness: number;
    }[];
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: User;
}

export interface AuthStatus {
    isAuthenticated: boolean;
    user?: User;
}

export interface VerifyEmailResponse {
    success: boolean;
    message: string;
    userId?: string;
    organizationId?: string;
    needsPassword?: boolean;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export interface Organization {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'inactive';
    subscriptionTier: 'standard' | 'enterprise';
}

export interface Team {
    id: string;
    name: string;
    organizationId: string;
    description?: string;
    status?: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
    memberCount: number;
}

export interface PlatformAnalytics {
    totalOrganizations: number;
    totalUsers: number;
    activeUsers: number;
    totalQueries: number;
    systemHealth: number;
    revenue: number;
    growth: number;
}

export interface PersonalAnalytics {
    userId: string;
    queriesLast30Days: number;
    avgResponseTime: number;
    contributionScore: number;
    recentActivity: {
        action: string;
        timestamp: string;
        details?: string;
    }[];
    totalQueries?: number;
    resolvedQueries?: number;
    averageResolutionTime?: number;
    mostAccessedArticles?: {
        articleId: string;
        title: string;
        viewCount: number;
        effectiveness: number;
    }[];
    frequentlyAskedQuestions?: string[];
}

export interface ChangePasswordInput {
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    teamId?: string;
    organizationId: string;
}

export interface OrganizationRegistration {
    organizationName: string;
    organizationEmail: string;
    website?: string;
    industry: string;
    size: string;
    country: string;
    timezone: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone?: string;
    initialTeamName: string;
    serviceNowInstanceUrl: string;
    serviceNowUsername: string;
    serviceNowPassword: string;
    authMethod: 'oauth' | 'api_key';
    googleApiKey?: string;
    openaiApiKey?: string;
    defaultLanguage: string;
    dataRetentionPolicy: string;
}

export interface OrganizationSettings {
    organizationId: string;
    allowedDomains: string[];
    authSettings: {
        mfaEnabled: boolean;
        ssoEnabled: boolean;
        provider?: string;
    };
    theme: {
        primaryColor: string;
        logoUrl?: string;
    };
}

export interface TeamSettings {
    teamId: string;
    isPrivate: boolean;
    autoJoinDomains: string[];
    defaultRole: UserRole;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface AuditLog {
    id: string;
    userId: string;
    userName: string;
    action: string;
    resourceType: string;
    resourceId: string;
    details: Record<string, any>;
    timestamp: string;
    ipAddress: string;
}

export interface ChatMessage {
    id: string;
    sessionId: string;
    content: string;
    sender: 'user' | 'agent';
    timestamp: string;
    metadata?: Record<string, any>;
}
