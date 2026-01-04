import type { VectorDB } from '../rag/vector-db.js';
import type { AppSettings, UpdateSettingsInput } from './types.js';
import { encrypt, decrypt } from '../auth/crypto-utils.js';

export class SettingsManager {
    private vectorDB: VectorDB;
    private readonly SETTINGS_ID = 'global_settings';

    constructor(vectorDB: VectorDB) {
        this.vectorDB = vectorDB;
    }

    /**
     * Get current settings
     */
    async getSettings(): Promise<AppSettings | null> {
        return await this.vectorDB.getSettings(this.SETTINGS_ID);
    }

    /**
     * Get settings with decrypted password and API keys
     */
    async getSettingsWithPassword(): Promise<(AppSettings & {
        serviceNowPassword: string;
        googleApiKey?: string;
        openaiApiKey?: string;
    }) | null> {
        const settings = await this.getSettings();
        if (!settings) {
            return null;
        }

        const serviceNowPassword = decrypt(settings.serviceNowPasswordEncrypted);
        const googleApiKey = settings.googleApiKeyEncrypted ? decrypt(settings.googleApiKeyEncrypted) : undefined;
        const openaiApiKey = settings.openaiApiKeyEncrypted ? decrypt(settings.openaiApiKeyEncrypted) : undefined;

        return {
            ...settings,
            serviceNowPassword,
            googleApiKey,
            openaiApiKey,
        };
    }

    /**
     * Update settings
     */
    async updateSettings(input: UpdateSettingsInput): Promise<AppSettings> {
        const existing = await this.getSettings();

        // Encrypt password if provided
        let serviceNowPasswordEncrypted = existing?.serviceNowPasswordEncrypted || '';
        if (input.serviceNowPassword) {
            serviceNowPasswordEncrypted = encrypt(input.serviceNowPassword);
        }

        // Encrypt Google API key if provided
        let googleApiKeyEncrypted = existing?.googleApiKeyEncrypted;
        if (input.googleApiKey) {
            googleApiKeyEncrypted = encrypt(input.googleApiKey);
        }

        // Encrypt OpenAI API key if provided
        let openaiApiKeyEncrypted = existing?.openaiApiKeyEncrypted;
        if (input.openaiApiKey) {
            openaiApiKeyEncrypted = encrypt(input.openaiApiKey);
        }

        const settings: AppSettings = {
            id: this.SETTINGS_ID,
            serviceNowUrl: input.serviceNowUrl || existing?.serviceNowUrl || '',
            serviceNowUsername: input.serviceNowUsername || existing?.serviceNowUsername || '',
            serviceNowPasswordEncrypted,
            googleApiKeyEncrypted,
            openaiApiKeyEncrypted,
            ticketCheckInterval: input.ticketCheckInterval ?? existing?.ticketCheckInterval ?? 30000,
            enableTicketMonitor: input.enableTicketMonitor ?? existing?.enableTicketMonitor ?? true,
            updatedAt: new Date().toISOString(),
        };

        await this.vectorDB.saveSettings(settings);
        return settings;
    }

    /**
     * Test ServiceNow connection
     */
    async testConnection(
        serviceNowUrl: string,
        serviceNowUsername: string,
        serviceNowPassword: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Dynamically import ServiceNow API
            const ServiceNowAPIModule = await import('../index.js');
            const ServiceNowAPI = ServiceNowAPIModule.ServiceNowAPI;

            const api = new ServiceNowAPI({
                instanceUrl: serviceNowUrl,
                username: serviceNowUsername,
                password: serviceNowPassword,
            });

            // Test connection by fetching one ticket
            await api.get_pending_tickets({ keywords: [], limit: 1 });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Import settings from environment variables
     */
    async importFromEnv(): Promise<AppSettings | null> {
        const url = process.env.SERVICENOW_INSTANCE_URL;
        const username = process.env.SERVICENOW_USERNAME;
        const password = process.env.SERVICENOW_PASSWORD;

        if (!url || !username || !password) {
            return null;
        }

        const settings = await this.updateSettings({
            serviceNowUrl: url,
            serviceNowUsername: username,
            serviceNowPassword: password,
            googleApiKey: process.env.GOOGLE_API_KEY,
            openaiApiKey: process.env.OPENAI_API_KEY,
            ticketCheckInterval: parseInt(process.env.TICKET_CHECK_INTERVAL || '30000'),
            enableTicketMonitor: process.env.TICKET_MONITOR_ENABLED === 'true',
        });

        console.log('✅ Imported settings from .env file');
        return settings;
    }
}
