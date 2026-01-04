import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailNotification {
    ticketNumber: string;
    ticketId: string;
    problem: string;
    solution: string;
    confidence: number;
    ticketUrl?: string;
}

export class EmailService {
    private transporter: Transporter | null = null;
    private enabled: boolean;
    private recipientEmail: string;

    constructor() {
        this.enabled = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
        this.recipientEmail = process.env.EMAIL_USER || '';

        if (this.enabled) {
            this.initializeTransporter();
        }
    }

    private initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD,
                },
            });

            console.log('✅ Email service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize email service:', error);
            this.enabled = false;
        }
    }

    async sendTicketSolutionNotification(notification: EmailNotification): Promise<boolean> {
        if (!this.enabled || !this.transporter) {
            console.log('📧 Email notifications disabled, skipping...');
            return false;
        }

        try {
            const subject = `[ServiceNow] Solution Generated for ${notification.ticketNumber}`;

            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">ServiceNow Ticket Solution</h2>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Ticket:</strong> ${notification.ticketNumber}</p>
                        <p style="margin: 5px 0;"><strong>Confidence:</strong> ${notification.confidence}%</p>
                    </div>

                    <div style="margin: 20px 0;">
                        <h3 style="color: #374151;">Problem:</h3>
                        <p style="background-color: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b; border-radius: 4px;">
                            ${notification.problem}
                        </p>
                    </div>

                    <div style="margin: 20px 0;">
                        <h3 style="color: #374151;">AI-Generated Solution:</h3>
                        <div style="background-color: #d1fae5; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px; white-space: pre-wrap;">
${notification.solution}
                        </div>
                    </div>

                    ${notification.ticketUrl ? `
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${notification.ticketUrl}" 
                           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            View Ticket in ServiceNow
                        </a>
                    </div>
                    ` : ''}

                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #6b7280; font-size: 12px; text-align: center;">
                        This is an automated notification from your ServiceNow RAG Agent
                    </p>
                </div>
            `;

            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: this.recipientEmail,
                subject,
                html,
            });

            console.log(`✅ Email notification sent for ticket ${notification.ticketNumber}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to send email notification:', error);
            return false;
        }
    }

    async sendTestEmail(): Promise<boolean> {
        if (!this.enabled || !this.transporter) {
            throw new Error('Email service is not enabled or configured');
        }

        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: this.recipientEmail,
                subject: 'Test Email from ServiceNow RAG Agent',
                html: `
                    <h2>Email Configuration Test</h2>
                    <p>If you're reading this, your email notifications are working correctly!</p>
                    <p><strong>Configuration:</strong></p>
                    <ul>
                        <li>Service: Gmail</li>
                        <li>From: ${process.env.EMAIL_USER}</li>
                        <li>To: ${this.recipientEmail}</li>
                    </ul>
                `,
            });

            console.log('✅ Test email sent successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to send test email:', error);
            throw error;
        }
    }
}
