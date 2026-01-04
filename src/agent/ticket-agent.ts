/**
 * ServiceNow Ticket Agent for Access Issue Automation
 * Monitors tickets and automatically responds to access issues
 */

import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TeamsHelper } from './teams-helper.js';
import { EmailHelper } from './email-helper.js';
import type { AgentConfig } from '../types.js';

/**
 * Direct ticket processor using MCP tools
 * This version gives full control over the workflow
 */
export class DirectTicketProcessor {
    private config: AgentConfig;
    private llmModel: any;
    private teamsClient: Client | null = null;
    private teamsEnabled: boolean;
    private emailHelper: EmailHelper;

    constructor(config: AgentConfig) {
        this.config = config;
        // Use Google AI if available, otherwise OpenAI
        if (process.env.GOOGLE_API_KEY) {
            this.llmModel = google('gemini-2.0-flash-exp');
        } else {
            this.llmModel = openai('gpt-4o');
        }

        // Initialize Teams client if enabled
        this.teamsEnabled = process.env.ENABLE_TEAMS_NOTIFICATIONS === 'true';
        if (this.teamsEnabled) {
            this.initializeTeamsClient();
        }

        // Initialize Email helper
        this.emailHelper = new EmailHelper();
    }

    private initializeTeamsClient() {
        try {
            const tenantId = process.env.AZURE_TENANT_ID;
            const clientId = process.env.AZURE_CLIENT_ID;
            const clientSecret = process.env.AZURE_CLIENT_SECRET;

            if (!tenantId || !clientId || !clientSecret) {
                console.warn('⚠️  Teams notifications enabled but Azure credentials missing');
                this.teamsEnabled = false;
                return;
            }

            const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
            this.teamsClient = Client.initWithMiddleware({
                authProvider: {
                    getAccessToken: async () => {
                        const token = await credential.getToken('https://graph.microsoft.com/.default');
                        return token.token;
                    },
                },
            });
            console.log('✅ Teams client initialized');
        } catch (error: any) {
            console.error('❌ Failed to initialize Teams client:', error.message);
            this.teamsEnabled = false;
        }
    }

    async processTicketsDirectly(mcpTools: any): Promise<void> {
        try {
            console.log('🔍 Fetching pending tickets...');

            // Collect all keywords from all categories for the search
            const allKeywords = this.config.categories.flatMap(c => c.keywords);

            // Get pending tickets with any relevant keywords
            const ticketsResult = await mcpTools.get_pending_tickets({
                keywords: allKeywords,
                limit: 20,
            });

            const tickets = JSON.parse(ticketsResult.content[0].text);

            if (!tickets.success || tickets.count === 0) {
                console.log('📭 No pending relevant tickets found');
                return;
            }

            console.log(`📬 Found ${tickets.count} potential ticket(s)`);

            // Process each ticket
            for (const ticket of tickets.data) {
                await this.processTicket(ticket, mcpTools);
            }

            console.log('✅ All tickets processed');
        } catch (error: any) {
            console.error('❌ Error processing tickets:', error.message);
        }
    }

    private async processTicket(ticket: any, mcpTools: any): Promise<void> {
        console.log(`\n📋 Processing ticket: ${ticket.number}`);
        console.log(`   Description: ${ticket.short_description}`);

        try {
            // Get full ticket details
            const detailsResult = await mcpTools.get_ticket_details({
                sys_id: ticket.sys_id,
            });

            const details = JSON.parse(detailsResult.content[0].text);

            if (!details.success) {
                console.log(`   ⚠️  Could not fetch details for ${ticket.number}`);
                return;
            }

            // Check if we already responded
            if (this.hasAlreadyResponded(details.data)) {
                console.log(`   ⏭️  Skipping - already responded`);
                return;
            }

            // Classify the ticket
            const categoryId = await this.classifyTicket(details.data);
            const category = this.config.categories.find(c => c.id === categoryId);

            if (!category) {
                console.log(`   ⏭️  Skipping - could not classify ticket (Category: ${categoryId})`);
                return;
            }

            console.log(`   🏷️  Classified as: ${category.name}`);

            // Generate AI-powered response
            console.log(`   🤖 Generating AI response...`);
            const response = await this.generateAIResponse(details.data, category);

            // Update the ticket
            const updateParams: any = {
                sys_id: ticket.sys_id,
                comments: response,
                work_notes: `[Automated Response] Classified as ${category.name}. AI-generated instructions provided at ${new Date().toISOString()}`,
            };

            if (this.config.autoResolve) {
                updateParams.state = '6'; // Resolved
            }

            await mcpTools.update_ticket(updateParams);
            console.log(`   ✅ Responded to ${ticket.number} with ${category.name} instructions`);

            // Send Teams notification if enabled
            if (this.teamsEnabled && details.data.caller_id) {
                await this.sendTeamsNotification(details.data.caller_id, ticket.number, response);
            }

            // Send Email notification if enabled
            if (this.emailHelper.isEnabled() && details.data.caller_id) {
                const callerEmail = await TeamsHelper.getCallerEmail(
                    typeof details.data.caller_id === 'string'
                        ? details.data.caller_id
                        : (details.data.caller_id as any).value || (details.data.caller_id as any).sys_id || ''
                );
                if (callerEmail) {
                    await this.emailHelper.sendNotification(callerEmail, ticket.number, response);
                }
            }
        } catch (error: any) {
            console.log(`   ❌ Error processing ${ticket.number}: ${error.message}`);
        }
    }

    private hasAlreadyResponded(ticketDetails: any): boolean {
        // Check comments and work notes for our signature
        const signature = '[Automated Response]';
        const comments = ticketDetails.comments || '';
        const workNotes = ticketDetails.work_notes || '';

        return comments.includes(signature) || workNotes.includes(signature);
    }

    private async classifyTicket(ticketDetails: any): Promise<string> {
        try {
            const prompt = `You are an IT Service Desk dispatcher. Categorize the following ticket into one of these categories:
${this.config.categories.map(c => `- ${c.id}: ${c.description}`).join('\n')}
- unknown: None of the above

Ticket Short Description: ${ticketDetails.short_description}
Ticket Description: ${ticketDetails.description || ''}

Respond ONLY with the category ID (e.g., "access", "vpn", "software"). Do not add any explanation.`;

            const result = await generateText({
                model: this.llmModel,
                prompt: prompt,
            });

            return result.text.trim().toLowerCase();
        } catch (error: any) {
            console.error(`   ⚠️  Classification failed: ${error.message}`);
            // Fallback: simple keyword matching
            const text = (ticketDetails.short_description + ' ' + (ticketDetails.description || '')).toLowerCase();
            for (const category of this.config.categories) {
                if (category.keywords.some(k => text.includes(k.toLowerCase()))) {
                    return category.id;
                }
            }
            return 'unknown';
        }
    }

    private async generateAIResponse(ticketDetails: any, category: any): Promise<string> {
        try {
            const prompt = `You are a helpful IT support agent. A user has submitted a support ticket.

Category: ${category.name}
Ticket Number: ${ticketDetails.number}
Short Description: ${ticketDetails.short_description}
Full Description: ${ticketDetails.description || 'No additional details provided'}

Standard Resolution Procedure:
${category.resolutionTemplate}

Generate a professional, empathetic response that follows the standard resolution procedure but is personalized to the user's specific description.
Keep the response concise (2-3 short paragraphs), friendly, and professional. End with "Best regards, Platform Support (Automated Response)"`;

            const result = await generateText({
                model: this.llmModel,
                prompt: prompt,
            });

            return result.text;
        } catch (error: any) {
            console.error(`   ⚠️  AI generation failed, using fallback: ${error.message}`);
            // Fallback to static template
            return `${category.resolutionTemplate}\n\nBest regards,\nPlatform Support`;
        }
    }

    private async sendTeamsNotification(callerIdValue: any, ticketNumber: string, message: string): Promise<void> {
        if (!this.teamsClient) return;

        try {
            console.log(`   📧 Fetching caller email for Teams notification...`);

            // Extract sys_id - handle both string and object formats
            let callerSysId: string;
            if (typeof callerIdValue === 'string') {
                callerSysId = callerIdValue;
            } else if (callerIdValue && typeof callerIdValue === 'object') {
                callerSysId = callerIdValue.value || callerIdValue.sys_id || '';
            } else {
                console.log(`   ⏭️  Skipping Teams notification (invalid caller_id format)`);
                return;
            }

            // Fetch caller email from ServiceNow
            const callerEmail = await TeamsHelper.getCallerEmail(callerSysId);

            if (!callerEmail) {
                console.log(`   ⏭️  Skipping Teams notification (no email found for caller)`);
                return;
            }

            // Send Teams notification using helper
            const teamsHelper = new TeamsHelper(this.teamsClient);
            await teamsHelper.sendNotification(callerEmail, ticketNumber, message);
        } catch (error: any) {
            console.error(`   ⚠️  Teams notification failed: ${error.message}`);
        }
    }

    async startMonitoring(mcpTools: any): Promise<void> {
        console.log('🚀 Starting ServiceNow ticket monitoring...');
        console.log(`📊 Check interval: ${this.config.checkInterval}ms`);
        console.log(`📂 Active Categories: ${this.config.categories.map(c => c.name).join(', ')}`);
        console.log(`⚙️  Auto-resolve: ${this.config.autoResolve ? 'Yes' : 'No'}`);
        console.log('');

        // Initial check
        await this.processTicketsDirectly(mcpTools);

        // Set up periodic checking
        setInterval(async () => {
            await this.processTicketsDirectly(mcpTools);
        }, this.config.checkInterval);

        console.log('✨ Agent is now monitoring tickets...');
    }
}
