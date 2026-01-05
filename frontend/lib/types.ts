export interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
    teamId: string;
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

export interface Analytics {
    totalEntries: number;
    mostUsed: KnowledgeBaseEntry[];
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: {
        username: string;
        role: 'admin' | 'user';
    };
}

export interface AuthStatus {
    isAuthenticated: boolean;
    username?: string;
    role?: 'admin' | 'user';
}
