/**
 * Processed Tickets Repository
 * Handles caching of processed ServiceNow tickets to avoid duplicate processing
 */

import PostgresClient from '../postgres-client.js';

export interface ProcessedTicket {
    id?: string;
    ticketSysId: string;
    ticketNumber: string;
    processedAt?: Date;
    solutionProvided?: string;
    confidenceScore?: number;
}

export class ProcessedTicketsRepository {
    private db: typeof PostgresClient;

    constructor() {
        this.db = PostgresClient;
    }

    /**
     * Add a processed ticket
     */
    async create(ticket: ProcessedTicket): Promise<ProcessedTicket> {
        const query = `
            INSERT INTO processed_tickets (ticket_sys_id, ticket_number, solution_provided, confidence_score)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (ticket_sys_id) DO NOTHING
            RETURNING *
        `;

        const values = [
            ticket.ticketSysId,
            ticket.ticketNumber,
            ticket.solutionProvided || null,
            ticket.confidenceScore || null
        ];

        const result = await this.db.query<any>(query, values);

        if (result.rows.length === 0) {
            // Already exists, return existing
            return this.findBySysId(ticket.ticketSysId) as Promise<ProcessedTicket>;
        }

        return this.mapToProcessedTicket(result.rows[0]);
    }

    /**
     * Check if ticket has been processed
     */
    async isProcessed(ticketSysId: string): Promise<boolean> {
        const query = 'SELECT COUNT(*) as count FROM processed_tickets WHERE ticket_sys_id = $1';
        const result = await this.db.query<{ count: string }>(query, [ticketSysId]);

        return parseInt(result.rows[0].count) > 0;
    }

    /**
     * Find processed ticket by sys_id
     */
    async findBySysId(ticketSysId: string): Promise<ProcessedTicket | null> {
        const query = 'SELECT * FROM processed_tickets WHERE ticket_sys_id = $1';
        const result = await this.db.query<any>(query, [ticketSysId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToProcessedTicket(result.rows[0]);
    }

    /**
     * Get all processed tickets
     */
    async findAll(limit: number = 100): Promise<ProcessedTicket[]> {
        const query = 'SELECT * FROM processed_tickets ORDER BY processed_at DESC LIMIT $1';
        const result = await this.db.query<any>(query, [limit]);

        return result.rows.map(row => this.mapToProcessedTicket(row));
    }

    /**
     * Get processed tickets count
     */
    async count(): Promise<number> {
        const query = 'SELECT COUNT(*) as count FROM processed_tickets';
        const result = await this.db.query<{ count: string }>(query);

        return parseInt(result.rows[0].count);
    }

    /**
     * Clear all processed tickets (for testing/reset)
     */
    async clear(): Promise<void> {
        const query = 'DELETE FROM processed_tickets';
        await this.db.query(query);
    }

    /**
     * Delete old processed tickets (older than specified days)
     */
    async deleteOlderThan(days: number): Promise<number> {
        const query = `
            DELETE FROM processed_tickets 
            WHERE processed_at < NOW() - INTERVAL '${days} days'
        `;
        const result = await this.db.query(query);

        return result.rowCount ?? 0;
    }

    /**
     * Map database row to ProcessedTicket
     */
    private mapToProcessedTicket(row: any): ProcessedTicket {
        return {
            id: row.id,
            ticketSysId: row.ticket_sys_id,
            ticketNumber: row.ticket_number,
            processedAt: row.processed_at,
            solutionProvided: row.solution_provided,
            confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : undefined
        };
    }
}
