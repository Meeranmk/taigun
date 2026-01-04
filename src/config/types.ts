export interface AppSettings {
    id: 'global_settings';
    serviceNowUrl: string;
    serviceNowUsername: string;
    serviceNowPasswordEncrypted: string;
    googleApiKeyEncrypted?: string;
    openaiApiKeyEncrypted?: string;
    ticketCheckInterval: number;
    enableTicketMonitor: boolean;
    updatedAt: string;
}

export interface UpdateSettingsInput {
    serviceNowUrl?: string;
    serviceNowUsername?: string;
    serviceNowPassword?: string;
    googleApiKey?: string;
    openaiApiKey?: string;
    ticketCheckInterval?: number;
    enableTicketMonitor?: boolean;
}
