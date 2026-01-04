/**
 * Microsoft Teams Helper for sending notifications
 */

import { Client } from '@microsoft/microsoft-graph-client';

export class TeamsHelper {
    private teamsClient: Client;

    constructor(teamsClient: Client) {
        this.teamsClient = teamsClient;
    }

    async sendNotification(callerEmail: string, ticketNumber: string, message: string): Promise<boolean> {
        try {
            console.log(`   📨 Sending Teams message to ${callerEmail}...`);

            // Find Teams user by email
            console.log(`   🔍 Looking up user in Graph API...`);
            let users: any;
            try {
                users = await this.teamsClient
                    .api('/users')
                    .filter(`mail eq '${callerEmail}' or userPrincipalName eq '${callerEmail}'`)
                    .select('id,displayName,mail')
                    .get();

                console.log(`   ✅ Graph API response:`, JSON.stringify(users, null, 2));
            } catch (graphError: any) {
                console.error(`   ❌ Graph API call failed:`, graphError.message);
                if (graphError.body) {
                    console.error(`   📋 Error details:`, JSON.stringify(graphError.body, null, 2));
                }
                return false;
            }

            if (!users.value || users.value.length === 0) {
                console.log(`   ⏭️  User not found in Teams: ${callerEmail}`);
                return false;
            }

            const userId = users.value[0].id;
            console.log(`   ✅ Found user: ${users.value[0].displayName} (${userId})`);

            // Get or create 1:1 chat with the user
            const chatId = await this.getOrCreateChat(userId);

            if (!chatId) {
                console.log(`   ⚠️  Could not create chat with user`);
                return false;
            }

            // Send the message
            await this.teamsClient
                .api(`/chats/${chatId}/messages`)
                .post({
                    body: {
                        contentType: 'text',
                        content: `🎫 **ServiceNow Ticket ${ticketNumber} Updated**\n\n${message}`,
                    },
                });

            console.log(`   ✅ Teams notification sent to ${callerEmail}`);
            return true;
        } catch (error: any) {
            console.error(`   ⚠️  Teams notification failed: ${error.message}`);
            return false;
        }
    }

    private async getOrCreateChat(userId: string): Promise<string | null> {
        try {
            // Try to find existing 1:1 chat
            const chats: any = await this.teamsClient
                .api('/chats')
                .filter(`chatType eq 'oneOnOne'`)
                .expand('members')
                .get();

            // Find chat with this specific user
            for (const chat of chats.value) {
                const members = chat.members || [];
                if (members.some((m: any) => m.userId === userId)) {
                    return chat.id;
                }
            }

            // If no existing chat, create one
            const newChat: any = await this.teamsClient
                .api('/chats')
                .post({
                    chatType: 'oneOnOne',
                    members: [
                        {
                            '@odata.type': '#microsoft.graph.aadUserConversationMember',
                            roles: ['owner'],
                            'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')`,
                        },
                    ],
                });

            return newChat.id;
        } catch (error: any) {
            console.error(`   ⚠️  Failed to get/create chat: ${error.message}`);
            return null;
        }
    }

    static async getCallerEmail(callerSysId: string): Promise<string | null> {
        try {
            const response = await fetch(
                `${process.env.SERVICENOW_INSTANCE_URL}/api/now/table/sys_user/${callerSysId}?sysparm_fields=email`,
                {
                    headers: {
                        'Authorization': 'Basic ' + Buffer.from(
                            `${process.env.SERVICENOW_USERNAME}:${process.env.SERVICENOW_PASSWORD}`
                        ).toString('base64'),
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`ServiceNow API error: ${response.statusText}`);
            }

            const data: any = await response.json();
            return data.result?.email || null;
        } catch (error: any) {
            console.error(`   ⚠️  Failed to fetch caller email: ${error.message}`);
            return null;
        }
    }
}
