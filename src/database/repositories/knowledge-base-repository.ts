/**
 * Knowledge Base Repository
 * Handles PostgreSQL operations for knowledge base metadata
 * (Embeddings are stored separately in Qdrant)
 */

import PostgresClient from '../postgres-client.js';
import type { KnowledgeBaseEntry } from '../../knowledge-base/types.js';

export class KnowledgeBaseRepository {
    private db: typeof PostgresClient;

    constructor() {
        this.db = PostgresClient;
    }

    /**
     * Create a new knowledge base entry
     */
    async create(entry: KnowledgeBaseEntry): Promise<KnowledgeBaseEntry> {
        const query = `
            INSERT INTO knowledge_base (
                id, problem, solution, category, tags, priority,
                created_by, usage_count, effectiveness, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            entry.id,
            entry.problem,
            JSON.stringify(entry.solution),
            entry.category,
            entry.tags,
            entry.priority,
            entry.createdBy,
            entry.usageCount,
            entry.effectiveness,
            entry.createdAt,
            entry.updatedAt
        ];

        const result = await this.db.query<any>(query, values);
        return this.mapToKBEntry(result.rows[0]);
    }

    /**
     * Find entry by ID
     */
    async findById(id: string): Promise<KnowledgeBaseEntry | null> {
        const query = 'SELECT * FROM knowledge_base WHERE id = $1';
        const result = await this.db.query<any>(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToKBEntry(result.rows[0]);
    }

    /**
     * Get all entries with optional filters
     */
    async findAll(filters?: {
        category?: string;
        tags?: string[];
        priority?: string;
        searchQuery?: string;
    }): Promise<KnowledgeBaseEntry[]> {
        let query = 'SELECT * FROM knowledge_base WHERE 1=1';
        const values: any[] = [];
        let paramCount = 1;

        if (filters?.category) {
            query += ` AND category = $${paramCount++}`;
            values.push(filters.category);
        }

        if (filters?.tags && filters.tags.length > 0) {
            query += ` AND tags && $${paramCount++}`;
            values.push(filters.tags);
        }

        if (filters?.priority) {
            query += ` AND priority = $${paramCount++}`;
            values.push(filters.priority);
        }

        if (filters?.searchQuery) {
            query += ` AND (problem ILIKE $${paramCount} OR $${paramCount}::text = ANY(tags))`;
            values.push(`%${filters.searchQuery}%`);
            paramCount++;
        }

        query += ' ORDER BY created_at DESC';

        const result = await this.db.query<any>(query, values);
        return result.rows.map(row => this.mapToKBEntry(row));
    }

    /**
     * Update entry
     */
    async update(id: string, entry: Partial<KnowledgeBaseEntry>): Promise<KnowledgeBaseEntry | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (entry.problem !== undefined) {
            fields.push(`problem = $${paramCount++}`);
            values.push(entry.problem);
        }
        if (entry.solution !== undefined) {
            fields.push(`solution = $${paramCount++}`);
            values.push(JSON.stringify(entry.solution));
        }
        if (entry.category !== undefined) {
            fields.push(`category = $${paramCount++}`);
            values.push(entry.category);
        }
        if (entry.tags !== undefined) {
            fields.push(`tags = $${paramCount++}`);
            values.push(entry.tags);
        }
        if (entry.priority !== undefined) {
            fields.push(`priority = $${paramCount++}`);
            values.push(entry.priority);
        }
        if (entry.usageCount !== undefined) {
            fields.push(`usage_count = $${paramCount++}`);
            values.push(entry.usageCount);
        }
        if (entry.effectiveness !== undefined) {
            fields.push(`effectiveness = $${paramCount++}`);
            values.push(entry.effectiveness);
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE knowledge_base 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await this.db.query<any>(query, values);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToKBEntry(result.rows[0]);
    }

    /**
     * Delete entry
     */
    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM knowledge_base WHERE id = $1';
        const result = await this.db.query(query, [id]);

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Increment usage count
     */
    async incrementUsage(id: string): Promise<void> {
        const query = `
            UPDATE knowledge_base 
            SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;
        await this.db.query(query, [id]);
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
        // Total count
        const totalResult = await this.db.query<{ count: string }>('SELECT COUNT(*) as count FROM knowledge_base');
        const totalEntries = parseInt(totalResult.rows[0].count);

        // By category
        const categoryResult = await this.db.query<{ category: string; count: string }>(
            'SELECT category, COUNT(*) as count FROM knowledge_base GROUP BY category'
        );
        const byCategory: Record<string, number> = {};
        categoryResult.rows.forEach(row => {
            byCategory[row.category] = parseInt(row.count);
        });

        // By priority
        const priorityResult = await this.db.query<{ priority: string; count: string }>(
            'SELECT priority, COUNT(*) as count FROM knowledge_base GROUP BY priority'
        );
        const byPriority: Record<string, number> = {};
        priorityResult.rows.forEach(row => {
            byPriority[row.priority] = parseInt(row.count);
        });

        // Most used
        const mostUsedResult = await this.db.query<any>(
            'SELECT * FROM knowledge_base ORDER BY usage_count DESC LIMIT 10'
        );
        const mostUsed = mostUsedResult.rows.map(row => this.mapToKBEntry(row));

        // Most effective
        const mostEffectiveResult = await this.db.query<any>(
            'SELECT * FROM knowledge_base WHERE effectiveness > 0 ORDER BY effectiveness DESC LIMIT 10'
        );
        const mostEffective = mostEffectiveResult.rows.map(row => this.mapToKBEntry(row));

        return {
            totalEntries,
            byCategory,
            byPriority,
            mostUsed,
            mostEffective
        };
    }

    /**
     * Map database row to KnowledgeBaseEntry
     */
    private mapToKBEntry(row: any): KnowledgeBaseEntry {
        return {
            id: row.id,
            problem: row.problem,
            solution: typeof row.solution === 'string' ? JSON.parse(row.solution) : row.solution,
            category: row.category,
            tags: row.tags,
            priority: row.priority,
            createdBy: row.created_by,
            usageCount: row.usage_count,
            effectiveness: parseFloat(row.effectiveness),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
