import { v4 as uuidv4 } from 'uuid';
import type {
    KnowledgeBaseEntry,
    KnowledgeBaseFilters,
    PaginationOptions,
    PaginatedResult,
} from './types.js';
import type { VectorDB } from '../rag/vector-db.js';
import { KnowledgeBaseRepository } from '../database/repositories/knowledge-base-repository.js';

export class KnowledgeBaseStorage {
    private vectorDB: VectorDB; // For embeddings only
    private kbRepository: KnowledgeBaseRepository; // For metadata
    private embedFunction: (text: string) => Promise<number[]>;

    constructor(vectorDB: VectorDB, embedFunction: (text: string) => Promise<number[]>) {
        this.vectorDB = vectorDB;
        this.kbRepository = new KnowledgeBaseRepository();
        this.embedFunction = embedFunction;
    }

    /**
     * Initialize storage
     */
    async initialize(): Promise<void> {
        console.log('✅ Knowledge Base Storage initialized (PostgreSQL + Qdrant)');
    }

    /**
     * Add a new entry to the knowledge base
     */
    async addEntry(
        entry: Omit<KnowledgeBaseEntry, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'effectiveness'>
    ): Promise<KnowledgeBaseEntry> {
        const newEntry: KnowledgeBaseEntry = {
            ...entry,
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
            usageCount: 0,
            effectiveness: 0,
        };

        // Store metadata in PostgreSQL
        await this.kbRepository.create(newEntry);

        // Generate embedding and store in Qdrant
        const embedding = await this.embedFunction(newEntry.problem);
        await this.vectorDB.addKBEntry(newEntry, embedding);

        return newEntry;
    }

    /**
     * Get all entries with optional filtering and pagination
     */
    async getEntries(
        filters?: KnowledgeBaseFilters,
        pagination?: PaginationOptions
    ): Promise<PaginatedResult<KnowledgeBaseEntry>> {
        // Get entries from PostgreSQL with filters
        const allEntries = await this.kbRepository.findAll(filters);

        // Apply pagination
        const page = pagination?.page || 1;
        const limit = pagination?.limit || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = allEntries.slice(startIndex, endIndex);

        return {
            data: paginatedData,
            total: allEntries.length,
            page,
            totalPages: Math.ceil(allEntries.length / limit),
        };
    }

    /**
     * Get a single entry by ID
     */
    async getEntryById(id: string): Promise<KnowledgeBaseEntry | null> {
        return await this.kbRepository.findById(id);
    }

    /**
     * Update an existing entry
     */
    async updateEntry(
        id: string,
        updates: Partial<Omit<KnowledgeBaseEntry, 'id' | 'createdAt' | 'usageCount'>>
    ): Promise<KnowledgeBaseEntry | null> {
        const existing = await this.kbRepository.findById(id);
        if (!existing) return null;

        // Update metadata in PostgreSQL
        const updatedEntry = await this.kbRepository.update(id, updates);
        if (!updatedEntry) return null;

        // Re-generate embedding if problem changed and update in Qdrant
        if (updates.problem) {
            const embedding = await this.embedFunction(updates.problem);
            await this.vectorDB.updateKBEntry(updatedEntry, embedding);
        }

        return updatedEntry;
    }

    /**
     * Delete an entry
     */
    async deleteEntry(id: string): Promise<boolean> {
        try {
            // Delete from PostgreSQL
            const deleted = await this.kbRepository.delete(id);

            // Delete from Qdrant
            if (deleted) {
                await this.vectorDB.deleteKBEntry(id);
            }

            return deleted;
        } catch {
            return false;
        }
    }

    /**
     * Increment usage count for an entry
     */
    async incrementUsage(id: string): Promise<void> {
        await this.kbRepository.incrementUsage(id);
    }

    /**
     * Search entries by text similarity (simple text matching for now)
     */
    async searchEntries(query: string, limit: number = 5): Promise<KnowledgeBaseEntry[]> {
        // Use PostgreSQL for text search
        const allEntries = await this.kbRepository.findAll({ searchQuery: query });
        const queryLower = query.toLowerCase();

        const scored = allEntries.map((entry) => {
            let score = 0;

            // Problem description match (highest weight)
            if (entry.problem.toLowerCase().includes(queryLower)) {
                score += 10;
            }

            // Tag matches
            entry.tags.forEach((tag) => {
                if (tag.toLowerCase().includes(queryLower)) {
                    score += 5;
                }
            });

            // Solution step matches
            entry.solution.forEach((step) => {
                if (step.description.toLowerCase().includes(queryLower)) {
                    score += 3;
                }
            });

            // Category match
            if (entry.category.toLowerCase().includes(queryLower)) {
                score += 2;
            }

            return { entry, score };
        });

        // Filter out zero scores and sort by score
        return scored
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((item) => item.entry);
    }

    /**
     * Get analytics data
     */
    async getAnalytics(): Promise<{
        totalEntries: number;
        byCategory: Record<string, number>;
        byPriority: Record<string, number>;
        mostUsed: KnowledgeBaseEntry[];
        mostEffective: KnowledgeBaseEntry[];
    }> {
        return await this.kbRepository.getAnalytics();
    }
}
