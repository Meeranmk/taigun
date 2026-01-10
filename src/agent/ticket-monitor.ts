import type { RAGEngine } from '../rag/rag-engine.js';
import type { ProblemSubmission } from '../rag/types.js';
import { ProcessedTicketsRepository } from '../database/repositories/processed-tickets-repository.js';
import { EmailService } from '../services/email-service.js';

export class TicketMonitor {
    private ragEngine: RAGEngine;
    private serviceNowAPI: any;
    private processedTicketsRepo: ProcessedTicketsRepository;
    private checkInterval: number;
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private emailService: EmailService;

    constructor(
        ragEngine: RAGEngine,
        serviceNowAPI: any,
        checkInterval: number = 60000 // Default: 1 minute
    ) {
        this.ragEngine = ragEngine;
        this.serviceNowAPI = serviceNowAPI;
        this.processedTicketsRepo = new ProcessedTicketsRepository();
        this.checkInterval = checkInterval;
        this.emailService = new EmailService();
    }

    /**
     * Initialize the ticket monitor and load processed tickets from PostgreSQL
     */
    async initialize(): Promise<void> {
        const count = await this.processedTicketsRepo.count();
        console.log(`   📂 Loaded ${count} processed tickets from PostgreSQL`);
    }



    /**
     * Start monitoring ServiceNow tickets
     */
    start(): void {
        if (this.isRunning) {
            console.log('⚠️  Ticket monitor is already running');
            return;
        }

        this.isRunning = true;
        console.log(`\n🎫 Starting ServiceNow ticket monitor...`);
        console.log(`   Checking every ${this.checkInterval / 1000} seconds`);

        // Run immediately
        this.checkTickets();

        // Then run on interval
        this.intervalId = setInterval(() => {
            this.checkTickets();
        }, this.checkInterval);
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('🛑 Ticket monitor stopped');
    }

    /**
     * Check for new tickets and process them
     */
    private async checkTickets(): Promise<void> {
        try {
            console.log('\n🔍 Checking for new ServiceNow tickets...');

            // Get pending tickets
            const response = await this.serviceNowAPI.get_pending_tickets({
                keywords: [],
                limit: 50,
            });

            const result = JSON.parse(response.content[0].text);

            // Check if the API call was successful
            if (!result.success) {
                console.log(`   ⚠️  ServiceNow API error: ${result.error || 'Unknown error'}`);
                return;
            }

            const tickets = result.data;

            if (!tickets || tickets.length === 0) {
                console.log('   No pending tickets found');
                return;
            }

            // Get processed ticket count from PostgreSQL
            const processedCount = await this.processedTicketsRepo.count();

            console.log(`   Found ${tickets.length} pending tickets`);
            console.log(`   Already processed: ${processedCount} tickets`);

            // Process each ticket
            for (const ticket of tickets) {
                await this.processTicket(ticket);
            }
        } catch (error) {
            console.error('❌ Error checking tickets:', error);
        }
    }

    /**
     * Process a single ticket
     */
    private async processTicket(ticket: any): Promise<void> {
        try {
            // Skip if already processed
            const isProcessed = await this.processedTicketsRepo.isProcessed(ticket.sys_id);
            if (isProcessed) {
                console.log(`   ⏭️  Skipping ticket ${ticket.number} (${ticket.sys_id}) - already processed`);
                return;
            }

            // Skip if no description
            if (!ticket.description && !ticket.short_description) {
                console.log(`   ⏭️  Skipping ticket ${ticket.number} - no description`);
                return;
            }

            console.log(`\n   📋 Processing ticket ${ticket.number} (sys_id: ${ticket.sys_id})...`);
            console.log(`      Problem: ${ticket.short_description || ticket.description.substring(0, 100)}`);

            // Create problem submission
            const submission: ProblemSubmission = {
                problem: ticket.description || ticket.short_description,
                userName: ticket.caller_id || 'Unknown',
            };

            // Generate solution using RAG
            console.log('      🤖 Generating RAG-based solution...');
            const solution = await this.ragEngine.generateSolution(
                submission,
                this.serviceNowAPI
            );

            // Format solution as text
            const solutionText = this.formatSolution(solution);

            // Add comment to ticket
            console.log('      💬 Adding solution to ticket...');
            await this.serviceNowAPI.update_ticket({
                sys_id: ticket.sys_id,
                comments: solutionText,
                work_notes: `AI-generated solution using RAG system. Confidence: ${(solution.confidence * 100).toFixed(0)}%. Similar cases found: ${solution.similarCases.length}`,
            });

            // Mark as processed in PostgreSQL
            await this.processedTicketsRepo.create({
                ticketSysId: ticket.sys_id,
                ticketNumber: ticket.number,
                solutionProvided: solutionText,
                confidenceScore: solution.confidence,
            });

            console.log(`      ✅ Ticket ${ticket.number} processed successfully`);
            console.log(`         Confidence: ${(solution.confidence * 100).toFixed(0)}%`);
            console.log(`         Similar cases: ${solution.similarCases.length}`);

            // Send email notification
            await this.emailService.sendTicketSolutionNotification({
                ticketNumber: ticket.number,
                ticketId: ticket.sys_id,
                problem: ticket.short_description || ticket.description,
                solution: solutionText,
                confidence: Math.round(solution.confidence * 100),
                ticketUrl: `${process.env.SERVICENOW_INSTANCE_URL}/nav_to.do?uri=incident.do?sys_id=${ticket.sys_id}`,
            });
        } catch (error) {
            console.error(`   ❌ Error processing ticket ${ticket.number}:`, error);
        }
    }

    /**
     * Format solution for ServiceNow comment
     */
    private formatSolution(solution: any): string {
        let text = '🤖 AI-Generated Solution\n\n';
        text += `Problem: ${solution.problem}\n\n`;

        if (solution.similarCases.length > 0) {
            text += `This solution is based on ${solution.similarCases.length} similar case(s) from our knowledge base.\n\n`;
        }

        text += 'SOLUTION STEPS:\n\n';

        solution.steps.forEach((step: any) => {
            const icon = step.type === 'action' ? '▶️' : step.type === 'verification' ? '✓' : 'ℹ️';
            text += `${icon} ${step.description}\n`;
        });

        text += '\n---\n';
        text += 'If this solution resolves your issue, please close this ticket.\n';
        text += 'If you need further assistance, please reply with additional details.\n';

        return text;
    }

    /**
     * Get monitor status
     */
    async getStatus(): Promise<{ isRunning: boolean; processedCount: number; checkInterval: number }> {
        const processedCount = await this.processedTicketsRepo.count();
        return {
            isRunning: this.isRunning,
            processedCount,
            checkInterval: this.checkInterval,
        };
    }

    /**
     * Clear processed tickets cache
     */
    async clearCache(): Promise<void> {
        await this.processedTicketsRepo.clear();
        console.log('   ✅ Processed tickets cache cleared');
    }
}
