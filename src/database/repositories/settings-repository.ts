/**
 * Settings Repository
 * Handles all database operations for application settings
 */

import PostgresClient from '../postgres-client.js';

export interface SettingsData {
    id?: string;
    key: string;
    value?: string;
    serviceNowUrl?: string;
    serviceNowUsername?: string;
    serviceNowPasswordEncrypted?: string;
    googleApiKeyEncrypted?: string;
    openaiApiKeyEncrypted?: string;
    createdAt?: string;
    updatedAt?: string;
}

export class SettingsRepository {
    private db: typeof PostgresClient;

    constructor() {
        this.db = PostgresClient;
    }

    /**
     * Get settings by key
     */
    async findByKey(key: string): Promise<SettingsData | null> {
        const query = 'SELECT * FROM settings WHERE key = $1';
        const result = await this.db.query<any>(query, [key]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToSettings(result.rows[0]);
    }

    /**
     * Create or update settings
     */
    async upsert(settings: SettingsData): Promise<SettingsData> {
        const query = `
            INSERT INTO settings (
                key, value, servicenow_url, servicenow_username,
                servicenow_password_encrypted, google_api_key_encrypted,
                openai_api_key_encrypted
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (key) 
            DO UPDATE SET
                value = EXCLUDED.value,
                servicenow_url = EXCLUDED.servicenow_url,
                servicenow_username = EXCLUDED.servicenow_username,
                servicenow_password_encrypted = EXCLUDED.servicenow_password_encrypted,
                google_api_key_encrypted = EXCLUDED.google_api_key_encrypted,
                openai_api_key_encrypted = EXCLUDED.openai_api_key_encrypted,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const values = [
            settings.key,
            settings.value || null,
            settings.serviceNowUrl || null,
            settings.serviceNowUsername || null,
            settings.serviceNowPasswordEncrypted || null,
            settings.googleApiKeyEncrypted || null,
            settings.openaiApiKeyEncrypted || null
        ];

        const result = await this.db.query<any>(query, values);
        return this.mapToSettings(result.rows[0]);
    }

    /**
     * Delete settings by key
     */
    async delete(key: string): Promise<boolean> {
        const query = 'DELETE FROM settings WHERE key = $1';
        const result = await this.db.query(query, [key]);

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Get all settings
     */
    async findAll(): Promise<SettingsData[]> {
        const query = 'SELECT * FROM settings ORDER BY created_at DESC';
        const result = await this.db.query<any>(query);

        return result.rows.map(row => this.mapToSettings(row));
    }

    /**
     * Map database row to Settings object
     */
    private mapToSettings(row: any): SettingsData {
        return {
            id: row.id,
            key: row.key,
            value: row.value,
            serviceNowUrl: row.servicenow_url,
            serviceNowUsername: row.servicenow_username,
            serviceNowPasswordEncrypted: row.servicenow_password_encrypted,
            googleApiKeyEncrypted: row.google_api_key_encrypted,
            openaiApiKeyEncrypted: row.openai_api_key_encrypted,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
