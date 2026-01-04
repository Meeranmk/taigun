/**
 * Email Helper for sending notifications
 */

import nodemailer from 'nodemailer';

export class EmailHelper {
    private transporter: nodemailer.Transporter | null = null;
    private emailEnabled: boolean;
    private fromEmail: string;

    constructor() {
        this.emailEnabled = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@servicenow-agent.com';

        if (this.emailEnabled) {
            this.initializeTransporter();
        }
    }

    private initializeTransporter() {
        try {
            const emailService = process.env.EMAIL_SERVICE || 'gmail';
            const emailUser = process.env.EMAIL_USER;
            const emailPassword = process.env.EMAIL_PASSWORD;

            if (!emailUser || !emailPassword) {
                console.warn('⚠️  Email notifications enabled but credentials missing');
                this.emailEnabled = false;
                return;
            }

            this.transporter = nodemailer.createTransport({
                service: emailService,
                auth: {
                    user: emailUser,
                    pass: emailPassword,
                },
            });

            console.log('✅ Email transporter initialized');
        } catch (error: any) {
            console.error('❌ Failed to initialize email transporter:', error.message);
            this.emailEnabled = false;
        }
    }

    async sendNotification(
        toEmail: string,
        ticketNumber: string,
        message: string
    ): Promise<boolean> {
        if (!this.transporter || !this.emailEnabled) {
            return false;
        }

        try {
            console.log(`   📧 Sending email to ${toEmail}...`);

            const mailOptions = {
                from: this.fromEmail,
                to: toEmail,
                subject: `ServiceNow Ticket ${ticketNumber} - Update`,
                text: message,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #0066cc;">🎫 ServiceNow Ticket Update</h2>
                        <p style="background-color: #f0f0f0; padding: 10px; border-left: 4px solid #0066cc;">
                            <strong>Ticket:</strong> ${ticketNumber}
                        </p>
                        <div style="margin: 20px 0; line-height: 1.6;">
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">
                            This is an automated message from your ServiceNow support system.
                        </p>
                    </div>
                `,
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`   ✅ Email sent to ${toEmail}`);
            return true;
        } catch (error: any) {
            console.error(`   ⚠️  Email notification failed: ${error.message}`);
            return false;
        }
    }

    isEnabled(): boolean {
        return this.emailEnabled;
    }
}
