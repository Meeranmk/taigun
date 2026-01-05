import type { User, KnowledgeBaseEntry, Analytics, AuthResponse, AuthStatus } from './types';

const API_BASE = '/api';

class APIClient {
    private async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    // Auth
    async login(username: string, password: string): Promise<AuthResponse> {
        return this.request('/admin/auth', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async logout(): Promise<void> {
        await this.request('/admin/logout', { method: 'POST' });
    }

    async getAuthStatus(): Promise<AuthStatus> {
        return this.request('/admin/auth/status');
    }

    // Users
    async getUsers(): Promise<{ success: boolean; users: User[] }> {
        return this.request('/admin/users');
    }

    async createUser(data: {
        username: string;
        email: string;
        password: string;
        role: 'admin' | 'user';
    }): Promise<{ success: boolean; user: User }> {
        return this.request('/admin/users', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
        return this.request(`/admin/users/${userId}`, {
            method: 'DELETE',
        });
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
        return this.request('/admin/users/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    }

    // Knowledge Base
    async getKnowledgeBase(params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{
        data: KnowledgeBaseEntry[];
        page: number;
        totalPages: number;
        total: number;
    }> {
        const query = new URLSearchParams();
        if (params?.page) query.append('page', params.page.toString());
        if (params?.limit) query.append('limit', params.limit.toString());
        if (params?.search) query.append('search', params.search);

        return this.request(`/admin/knowledge-base?${query}`);
    }

    async createKBEntry(data: {
        problem: string;
        solution: Array<{ stepNumber: number; type: string; description: string }>;
        category: string;
        tags: string[];
        priority: string;
    }): Promise<KnowledgeBaseEntry> {
        return this.request('/admin/knowledge-base', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateKBEntry(id: string, data: Partial<KnowledgeBaseEntry>): Promise<KnowledgeBaseEntry> {
        return this.request(`/admin/knowledge-base/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteKBEntry(id: string): Promise<{ success: boolean; message: string }> {
        return this.request(`/admin/knowledge-base/${id}`, {
            method: 'DELETE',
        });
    }

    // Analytics
    async getAnalytics(): Promise<Analytics> {
        return this.request('/admin/analytics');
    }
}

export const api = new APIClient();
