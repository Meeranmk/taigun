import type { VectorDB } from './vector-db.js';
import type { KnowledgeBaseStorage } from '../knowledge-base/storage.js';
import type { KnowledgeBaseEntry } from '../knowledge-base/types.js';

export interface BatchEmbedderConfig {
    batchSize?: number;
    onProgress?: (current: number, total: number) => void;
}

/**
 * Utility for batch embedding operations
 */
export class BatchEmbedder {
    private vectorDB: VectorDB;
    private knowledgeBase: KnowledgeBaseStorage;
    private embedFunction: (text: string) => Promise<number[]>;
    private config: BatchEmbedderConfig;

    constructor(
        vectorDB: VectorDB,
        knowledgeBase: KnowledgeBaseStorage,
        embedFunction: (text: string) => Promise<number[]>,
        config?: BatchEmbedderConfig
    ) {
        this.vectorDB = vectorDB;
        this.knowledgeBase = knowledgeBase;
        this.embedFunction = embedFunction;
        this.config = {
            batchSize: config?.batchSize || 50,
            onProgress: config?.onProgress,
        };
    }

    /**
     * Embed all knowledge base entries that aren't already in vector DB
     */
    async embedKnowledgeBase(): Promise<void> {
        console.log('📦 Checking knowledge base for unembed entries...');

        const allEntries = await this.knowledgeBase.getEntries();
        const entriesToEmbed: KnowledgeBaseEntry[] = [];

        // Check which entries need embedding
        for (const entry of allEntries.data) {
            const exists = await this.vectorDB.hasKBEntry(entry.id);
            if (!exists) {
                entriesToEmbed.push(entry);
            }
        }

        if (entriesToEmbed.length === 0) {
            console.log('✅ All knowledge base entries already embedded');
            return;
        }

        console.log(`📦 Embedding ${entriesToEmbed.length} knowledge base entries...`);

        // Process in batches
        for (let i = 0; i < entriesToEmbed.length; i += this.config.batchSize!) {
            const batch = entriesToEmbed.slice(i, i + this.config.batchSize!);
            await this.processBatch(batch);

            if (this.config.onProgress) {
                this.config.onProgress(
                    Math.min(i + this.config.batchSize!, entriesToEmbed.length),
                    entriesToEmbed.length
                );
            }
        }

        console.log(`✅ Successfully embedded ${entriesToEmbed.length} entries`);
    }

    /**
     * Process a batch of entries
     */
    private async processBatch(entries: KnowledgeBaseEntry[]): Promise<void> {
        const embeddedEntries = [];

        for (const entry of entries) {
            try {
                // Generate embedding for the problem text
                const embedding = await this.embedFunction(entry.problem);

                embeddedEntries.push({
                    entry,
                    embedding,
                });
            } catch (error) {
                console.error(`Failed to embed entry ${entry.id}:`, error);
            }
        }

        // Add batch to vector DB
        for (const { entry, embedding } of embeddedEntries) {
            try {
                await this.vectorDB.addKBEntry(entry, embedding);
            } catch (error) {
                console.error(`Failed to add entry ${entry.id} to vector DB:`, error);
            }
        }

        if (embeddedEntries.length > 0) {
            console.log(`   ✓ Embedded batch of ${embeddedEntries.length} entries`);
        }
    }

    /**
     * Re-embed a single entry (for updates)
     */
    async reEmbedEntry(entry: KnowledgeBaseEntry): Promise<void> {
        try {
            const embedding = await this.embedFunction(entry.problem);

            await this.vectorDB.updateKBEntry(entry, embedding);

            console.log(`✓ Re-embedded entry ${entry.id}`);
        } catch (error) {
            console.error(`Failed to re-embed entry ${entry.id}:`, error);
            throw error;
        }
    }

    /**
     * Embed a ServiceNow ticket
     */
    async embedTicket(ticket: any): Promise<void> {
        try {
            const text = ticket.description || ticket.short_description;
            if (!text) {
                console.warn(`Ticket ${ticket.sys_id} has no description, skipping embedding`);
                return;
            }

            const embedding = await this.embedFunction(text);

            await this.vectorDB.addTicket(ticket.sys_id, text, embedding, {
                number: ticket.number,
                short_description: ticket.short_description,
                state: ticket.state,
                priority: ticket.priority,
                close_notes: ticket.close_notes,
                created_on: ticket.sys_created_on,
            });

            console.log(`   ✓ Embedded ticket ${ticket.number}`);
        } catch (error) {
            console.error(`Failed to embed ticket ${ticket.sys_id}:`, error);
        }
    }
}
