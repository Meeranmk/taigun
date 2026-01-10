/**
 * Team Repository
 * Handles all database operations for teams
 */

import PostgresClient from '../postgres-client.js';
import type { Team, CreateTeamInput } from '../../auth/types.js';

export class TeamRepository {
    private db: typeof PostgresClient;

    constructor() {
        this.db = PostgresClient;
    }

    /**
     * Create a new team
     */
    async create(team: Team): Promise<Team> {
        const query = `
            INSERT INTO teams (
                id, name, servicenow_url, servicenow_username, 
                servicenow_password_encrypted, ticket_check_interval, 
                enable_ticket_monitor, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            team.id,
            team.name,
            team.serviceNowUrl,
            team.serviceNowUsername,
            team.serviceNowPasswordEncrypted,
            team.settings.ticketCheckInterval,
            team.settings.enableTicketMonitor,
            team.createdAt,
            team.updatedAt
        ];

        const result = await this.db.query<any>(query, values);
        return this.mapToTeam(result.rows[0]);
    }

    /**
     * Find team by ID
     */
    async findById(id: string): Promise<Team | null> {
        const query = 'SELECT * FROM teams WHERE id = $1';
        const result = await this.db.query<any>(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToTeam(result.rows[0]);
    }

    /**
     * Find team by name
     */
    async findByName(name: string): Promise<Team | null> {
        const query = 'SELECT * FROM teams WHERE name = $1';
        const result = await this.db.query<any>(query, [name]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToTeam(result.rows[0]);
    }

    /**
     * Get all teams
     */
    async findAll(): Promise<Team[]> {
        const query = 'SELECT * FROM teams ORDER BY created_at DESC';
        const result = await this.db.query<any>(query);

        return result.rows.map(row => this.mapToTeam(row));
    }

    /**
     * Update team
     */
    async update(id: string, team: Partial<Team>): Promise<Team | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (team.name !== undefined) {
            fields.push(`name = $${paramCount++}`);
            values.push(team.name);
        }
        if (team.serviceNowUrl !== undefined) {
            fields.push(`servicenow_url = $${paramCount++}`);
            values.push(team.serviceNowUrl);
        }
        if (team.serviceNowUsername !== undefined) {
            fields.push(`servicenow_username = $${paramCount++}`);
            values.push(team.serviceNowUsername);
        }
        if (team.serviceNowPasswordEncrypted !== undefined) {
            fields.push(`servicenow_password_encrypted = $${paramCount++}`);
            values.push(team.serviceNowPasswordEncrypted);
        }
        if (team.settings?.ticketCheckInterval !== undefined) {
            fields.push(`ticket_check_interval = $${paramCount++}`);
            values.push(team.settings.ticketCheckInterval);
        }
        if (team.settings?.enableTicketMonitor !== undefined) {
            fields.push(`enable_ticket_monitor = $${paramCount++}`);
            values.push(team.settings.enableTicketMonitor);
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE teams 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await this.db.query<any>(query, values);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToTeam(result.rows[0]);
    }

    /**
     * Delete team
     */
    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM teams WHERE id = $1';
        const result = await this.db.query(query, [id]);

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Map database row to Team object
     */
    private mapToTeam(row: any): Team {
        return {
            id: row.id,
            name: row.name,
            serviceNowUrl: row.servicenow_url,
            serviceNowUsername: row.servicenow_username,
            serviceNowPasswordEncrypted: row.servicenow_password_encrypted,
            settings: {
                ticketCheckInterval: row.ticket_check_interval,
                enableTicketMonitor: row.enable_ticket_monitor
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
