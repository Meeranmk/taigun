/**
 * MCP Server for ServiceNow Integration
 * Exposes ServiceNow operations as MCP tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import type { ServiceNowConfig, ServiceNowTicket, MCPToolResult, TicketUpdateParams } from '../types.js';

export class ServiceNowMCPServer {
    private server: Server;
    private axiosInstance: AxiosInstance;
    private config: ServiceNowConfig;

    constructor(config: ServiceNowConfig) {
        this.config = config;
        this.server = new Server(
            {
                name: 'servicenow-mcp-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        // Configure axios for ServiceNow API
        this.axiosInstance = axios.create({
            baseURL: `${config.instanceUrl}/api/now`,
            auth: {
                username: config.username,
                password: config.password,
            },
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        this.setupToolHandlers();
    }

    private setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_pending_tickets',
                    description: 'Retrieve pending ServiceNow tickets (New or In Progress state) with optional keyword filtering',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            keywords: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Keywords to search in ticket description (e.g., ["access", "login"])',
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of tickets to return (default: 10)',
                                default: 10,
                            },
                        },
                    },
                },
                {
                    name: 'get_ticket_details',
                    description: 'Get full details of a specific ServiceNow ticket by sys_id',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sys_id: {
                                type: 'string',
                                description: 'The sys_id of the ticket',
                            },
                        },
                        required: ['sys_id'],
                    },
                },
                {
                    name: 'update_ticket',
                    description: 'Update a ServiceNow ticket with comments, work notes, or state change',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sys_id: {
                                type: 'string',
                                description: 'The sys_id of the ticket to update',
                            },
                            comments: {
                                type: 'string',
                                description: 'Customer-visible comments to add',
                            },
                            work_notes: {
                                type: 'string',
                                description: 'Internal work notes (not visible to customer)',
                            },
                            state: {
                                type: 'string',
                                description: 'New state for the ticket (1=New, 2=In Progress, 6=Resolved, 7=Closed)',
                            },
                        },
                        required: ['sys_id'],
                    },
                },
                {
                    name: 'add_work_note',
                    description: 'Add an internal work note to a ServiceNow ticket',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sys_id: {
                                type: 'string',
                                description: 'The sys_id of the ticket',
                            },
                            note: {
                                type: 'string',
                                description: 'The work note content',
                            },
                        },
                        required: ['sys_id', 'note'],
                    },
                },
            ],
        }));

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'get_pending_tickets':
                        return await this.getPendingTickets(args);
                    case 'get_ticket_details':
                        return await this.getTicketDetails(args);
                    case 'update_ticket':
                        return await this.updateTicket(args);
                    case 'add_work_note':
                        return await this.addWorkNote(args);
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error: any) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: error.message,
                            }),
                        },
                    ],
                };
            }
        });
    }

    private async getPendingTickets(args: any) {
        const { keywords = [], limit = 10 } = args;

        // Build query for pending tickets (state 1 or 2)
        let query = 'state=1^ORstate=2';

        // Add keyword filtering if provided
        if (keywords.length > 0) {
            const keywordQuery = keywords
                .map((kw: string) => `short_descriptionLIKE${kw}^ORdescriptionLIKE${kw}`)
                .join('^OR');
            query += `^${keywordQuery}`;
        }

        const response = await this.axiosInstance.get('/table/incident', {
            params: {
                sysparm_query: query,
                sysparm_limit: limit,
                sysparm_fields: 'sys_id,number,short_description,description,state,priority,caller_id,sys_created_on',
            },
        });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        data: response.data.result,
                        count: response.data.result.length,
                    }),
                },
            ],
        };
    }

    private async getTicketDetails(args: any) {
        const { sys_id } = args;

        const response = await this.axiosInstance.get(`/table/incident/${sys_id}`);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        data: response.data.result,
                    }),
                },
            ],
        };
    }

    private async updateTicket(args: any) {
        const { sys_id, comments, work_notes, state } = args;

        const updateData: any = {};
        if (comments) updateData.comments = comments;
        if (work_notes) updateData.work_notes = work_notes;
        if (state) updateData.state = state;

        const response = await this.axiosInstance.patch(`/table/incident/${sys_id}`, updateData);

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        data: response.data.result,
                        message: 'Ticket updated successfully',
                    }),
                },
            ],
        };
    }

    private async addWorkNote(args: any) {
        const { sys_id, note } = args;

        const response = await this.axiosInstance.patch(`/table/incident/${sys_id}`, {
            work_notes: note,
        });

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        data: response.data.result,
                        message: 'Work note added successfully',
                    }),
                },
            ],
        };
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('ServiceNow MCP Server running on stdio');
    }
}

// Run server if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const config: ServiceNowConfig = {
        instanceUrl: process.env.SERVICENOW_INSTANCE_URL || '',
        username: process.env.SERVICENOW_USERNAME || '',
        password: process.env.SERVICENOW_PASSWORD || '',
    };

    if (!config.instanceUrl || !config.username || !config.password) {
        console.error('Error: ServiceNow credentials not configured. Please set environment variables.');
        process.exit(1);
    }

    const server = new ServiceNowMCPServer(config);
    server.start().catch(console.error);
}
