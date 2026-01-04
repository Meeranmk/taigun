export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    teamId: string;
    role: 'admin' | 'user';
    createdAt: string;
    updatedAt: string;
}

export interface Team {
    id: string;
    name: string;
    serviceNowUrl: string;
    serviceNowUsername: string;
    serviceNowPasswordEncrypted: string;
    settings: {
        ticketCheckInterval: number;
        enableTicketMonitor: boolean;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    teamId: string;
    role: 'admin' | 'user';
}

export interface CreateTeamInput {
    name: string;
    serviceNowUrl: string;
    serviceNowUsername: string;
    serviceNowPassword: string;
    settings?: {
        ticketCheckInterval?: number;
        enableTicketMonitor?: boolean;
    };
}
