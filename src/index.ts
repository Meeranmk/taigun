/**
 * ServiceNow RAG-Based Problem Resolution System
 * Main entry point with API server and RAG engine
 */

import 'dotenv/config';
import { KnowledgeBaseStorage } from './knowledge-base/storage.js';
import { RAGEngine } from './rag/rag-engine.js';
import { APIServer } from './api/api-server.js';
import type { AgentConfig, ServiceNowConfig } from './types.js';
import axios, { AxiosInstance } from 'axios';

// Load configuration from environment variables and/or database settings
function loadConfig(dbSettings?: { serviceNowUrl: string; serviceNowUsername: string; serviceNowPassword: string } | null): { agentConfig: AgentConfig; serviceNowConfig: ServiceNowConfig } {
    // Database settings take precedence over environment variables
    const serviceNowConfig: ServiceNowConfig = {
        instanceUrl: dbSettings?.serviceNowUrl || process.env.SERVICENOW_INSTANCE_URL || '',
        username: dbSettings?.serviceNowUsername || process.env.SERVICENOW_USERNAME || '',
        password: dbSettings?.serviceNowPassword || process.env.SERVICENOW_PASSWORD || '',
    };

    const agentConfig: AgentConfig = {
        checkInterval: parseInt(process.env.TICKET_CHECK_INTERVAL || '300000'),
        autoResolve: process.env.AUTO_RESOLVE_TICKETS === 'true',
        defaultCategory: 'general',
        categories: [
            {
                id: 'access',
                name: 'Access Issue',
                keywords: (process.env.ACCESS_KEYWORDS || 'access,login,sign in,authentication,SSO').split(',').map(k => k.trim()),
                description: 'User cannot log in or access a system',
                resolutionTemplate: `Thank you for contacting IT support. To resolve your access issue, please sign in using SSO (Single Sign-On) at the following URL:

${process.env.SSO_SIGNIN_URL || 'https://your-sso-portal.com/login'}

If you continue to experience issues after signing in with SSO, please reply to this ticket and we'll investigate further.`
            },
            {
                id: 'vpn',
                name: 'VPN Issue',
                keywords: ['vpn', 'remote access', 'globalprotect', 'cisco anyconnect', 'tunnel'],
                description: 'User cannot connect to VPN',
                resolutionTemplate: `Thank you for contacting IT support regarding your VPN issue. Please try the following steps:

1. Restart your computer
2. Ensure you have a stable internet connection
3. Open the VPN client and click "Refresh Connection"

If the issue persists, please reply with any error messages you are seeing.`
            },
            {
                id: 'software',
                name: 'Software Request',
                keywords: ['install', 'software', 'adobe', 'office', 'license', 'application'],
                description: 'User needs software installed',
                resolutionTemplate: `Thank you for your software request. Most standard software can be installed directly from the Company Software Center:

1. Open the Start Menu
2. Type "Software Center" and open it
3. Search for the application you need
4. Click "Install"

If the software is not listed, please reply with the specific version you require.`
            }
        ]
    };

    return { agentConfig, serviceNowConfig };
}

// Validate configuration
function validateConfig(config: { agentConfig: AgentConfig; serviceNowConfig: ServiceNowConfig }, hasDbSettings: boolean) {
    const errors: string[] = [];

    if (!config.serviceNowConfig.instanceUrl) {
        errors.push('SERVICENOW_INSTANCE_URL is required');
    }
    if (!config.serviceNowConfig.username) {
        errors.push('SERVICENOW_USERNAME is required');
    }
    if (!config.serviceNowConfig.password) {
        errors.push('SERVICENOW_PASSWORD is required');
    }
    // Note: API keys are not required at startup - they can be configured via Admin Portal
    // They will be validated when actually needed for AI operations

    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(err => console.error(`   - ${err}`));
        if (hasDbSettings) {
            console.error('\n💡 Database settings were found but some required fields are missing.');
            console.error('   Please update settings via the Admin Portal at http://localhost:3001/dashboard/settings');
        } else {
            console.error('\n💡 No settings found in database or .env file.');
            console.error('   Option 1: Copy .env.example to .env and configure your credentials');
            console.error('   Option 2: Start the server and configure via Admin Portal at http://localhost:3001/dashboard/settings');
        }
        process.exit(1);
    }
}

// ServiceNow API wrapper
export class ServiceNowAPI {
    private axiosInstance: AxiosInstance;

    constructor(config: ServiceNowConfig) {
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
    }

    async get_pending_tickets(params: { keywords: string[]; limit: number }) {
        const { keywords = [], limit = 10 } = params;

        let query = 'state=1^ORstate=2';

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
                sysparm_fields: 'sys_id,number,short_description,description,state,priority,caller_id,sys_created_on,close_notes',
            },
        });

        // Validate response structure
        if (!response.data || !response.data.result) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            data: [],
                            count: 0,
                            error: 'Invalid response from ServiceNow API',
                        }),
                    },
                ],
            };
        }

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

    async get_ticket_details(params: { sys_id: string }) {
        const { sys_id } = params;
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

    async update_ticket(params: any) {
        const { sys_id, comments, work_notes, state } = params;

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

    async add_work_note(params: { sys_id: string; note: string }) {
        const { sys_id, note } = params;
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
}

async function main() {
    console.log('🤖 ServiceNow RAG-Based Problem Resolution System');
    console.log('================================================\n');

    // Initialize Vector Database first (needed to load settings from database)
    console.log('🔧 Initializing Vector Database...');
    const { VectorDB } = await import('./rag/vector-db.js');
    const vectorDB = new VectorDB();
    await vectorDB.initialize();
    console.log('✅ Vector Database initialized\n');

    // Try to load settings from database
    console.log('🔍 Checking for settings in database...');
    const { SettingsManager } = await import('./config/settings-manager.js');
    const settingsManager = new SettingsManager(vectorDB);
    let dbSettings = await settingsManager.getSettingsWithPassword();

    // If no settings in database, try to import from .env
    if (!dbSettings) {
        console.log('   No settings found in database, checking .env file...');
        const imported = await settingsManager.importFromEnv();
        if (imported) {
            console.log('   ✅ Imported settings from .env file to database');
            // Get the settings with decrypted password
            dbSettings = await settingsManager.getSettingsWithPassword();
        }
    } else {
        console.log('   ✅ Loaded settings from database');
    }
    console.log('');

    // Load and validate configuration (with database settings taking precedence)
    const config = loadConfig(dbSettings);
    validateConfig(config, !!dbSettings);

    console.log('✅ Configuration loaded successfully\n');

    // Create embed function for KnowledgeBaseStorage
    const { embed } = await import('ai');
    const { openai } = await import('@ai-sdk/openai');
    const { google } = await import('@ai-sdk/google');

    // Load API keys from database or environment (database takes precedence)
    const googleApiKey = dbSettings?.googleApiKey || process.env.GOOGLE_API_KEY;
    const openaiApiKey = dbSettings?.openaiApiKey || process.env.OPENAI_API_KEY;

    let embeddingModel: any = null;
    if (openaiApiKey) {
        embeddingModel = openai.embedding('text-embedding-3-small');
        console.log('✅ Using OpenAI for embeddings');
    } else if (googleApiKey) {
        embeddingModel = google.embedding('text-embedding-004');
        console.log('✅ Using Google for embeddings');
    } else {
        console.warn('⚠️  No LLM API key configured. AI features will not work until you configure an API key.');
        console.warn('   Configure via Admin Portal: http://localhost:3001/dashboard/settings');
    }

    const embedFunction = async (text: string): Promise<number[]> => {
        if (!embeddingModel) {
            throw new Error('No LLM API key configured. Please add OPENAI_API_KEY or GOOGLE_API_KEY via Admin Portal at http://localhost:3001/dashboard/settings');
        }
        const { embedding } = await embed({
            model: embeddingModel,
            value: text,
        });
        return embedding;
    };

    // Initialize Knowledge Base with VectorDB
    console.log('📚 Initializing Knowledge Base...');
    const knowledgeBase = new KnowledgeBaseStorage(vectorDB, embedFunction);
    await knowledgeBase.initialize();

    // Create ServiceNow API client
    console.log('🔧 Connecting to ServiceNow...');
    const serviceNowAPI = new ServiceNowAPI(config.serviceNowConfig);

    // Test connection
    try {
        await serviceNowAPI.get_pending_tickets({ keywords: [], limit: 1 });
        console.log('✅ Connected to ServiceNow\n');
    } catch (error: any) {
        console.error('❌ Failed to connect to ServiceNow:');
        console.error(`   ${error.message}`);
        console.error('⚠️  Continuing without ServiceNow (RAG will use Knowledge Base only)\n');
    }

    // Initialize RAG Engine
    console.log('🧠 Initializing RAG Engine...');
    const ragEngine = new RAGEngine(knowledgeBase, {
        embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small',
        similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7'),
        maxSimilarCases: parseInt(process.env.RAG_MAX_SIMILAR_CASES || '5'),
        kbPriorityWeight: parseFloat(process.env.KB_PRIORITY_WEIGHT || '2.0'),
        googleApiKey: googleApiKey,
        openaiApiKey: openaiApiKey,
    });
    await ragEngine.initialize();
    console.log('✅ RAG Engine initialized\n');

    // Initialize API Server
    console.log('🌐 Starting API Server...');
    const apiPort = parseInt(process.env.API_PORT || '3000');
    const apiServer = new APIServer(knowledgeBase, ragEngine, serviceNowAPI, apiPort);
    await apiServer.initialize(); // Create default admin user if needed
    await apiServer.start();

    // Initialize Ticket Monitor (if enabled)
    const ticketMonitorEnabled = process.env.TICKET_MONITOR_ENABLED !== 'false';
    if (ticketMonitorEnabled) {
        console.log('\n🎫 Starting ServiceNow Ticket Monitor...');
        const { TicketMonitor } = await import('./agent/ticket-monitor.js');
        const ticketCheckInterval = parseInt(process.env.TICKET_CHECK_INTERVAL || '60000');

        const ticketMonitor = new TicketMonitor(
            ragEngine,
            serviceNowAPI,
            vectorDB,
            ticketCheckInterval
        );

        await ticketMonitor.initialize();
        ticketMonitor.start();
        console.log('✅ Ticket monitor started');
        console.log(`   Will check ServiceNow every ${ticketCheckInterval / 1000} seconds`);
        console.log('   Tickets will receive AI-generated solutions from knowledge base\n');
    } else {
        console.log('\n⏭️  Ticket monitor disabled (set TICKET_MONITOR_ENABLED=true to enable)\n');
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down...');
        process.exit(0);
    });

    console.log('\n✨ System ready! Open your browser to get started.\n');
    console.log('📍 Available Services:');
    console.log('   • Admin Portal: http://localhost:3000/admin');
    if (ticketMonitorEnabled) {
        console.log('   • ServiceNow Ticket Monitor: Active');
    }
    console.log('');

    // Keep the process running
    process.stdin.resume();
}

// Run the application
main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
