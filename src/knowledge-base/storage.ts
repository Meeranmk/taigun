import { v4 as uuidv4 } from 'uuid';
import type {
    KnowledgeBaseEntry,
    KnowledgeBaseFilters,
    PaginationOptions,
    PaginatedResult,
} from './types.js';
import type { VectorDB } from '../rag/vector-db.js';

export class KnowledgeBaseStorage {
    private vectorDB: VectorDB;
    private embedFunction: (text: string) => Promise<number[]>;

    constructor(vectorDB: VectorDB, embedFunction: (text: string) => Promise<number[]>) {
        this.vectorDB = vectorDB;
        this.embedFunction = embedFunction;
    }

    /**
     * Initialize storage - no-op for ChromaDB (handled by VectorDB)
     */
    async initialize(): Promise<void> {
        // ChromaDB initialization is handled by VectorDB.initialize()
        console.log('✅ Knowledge Base Storage initialized (ChromaDB)');
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

        // Generate embedding and store in ChromaDB
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
        // Get all entries from ChromaDB
        let allEntries = await this.vectorDB.getAllKBEntries();

        // Apply filters
        if (filters) {
            if (filters.category) {
                allEntries = allEntries.filter((e) => e.category === filters.category);
            }
            if (filters.tags && filters.tags.length > 0) {
                allEntries = allEntries.filter((e) =>
                    filters.tags!.some((tag) => e.tags.includes(tag))
                );
            }
            if (filters.priority) {
                allEntries = allEntries.filter((e) => e.priority === filters.priority);
            }
            if (filters.searchQuery) {
                const query = filters.searchQuery.toLowerCase();
                allEntries = allEntries.filter(
                    (e) =>
                        e.problem.toLowerCase().includes(query) ||
                        e.tags.some((tag) => tag.toLowerCase().includes(query)) ||
                        e.solution.some((step) =>
                            step.description.toLowerCase().includes(query)
                        )
                );
            }
        }

        // Sort by most recent first
        allEntries.sort((a, b) => {
            const aTime = new Date(b.updatedAt).getTime();
            const bTime = new Date(a.updatedAt).getTime();
            return aTime - bTime;
        });

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
        return await this.vectorDB.getKBEntryById(id);
    }

    /**
     * Update an existing entry
     */
    async updateEntry(
        id: string,
        updates: Partial<Omit<KnowledgeBaseEntry, 'id' | 'createdAt' | 'usageCount'>>
    ): Promise<KnowledgeBaseEntry | null> {
        const existing = await this.vectorDB.getKBEntryById(id);
        if (!existing) return null;

        const updatedEntry: KnowledgeBaseEntry = {
            ...existing,
            ...updates,
            id: existing.id, // Preserve ID
            createdAt: existing.createdAt, // Preserve creation date
            usageCount: existing.usageCount, // Preserve usage count
            updatedAt: new Date(),
        };

        // Re-generate embedding if problem changed
        const embedding = updates.problem
            ? await this.embedFunction(updates.problem)
            : await this.embedFunction(existing.problem);

        await this.vectorDB.updateKBEntry(updatedEntry, embedding);
        return updatedEntry;
    }

    /**
     * Delete an entry
     */
    async deleteEntry(id: string): Promise<boolean> {
        try {
            await this.vectorDB.deleteKBEntry(id);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Increment usage count for an entry
     */
    async incrementUsage(id: string): Promise<void> {
        const entry = await this.vectorDB.getKBEntryById(id);
        if (entry) {
            entry.usageCount++;
            entry.updatedAt = new Date();

            // Re-embed with updated metadata
            const embedding = await this.embedFunction(entry.problem);
            await this.vectorDB.updateKBEntry(entry, embedding);
        }
    }

    /**
     * Search entries by text similarity (simple text matching for now)
     */
    async searchEntries(query: string, limit: number = 5): Promise<KnowledgeBaseEntry[]> {
        const allEntries = await this.vectorDB.getAllKBEntries();
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
        const allEntries = await this.vectorDB.getAllKBEntries();

        const byCategory: Record<string, number> = {};
        const byPriority: Record<string, number> = {};

        allEntries.forEach((entry) => {
            byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
            byPriority[entry.priority] = (byPriority[entry.priority] || 0) + 1;
        });

        const mostUsed = [...allEntries]
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 10);

        const mostEffective = [...allEntries]
            .filter((e) => e.effectiveness > 0)
            .sort((a, b) => b.effectiveness - a.effectiveness)
            .slice(0, 10);

        return {
            totalEntries: allEntries.length,
            byCategory,
            byPriority,
            mostUsed,
            mostEffective,
        };
    }
}
