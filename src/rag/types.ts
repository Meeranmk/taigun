import type { KnowledgeBaseEntry } from '../knowledge-base/types.js';

export interface ProblemSubmission {
    problem: string;
    userEmail?: string;
    userName?: string;
}

export interface SimilarCase {
    source: 'knowledge-base' | 'servicenow';
    id: string;
    problem: string;
    solution: string;
    similarity: number;
    metadata?: any;
}

export interface GeneratedSolution {
    id: string;
    problem: string;
    steps: SolutionStep[];
    similarCases: SimilarCase[];
    confidence: number;
    createdAt: Date;
}

export interface SolutionStep {
    stepNumber: number;
    description: string;
    type: 'action' | 'verification' | 'note';
}

export interface RAGConfig {
    embeddingModel: string;
    similarityThreshold: number;
    maxSimilarCases: number;
    kbPriorityWeight: number; // Multiplier for KB similarity scores
    googleApiKey?: string; // Optional Google API key from database
    openaiApiKey?: string; // Optional OpenAI API key from database
}
