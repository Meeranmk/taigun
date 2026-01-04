/**
 * TypeScript type definitions for ServiceNow MCP Agent
 */

export interface ServiceNowConfig {
    instanceUrl: string;
    username: string;
    password: string;
}

export interface ServiceNowTicket {
    sys_id: string;
    number: string;
    short_description: string;
    description: string;
    state: string;
    priority: string;
    caller_id: string;
    assigned_to?: string;
    work_notes?: string;
    comments?: string;
    sys_created_on: string;
    sys_updated_on: string;
}

export interface TicketQueryParams {
    state?: string;
    keywords?: string[];
    limit?: number;
}

export interface TicketUpdateParams {
    sys_id: string;
    state?: string;
    work_notes?: string;
    comments?: string;
    assigned_to?: string;
}

export interface IssueCategory {
    id: string;
    name: string;
    keywords: string[];
    description: string;
    resolutionTemplate: string;
}

export interface AgentConfig {
    checkInterval: number;
    autoResolve: boolean;
    categories: IssueCategory[];
    defaultCategory: string;
}

export interface MCPToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

export type TicketState = 'new' | 'in_progress' | 'on_hold' | 'resolved' | 'closed' | 'canceled';

export const TICKET_STATES: Record<string, string> = {
    NEW: '1',
    IN_PROGRESS: '2',
    ON_HOLD: '3',
    RESOLVED: '6',
    CLOSED: '7',
    CANCELED: '8'
};
