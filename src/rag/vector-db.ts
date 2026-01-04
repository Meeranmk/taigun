import { QdrantClient } from '@qdrant/js-client-rest';
import { v5 as uuidv5 } from 'uuid';
import type { KnowledgeBaseEntry, SolutionStep } from '../knowledge-base/types.js';
import type { User, Team } from '../auth/types.js';

// Namespace for generating deterministic UUIDs from string IDs
const QDRANT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Convert a string ID to a valid Qdrant point ID (UUID)
 * Uses UUID v5 to generate deterministic UUIDs from string IDs
 */
function toQdrantId(id: string): string {
    // If it's already a valid UUID format, return as-is
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return id;
    }
    // Generate a deterministic UUID from the string
    return uuidv5(id, QDRANT_NAMESPACE);
}

export interface VectorDBConfig {
    url?: string;
    apiKey?: string;
    collectionPrefix?: string;
}

export interface DocumentMetadata {
    source: 'knowledge-base' | 'servicenow';
    id: string;
    category?: string;
    tags?: string[];
    priority?: string;
    [key: string]: any;
}

export interface QueryResult {
    id: string;
    document: string;
    metadata: DocumentMetadata;
    distance: number;
    similarity: number;
}

/**
 * Vector Database wrapper for Qdrant Cloud
 * Handles embedding storage and similarity search
 */
export class VectorDB {
    private client: QdrantClient | null = null;
    private config: VectorDBConfig;
    private collectionPrefix: string;

    // Collection names
    private readonly KB_COLLECTION = 'knowledge_base';
    private readonly TICKET_COLLECTION = 'servicenow_tickets';
    private readonly PROCESSED_TICKETS_COLLECTION = 'processed_tickets';
    private readonly USERS_COLLECTION = 'users';
    private readonly TEAMS_COLLECTION = 'teams';
    private readonly SETTINGS_COLLECTION = 'app_settings';

    constructor(config?: VectorDBConfig) {
        this.config = {
            url: config?.url || process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: config?.apiKey || process.env.QDRANT_API_KEY,
            collectionPrefix: config?.collectionPrefix || process.env.QDRANT_COLLECTION_PREFIX || '',
        };
        this.collectionPrefix = this.config.collectionPrefix || '';
    }

    /**
     * Get full collection name with prefix
     */
    private getCollectionName(baseName: string): string {
        return this.collectionPrefix ? `${this.collectionPrefix}_${baseName}` : baseName;
    }

    /**
     * Initialize Qdrant client and collections
     */
    async initialize(): Promise<void> {
        try {
            console.log('🔧 Initializing Qdrant Cloud...');

            // Initialize Qdrant client
            this.client = new QdrantClient({
                url: this.config.url,
                apiKey: this.config.apiKey,
            });

            console.log(`   Connecting to Qdrant at ${this.config.url}...`);

            // Test connection
            await this.client.getCollections();

            // Create or verify collections
            await this.createCollectionIfNotExists(this.KB_COLLECTION, 1536, 'Knowledge base entries with embeddings');
            await this.createCollectionIfNotExists(this.TICKET_COLLECTION, 1536, 'Historical ServiceNow tickets with embeddings');
            await this.createCollectionIfNotExists(this.PROCESSED_TICKETS_COLLECTION, 1, 'Processed ServiceNow tickets tracking');
            await this.createCollectionIfNotExists(this.USERS_COLLECTION, 1, 'User accounts for multi-tenant access');
            await this.createCollectionIfNotExists(this.TEAMS_COLLECTION, 1, 'Team configurations and ServiceNow credentials');
            await this.createCollectionIfNotExists(this.SETTINGS_COLLECTION, 1, 'Application settings and configuration');

            // Create payload indexes for filtering
            await this.createPayloadIndex(this.USERS_COLLECTION, 'username', 'keyword');
            await this.createPayloadIndex(this.TEAMS_COLLECTION, 'name', 'keyword');

            // Get collection counts
            const kbCount = await this.getCollectionCount(this.KB_COLLECTION);
            const ticketCount = await this.getCollectionCount(this.TICKET_COLLECTION);
            const processedCount = await this.getCollectionCount(this.PROCESSED_TICKETS_COLLECTION);

            console.log(`✅ Qdrant Cloud initialized`);
            console.log(`   Knowledge Base: ${kbCount} entries`);
            console.log(`   ServiceNow Tickets: ${ticketCount} entries`);
            console.log(`   Processed Tickets: ${processedCount} tracked`);
        } catch (error) {
            console.error('❌ Failed to initialize Qdrant Cloud:', error);
            throw error;
        }
    }

    /**
     * Create a collection if it doesn't exist
     */
    private async createCollectionIfNotExists(
        baseName: string,
        vectorSize: number,
        description: string
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant client not initialized');
        }

        const collectionName = this.getCollectionName(baseName);

        try {
            // Check if collection exists
            await this.client.getCollection(collectionName);
        } catch {
            // Collection doesn't exist, create it
            await this.client.createCollection(collectionName, {
                vectors: {
                    size: vectorSize,
                    distance: 'Cosine',
                },
            });
            console.log(`   Created collection: ${collectionName} (${description})`);
        }
    }

    /**
     * Get collection count
     */
    private async getCollectionCount(baseName: string): Promise<number> {
        if (!this.client) {
            throw new Error('Qdrant client not initialized');
        }

        try {
            const collectionName = this.getCollectionName(baseName);
            const info = await this.client.getCollection(collectionName);
            return info.points_count || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Create payload index for filtering
     */
    private async createPayloadIndex(
        baseName: string,
        fieldName: string,
        schemaType: 'keyword' | 'integer' | 'float' | 'bool'
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant client not initialized');
        }

        try {
            const collectionName = this.getCollectionName(baseName);
            await this.client.createPayloadIndex(collectionName, {
                field_name: fieldName,
                field_schema: schemaType,
            });
            console.log(`   Created index on ${collectionName}.${fieldName}`);
        } catch (error: any) {
            // Index might already exist, which is fine
            if (!error.message?.includes('already exists')) {
                console.warn(`   Index on ${baseName}.${fieldName} might already exist`);
            }
        }
    }

    /**
     * Add a complete KB entry with embedding to knowledge base collection
     */
    async addKBEntry(
        entry: KnowledgeBaseEntry,
        embedding: number[]
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.KB_COLLECTION);

        await this.client.upsert(collectionName, {
            points: [
                {
                    id: entry.id,
                    vector: embedding,
                    payload: {
                        source: 'knowledge-base',
                        id: entry.id,
                        problem: entry.problem,
                        solution: entry.solution,
                        category: entry.category,
                        tags: entry.tags,
                        priority: entry.priority,
                        usageCount: entry.usageCount || 0,
                        createdBy: entry.createdBy || 'system',
                        createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
                        updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : (entry.updatedAt || entry.createdAt),
                        effectiveness: entry.effectiveness || 0,
                    },
                },
            ],
        });
    }

    /**
     * Add multiple KB entries in batch
     */
    async addKBEntriesBatch(
        entries: Array<{
            id: string;
            text: string;
            embedding: number[];
            metadata: Partial<DocumentMetadata>;
        }>
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        if (entries.length === 0) return;

        const collectionName = this.getCollectionName(this.KB_COLLECTION);

        const points = entries.map((e) => ({
            id: e.id,
            vector: e.embedding,
            payload: {
                ...e.metadata,
                source: 'knowledge-base',
                id: e.id,
                text: e.text,
            },
        }));

        await this.client.upsert(collectionName, {
            points,
        });
    }

    /**
     * Update a complete KB entry
     */
    async updateKBEntry(
        entry: KnowledgeBaseEntry,
        embedding: number[]
    ): Promise<void> {
        // Qdrant's upsert handles both insert and update
        await this.addKBEntry(entry, embedding);
    }

    /**
     * Delete a KB entry
     */
    async deleteKBEntry(id: string): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.KB_COLLECTION);

        await this.client.delete(collectionName, {
            points: [id],
        });
    }

    /**
     * Query knowledge base for similar entries and return full KB entries with similarity
     */
    async queryKB(embedding: number[], limit: number = 5): Promise<Array<KnowledgeBaseEntry & { similarity: number }>> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.KB_COLLECTION);

        const results = await this.client.search(collectionName, {
            vector: embedding,
            limit,
            with_payload: true,
        });

        return results.map((result) => {
            const payload = result.payload as any;
            return {
                id: payload.id,
                problem: payload.problem,
                solution: payload.solution as SolutionStep[],
                category: payload.category,
                tags: payload.tags || [],
                priority: payload.priority,
                usageCount: payload.usageCount || 0,
                createdBy: payload.createdBy || 'system',
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt || payload.createdAt,
                effectiveness: payload.effectiveness || 0,
                similarity: result.score,
            };
        });
    }

    /**
     * Get all KB entries from Qdrant
     */
    async getAllKBEntries(): Promise<KnowledgeBaseEntry[]> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.KB_COLLECTION);

        const results = await this.client.scroll(collectionName, {
            limit: 1000,
            with_payload: true,
            with_vector: false,
        });

        return results.points.map((point) => {
            const payload = point.payload as any;
            return {
                id: payload.id,
                problem: payload.problem,
                solution: payload.solution as SolutionStep[],
                category: payload.category,
                tags: payload.tags || [],
                priority: payload.priority,
                usageCount: payload.usageCount || 0,
                createdBy: payload.createdBy || 'system',
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt || payload.createdAt,
                effectiveness: payload.effectiveness || 0,
            };
        });
    }

    /**
     * Get a single KB entry by ID
     */
    async getKBEntryById(id: string): Promise<KnowledgeBaseEntry | null> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.KB_COLLECTION);
            const result = await this.client.retrieve(collectionName, {
                ids: [id],
                with_payload: true,
            });

            if (result.length === 0) {
                return null;
            }

            const payload = result[0].payload as any;
            return {
                id: payload.id,
                problem: payload.problem,
                solution: payload.solution as SolutionStep[],
                category: payload.category,
                tags: payload.tags || [],
                priority: payload.priority,
                usageCount: payload.usageCount || 0,
                createdBy: payload.createdBy || 'system',
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt || payload.createdAt,
                effectiveness: payload.effectiveness || 0,
            };
        } catch {
            return null;
        }
    }

    /**
     * Add a ServiceNow ticket with embedding
     */
    async addTicket(
        id: string,
        text: string,
        embedding: number[],
        metadata: Partial<DocumentMetadata>
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.TICKET_COLLECTION);

        await this.client.upsert(collectionName, {
            points: [
                {
                    id,
                    vector: embedding,
                    payload: {
                        ...metadata,
                        source: 'servicenow',
                        id,
                        text,
                    },
                },
            ],
        });
    }

    /**
     * Query ServiceNow tickets for similar entries
     */
    async queryTickets(embedding: number[], limit: number = 5): Promise<QueryResult[]> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.TICKET_COLLECTION);

        const results = await this.client.search(collectionName, {
            vector: embedding,
            limit,
            with_payload: true,
        });

        return results.map((result) => ({
            id: result.id as string,
            document: (result.payload as any).text || '',
            metadata: result.payload as DocumentMetadata,
            distance: 1 - result.score, // Convert score to distance
            similarity: result.score,
        }));
    }

    /**
     * Check if a KB entry exists
     */
    async hasKBEntry(id: string): Promise<boolean> {
        const entry = await this.getKBEntryById(id);
        return entry !== null;
    }

    /**
     * Get KB collection count
     */
    async getKBCount(): Promise<number> {
        return await this.getCollectionCount(this.KB_COLLECTION);
    }

    /**
     * Get ticket collection count
     */
    async getTicketCount(): Promise<number> {
        return await this.getCollectionCount(this.TICKET_COLLECTION);
    }

    /**
     * Mark a ticket as processed with metadata
     */
    async markTicketAsProcessed(
        ticketId: string,
        metadata: {
            processedAt: string;
            confidence?: number;
            solutionUsed?: string;
            problem?: string;
        }
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.PROCESSED_TICKETS_COLLECTION);

        await this.client.upsert(collectionName, {
            points: [
                {
                    id: ticketId,
                    vector: [0], // Dummy vector
                    payload: {
                        processedAt: metadata.processedAt,
                        confidence: metadata.confidence || 0,
                        solutionUsed: metadata.solutionUsed || 'unknown',
                        problem: metadata.problem || 'Processed ticket',
                    },
                },
            ],
        });
    }

    /**
     * Check if a ticket has been processed
     */
    async isTicketProcessed(ticketId: string): Promise<boolean> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.PROCESSED_TICKETS_COLLECTION);
            const result = await this.client.retrieve(collectionName, {
                ids: [ticketId],
            });
            return result.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Get all processed ticket IDs
     */
    async getAllProcessedTicketIds(): Promise<string[]> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.PROCESSED_TICKETS_COLLECTION);

        const results = await this.client.scroll(collectionName, {
            limit: 10000,
            with_payload: false,
            with_vector: false,
        });

        return results.points.map((point) => point.id as string);
    }

    /**
     * Clear all processed tickets
     */
    async clearProcessedTickets(): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.PROCESSED_TICKETS_COLLECTION);

        // Delete and recreate collection
        try {
            await this.client.deleteCollection(collectionName);
        } catch {
            // Collection might not exist
        }

        await this.createCollectionIfNotExists(this.PROCESSED_TICKETS_COLLECTION, 1, 'Processed ServiceNow tickets tracking');
    }

    /**
     * Get application settings
     */
    async getSettings(settingsId: string): Promise<any | null> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.SETTINGS_COLLECTION);
            const result = await this.client.retrieve(collectionName, {
                ids: [toQdrantId(settingsId)],
                with_payload: true,
            });

            if (result.length === 0) {
                return null;
            }

            return {
                id: settingsId,
                ...result[0].payload,
            };
        } catch {
            return null;
        }
    }

    /**
     * Save application settings
     */
    async saveSettings(settings: any): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.SETTINGS_COLLECTION);

        await this.client.upsert(collectionName, {
            points: [
                {
                    id: toQdrantId(settings.id),
                    vector: [0], // Dummy vector
                    payload: settings,
                },
            ],
        });
    }

    /**
     * Clear all collections (for testing)
     */
    async clearAll(): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collections = [
            this.KB_COLLECTION,
            this.TICKET_COLLECTION,
            this.PROCESSED_TICKETS_COLLECTION,
        ];

        for (const baseName of collections) {
            const collectionName = this.getCollectionName(baseName);
            try {
                await this.client.deleteCollection(collectionName);
            } catch {
                // Collection might not exist
            }
        }

        await this.initialize();
    }

    // ==========================================
    // USER MANAGEMENT METHODS
    // ==========================================

    async addUser(user: User): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.USERS_COLLECTION);

        await this.client.upsert(collectionName, {
            points: [
                {
                    id: toQdrantId(user.id),
                    vector: [0], // Dummy vector
                    payload: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        passwordHash: user.passwordHash,
                        teamId: user.teamId,
                        role: user.role,
                        createdAt: user.createdAt,
                        updatedAt: user.updatedAt,
                    },
                },
            ],
        });
    }

    async getUserById(userId: string): Promise<User | null> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.USERS_COLLECTION);
            const result = await this.client.retrieve(collectionName, {
                ids: [toQdrantId(userId)],
                with_payload: true,
            });

            if (result.length === 0) {
                return null;
            }

            const payload = result[0].payload as any;
            return {
                id: payload.id,
                username: payload.username,
                email: payload.email,
                passwordHash: payload.passwordHash,
                teamId: payload.teamId,
                role: payload.role,
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt,
            };
        } catch {
            return null;
        }
    }

    async getUserByUsername(username: string): Promise<User | null> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.USERS_COLLECTION);
            console.log('🔍 Looking for user:', username, 'in collection:', collectionName);

            const result = await this.client.scroll(collectionName, {
                filter: {
                    must: [
                        {
                            key: 'username',
                            match: { value: username },
                        },
                    ],
                },
                limit: 1,
                with_payload: true,
            });

            console.log('📊 Qdrant scroll result:', {
                pointsFound: result.points.length,
                points: result.points.map(p => ({ id: p.id, username: (p.payload as any)?.username }))
            });

            if (result.points.length === 0) {
                return null;
            }

            const point = result.points[0];
            const payload = point.payload as any;
            return {
                id: payload.id,
                username: payload.username,
                email: payload.email,
                passwordHash: payload.passwordHash,
                teamId: payload.teamId,
                role: payload.role,
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt,
            };
        } catch (error) {
            console.error('❌ Error in getUserByUsername:', error);
            return null;
        }
    }

    async getUsersByTeam(teamId: string): Promise<User[]> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.USERS_COLLECTION);

        const result = await this.client.scroll(collectionName, {
            filter: {
                must: [
                    {
                        key: 'teamId',
                        match: { value: teamId },
                    },
                ],
            },
            limit: 1000,
            with_payload: true,
        });

        return result.points.map((point) => {
            const payload = point.payload as any;
            return {
                id: payload.id,
                username: payload.username,
                email: payload.email,
                passwordHash: payload.passwordHash,
                teamId: payload.teamId,
                role: payload.role,
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt,
            };
        });
    }

    async getAllUsers(): Promise<User[]> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.USERS_COLLECTION);

        const result = await this.client.scroll(collectionName, {
            limit: 1000,
            with_payload: true,
        });

        return result.points.map((point) => {
            const payload = point.payload as any;
            return {
                id: payload.id,
                username: payload.username,
                email: payload.email,
                passwordHash: payload.passwordHash,
                teamId: payload.teamId,
                role: payload.role,
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt,
            };
        });
    }

    async updateUser(user: User): Promise<void> {
        // Qdrant's upsert handles both insert and update
        await this.addUser(user);
    }

    async deleteUser(userId: string): Promise<boolean> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.USERS_COLLECTION);
            await this.client.delete(collectionName, {
                points: [toQdrantId(userId)],
            });
            return true;
        } catch {
            return false;
        }
    }

    // ==========================================
    // TEAM MANAGEMENT METHODS
    // ==========================================

    async addTeam(team: Team): Promise<void> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.TEAMS_COLLECTION);

        await this.client.upsert(collectionName, {
            points: [
                {
                    id: toQdrantId(team.id),
                    vector: [0], // Dummy vector
                    payload: {
                        id: team.id,
                        name: team.name,
                        serviceNowUrl: team.serviceNowUrl,
                        serviceNowUsername: team.serviceNowUsername,
                        serviceNowPasswordEncrypted: team.serviceNowPasswordEncrypted,
                        settings: team.settings,
                        createdAt: team.createdAt,
                        updatedAt: team.updatedAt,
                    },
                },
            ],
        });
    }

    async getTeamById(teamId: string): Promise<Team | null> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.TEAMS_COLLECTION);
            const result = await this.client.retrieve(collectionName, {
                ids: [toQdrantId(teamId)],
                with_payload: true,
            });

            if (result.length === 0) {
                return null;
            }

            const payload = result[0].payload as any;
            return {
                id: payload.id,
                name: payload.name,
                serviceNowUrl: payload.serviceNowUrl,
                serviceNowUsername: payload.serviceNowUsername,
                serviceNowPasswordEncrypted: payload.serviceNowPasswordEncrypted,
                settings: payload.settings,
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt,
            };
        } catch {
            return null;
        }
    }

    async getAllTeams(): Promise<Team[]> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        const collectionName = this.getCollectionName(this.TEAMS_COLLECTION);

        const result = await this.client.scroll(collectionName, {
            limit: 1000,
            with_payload: true,
        });

        return result.points.map((point) => {
            const payload = point.payload as any;
            return {
                id: payload.id,
                name: payload.name,
                serviceNowUrl: payload.serviceNowUrl,
                serviceNowUsername: payload.serviceNowUsername,
                serviceNowPasswordEncrypted: payload.serviceNowPasswordEncrypted,
                settings: payload.settings,
                createdAt: payload.createdAt,
                updatedAt: payload.updatedAt,
            };
        });
    }

    async updateTeam(team: Team): Promise<void> {
        // Qdrant's upsert handles both insert and update
        await this.addTeam(team);
    }

    async deleteTeam(teamId: string): Promise<boolean> {
        if (!this.client) {
            throw new Error('Qdrant not initialized. Call initialize() first.');
        }

        try {
            const collectionName = this.getCollectionName(this.TEAMS_COLLECTION);
            await this.client.delete(collectionName, {
                points: [toQdrantId(teamId)],
            });
            return true;
        } catch {
            return false;
        }
    }
}
