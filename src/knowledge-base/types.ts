export interface SolutionStep {
    stepNumber: number;
    description: string;
    type: 'action' | 'verification' | 'note';
}

export interface KnowledgeBaseEntry {
    id: string;
    problem: string;
    solution: SolutionStep[];
    category: string;
    tags: string[];
    priority: 'low' | 'medium' | 'high';
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    effectiveness: number; // 0-5 rating
}

export interface KnowledgeBaseFilters {
    category?: string;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    searchQuery?: string;
}

export interface PaginationOptions {
    page: number;
    limit: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    totalPages: number;
}
