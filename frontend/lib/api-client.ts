import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
    User,
    Organization,
    Team,
    KnowledgeBaseArticle,
    TeamAnalytics,
    PlatformAnalytics,
    PersonalAnalytics,
    AuthResponse,
    AuthStatus,
    LoginCredentials,
    ChangePasswordInput,
    CreateUserInput,
    OrganizationRegistration,
    OrganizationSettings,
    TeamSettings,
    PaginatedResponse,
    PaginationParams,
    ApiResponse,
    AuditLog,
    ChatMessage,
    VerifyEmailResponse
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class APIClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true,
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                if (error.response?.status === 401) {
                    // Handle unauthorized - redirect to login
                    const path = window.location.pathname;
                    if (typeof window !== 'undefined' &&
                        path !== '/' &&
                        !path.startsWith('/login') &&
                        !path.startsWith('/register') &&
                        !path.startsWith('/verify-email') &&
                        !path.startsWith('/create-password') &&
                        !path.startsWith('/resend-verification') &&
                        !path.startsWith('/chat')) {
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    // ==================== Authentication ====================

    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const { data } = await this.client.post<AuthResponse>('/admin/auth', credentials);
        return data;
    }

    async logout(): Promise<void> {
        await this.client.post('/admin/logout');
    }

    async getAuthStatus(): Promise<AuthStatus> {
        const { data } = await this.client.get<AuthStatus>('/admin/auth/status');
        return data;
    }

    async changePassword(input: ChangePasswordInput): Promise<ApiResponse<void>> {
        const { data } = await this.client.put<ApiResponse<void>>('/auth/password', input);
        return data;
    }

    // ==================== Organizations ====================

    async registerOrganization(registration: OrganizationRegistration): Promise<ApiResponse<Organization>> {
        const { data } = await this.client.post<ApiResponse<Organization>>('/organizations/register', registration);
        return data;
    }

    async verifyEmail(token: string): Promise<VerifyEmailResponse> {
        const { data } = await this.client.post<VerifyEmailResponse>('/organizations/verify-email', { token });
        return data;
    }

    async createPassword(userId: string, password: string, confirmPassword: string): Promise<ApiResponse<any>> {
        const { data } = await this.client.post<ApiResponse<any>>('/organizations/create-password', {
            userId,
            password,
            confirmPassword
        });
        return data;
    }

    async resendVerification(email: string, entityType: 'organization' | 'user'): Promise<ApiResponse<any>> {
        const { data } = await this.client.post<ApiResponse<any>>('/organizations/resend-verification', {
            email,
            entityType
        });
        return data;
    }

    async getOrganizations(params?: PaginationParams): Promise<PaginatedResponse<Organization>> {
        const { data } = await this.client.get<PaginatedResponse<Organization>>('/organizations', { params });
        return data;
    }

    async getOrganization(id: string): Promise<ApiResponse<Organization>> {
        const { data } = await this.client.get<ApiResponse<Organization>>(`/organizations/${id}`);
        return data;
    }

    async updateOrganization(id: string, updates: Partial<Organization>): Promise<ApiResponse<Organization>> {
        const { data } = await this.client.put<ApiResponse<Organization>>(`/organizations/${id}`, updates);
        return data;
    }

    async deleteOrganization(id: string): Promise<ApiResponse<void>> {
        const { data } = await this.client.delete<ApiResponse<void>>(`/organizations/${id}`);
        return data;
    }

    async getOrganizationSettings(id: string): Promise<ApiResponse<OrganizationSettings>> {
        const { data } = await this.client.get<ApiResponse<OrganizationSettings>>(`/organizations/${id}/settings`);
        return data;
    }

    async updateOrganizationSettings(id: string, settings: Partial<OrganizationSettings>): Promise<ApiResponse<OrganizationSettings>> {
        const { data } = await this.client.put<ApiResponse<OrganizationSettings>>(`/organizations/${id}/settings`, settings);
        return data;
    }

    // ==================== Teams ====================

    async getTeams(organizationId?: string, params?: PaginationParams): Promise<PaginatedResponse<Team>> {
        const { data } = await this.client.get<PaginatedResponse<Team>>('/teams', {
            params: { organizationId, ...params }
        });
        return data;
    }

    async getTeam(id: string): Promise<ApiResponse<Team>> {
        const { data } = await this.client.get<ApiResponse<Team>>(`/teams/${id}`);
        return data;
    }

    async createTeam(team: Partial<Team>): Promise<ApiResponse<Team>> {
        const { data } = await this.client.post<ApiResponse<Team>>('/teams', team);
        return data;
    }

    async updateTeam(id: string, updates: Partial<Team>): Promise<ApiResponse<Team>> {
        const { data } = await this.client.put<ApiResponse<Team>>(`/teams/${id}`, updates);
        return data;
    }

    async deleteTeam(id: string): Promise<ApiResponse<void>> {
        const { data } = await this.client.delete<ApiResponse<void>>(`/teams/${id}`);
        return data;
    }

    async archiveTeam(id: string): Promise<ApiResponse<Team>> {
        const { data } = await this.client.patch<ApiResponse<Team>>(`/teams/${id}/archive`);
        return data;
    }

    async getTeamSettings(id: string): Promise<ApiResponse<TeamSettings>> {
        const { data } = await this.client.get<ApiResponse<TeamSettings>>(`/teams/${id}/settings`);
        return data;
    }

    async updateTeamSettings(id: string, settings: Partial<TeamSettings>): Promise<ApiResponse<TeamSettings>> {
        const { data } = await this.client.put<ApiResponse<TeamSettings>>(`/teams/${id}/settings`, settings);
        return data;
    }

    // ==================== Users ====================

    async getUsers(params?: PaginationParams & { teamId?: string; organizationId?: string }): Promise<PaginatedResponse<User>> {
        const { data } = await this.client.get<PaginatedResponse<User>>('/users', { params });
        return data;
    }

    async getUser(id: string): Promise<ApiResponse<User>> {
        const { data } = await this.client.get<ApiResponse<User>>(`/users/${id}`);
        return data;
    }

    async createUser(user: CreateUserInput): Promise<ApiResponse<User>> {
        const { data } = await this.client.post<ApiResponse<User>>('/users', user);
        return data;
    }

    async updateUser(id: string, updates: Partial<User>): Promise<ApiResponse<User>> {
        const { data } = await this.client.put<ApiResponse<User>>(`/users/${id}`, updates);
        return data;
    }

    async deleteUser(id: string): Promise<ApiResponse<void>> {
        const { data } = await this.client.delete<ApiResponse<void>>(`/users/${id}`);
        return data;
    }

    async bulkImportUsers(file: File): Promise<ApiResponse<{ imported: number; failed: number }>> {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await this.client.post<ApiResponse<{ imported: number; failed: number }>>('/users/bulk-import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    }

    async exportUsers(params?: { teamId?: string; organizationId?: string }): Promise<Blob> {
        const { data } = await this.client.get('/users/export', {
            params,
            responseType: 'blob'
        });
        return data;
    }

    // ==================== Knowledge Base ====================

    async getKnowledgeBase(params?: PaginationParams & { teamId?: string; category?: string; status?: string }): Promise<PaginatedResponse<KnowledgeBaseArticle>> {
        const { data } = await this.client.get<PaginatedResponse<KnowledgeBaseArticle>>('/knowledge-base', { params });
        return data;
    }

    async getArticle(id: string): Promise<ApiResponse<KnowledgeBaseArticle>> {
        const { data } = await this.client.get<ApiResponse<KnowledgeBaseArticle>>(`/knowledge-base/${id}`);
        return data;
    }

    async createArticle(article: Partial<KnowledgeBaseArticle>): Promise<ApiResponse<KnowledgeBaseArticle>> {
        const { data } = await this.client.post<ApiResponse<KnowledgeBaseArticle>>('/knowledge-base', article);
        return data;
    }

    async updateArticle(id: string, updates: Partial<KnowledgeBaseArticle>): Promise<ApiResponse<KnowledgeBaseArticle>> {
        const { data } = await this.client.put<ApiResponse<KnowledgeBaseArticle>>(`/knowledge-base/${id}`, updates);
        return data;
    }

    async deleteArticle(id: string): Promise<ApiResponse<void>> {
        const { data } = await this.client.delete<ApiResponse<void>>(`/knowledge-base/${id}`);
        return data;
    }

    async publishArticle(id: string): Promise<ApiResponse<KnowledgeBaseArticle>> {
        const { data } = await this.client.patch<ApiResponse<KnowledgeBaseArticle>>(`/knowledge-base/${id}/publish`);
        return data;
    }

    async unpublishArticle(id: string): Promise<ApiResponse<KnowledgeBaseArticle>> {
        const { data } = await this.client.patch<ApiResponse<KnowledgeBaseArticle>>(`/knowledge-base/${id}/unpublish`);
        return data;
    }

    async uploadArticleAttachment(articleId: string, file: File): Promise<ApiResponse<{ url: string }>> {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await this.client.post<ApiResponse<{ url: string }>>(`/knowledge-base/${articleId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data;
    }

    async searchKnowledgeBase(query: string, teamId?: string): Promise<ApiResponse<KnowledgeBaseArticle[]>> {
        const { data } = await this.client.get<ApiResponse<KnowledgeBaseArticle[]>>('/knowledge-base/search', {
            params: { query, teamId }
        });
        return data;
    }

    // ==================== Analytics ====================

    async getPlatformAnalytics(dateRange?: { start: string; end: string }): Promise<ApiResponse<PlatformAnalytics>> {
        const { data } = await this.client.get<ApiResponse<PlatformAnalytics>>('/analytics/platform', {
            params: dateRange
        });
        return data;
    }

    async getTeamAnalytics(teamId: string, dateRange?: { start: string; end: string }): Promise<ApiResponse<TeamAnalytics>> {
        const { data } = await this.client.get<ApiResponse<TeamAnalytics>>(`/analytics/teams/${teamId}`, {
            params: dateRange
        });
        return data;
    }

    async getOrganizationAnalytics(organizationId: string, dateRange?: { start: string; end: string }): Promise<ApiResponse<any>> {
        const { data } = await this.client.get<ApiResponse<any>>(`/analytics/organizations/${organizationId}`, {
            params: dateRange
        });
        return data;
    }

    async getPersonalAnalytics(userId: string, dateRange?: { start: string; end: string }): Promise<ApiResponse<PersonalAnalytics>> {
        const { data } = await this.client.get<ApiResponse<PersonalAnalytics>>(`/analytics/users/${userId}`, {
            params: dateRange
        });
        return data;
    }

    async exportAnalytics(type: 'platform' | 'organization' | 'team', id?: string, format: 'pdf' | 'csv' | 'excel' = 'pdf'): Promise<Blob> {
        const { data } = await this.client.get(`/analytics/export/${type}${id ? `/${id}` : ''}`, {
            params: { format },
            responseType: 'blob'
        });
        return data;
    }

    // ==================== Audit Logs ====================

    async getAuditLogs(params?: PaginationParams & { userId?: string; action?: string; startDate?: string; endDate?: string }): Promise<PaginatedResponse<AuditLog>> {
        const { data } = await this.client.get<PaginatedResponse<AuditLog>>('/audit-logs', { params });
        return data;
    }

    async exportAuditLogs(params?: { userId?: string; action?: string; startDate?: string; endDate?: string }): Promise<Blob> {
        const { data } = await this.client.get('/audit-logs/export', {
            params,
            responseType: 'blob'
        });
        return data;
    }

    // ==================== Chat ====================

    async sendChatMessage(message: string, sessionId?: string): Promise<ApiResponse<ChatMessage>> {
        const { data } = await this.client.post<ApiResponse<ChatMessage>>('/chat', {
            message,
            sessionId
        });
        return data;
    }

    async getChatHistory(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
        const { data } = await this.client.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}`);
        return data;
    }

    // ==================== Settings ====================

    async testServiceNowConnection(config: { instanceUrl: string; authMethod: string; credentials: any }): Promise<ApiResponse<{ connected: boolean }>> {
        const { data } = await this.client.post<ApiResponse<{ connected: boolean }>>('/settings/servicenow/test', config);
        return data;
    }
}

export const api = new APIClient();
export default api;
