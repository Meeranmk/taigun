import { v4 as uuidv4 } from 'uuid';
import { TeamRepository } from '../database/repositories/team-repository.js';
import type { Team, CreateTeamInput } from './types.js';
import { encrypt, decrypt } from './crypto-utils.js';

export class TeamManager {
    private teamRepository: TeamRepository;

    constructor() {
        this.teamRepository = new TeamRepository();
    }

    /**
     * Create a new team
     */
    async createTeam(input: CreateTeamInput): Promise<Team> {
        // Encrypt ServiceNow password
        const serviceNowPasswordEncrypted = encrypt(input.serviceNowPassword);

        const team: Team = {
            id: uuidv4(),
            name: input.name,
            serviceNowUrl: input.serviceNowUrl,
            serviceNowUsername: input.serviceNowUsername,
            serviceNowPasswordEncrypted,
            settings: {
                ticketCheckInterval: input.settings?.ticketCheckInterval || 30000,
                enableTicketMonitor: input.settings?.enableTicketMonitor ?? true,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Store in PostgreSQL
        await this.teamRepository.create(team);

        return team;
    }

    /**
     * Get team by ID
     */
    async getTeamById(teamId: string): Promise<Team | null> {
        return await this.teamRepository.findById(teamId);
    }

    /**
     * Get team with decrypted password
     */
    async getTeamWithCredentials(teamId: string): Promise<Team & { serviceNowPassword: string } | null> {
        const team = await this.getTeamById(teamId);
        if (!team) {
            return null;
        }

        const serviceNowPassword = decrypt(team.serviceNowPasswordEncrypted);

        return {
            ...team,
            serviceNowPassword,
        };
    }

    /**
     * Update team
     */
    async updateTeam(
        teamId: string,
        updates: Partial<Omit<CreateTeamInput, 'serviceNowPassword'> & { serviceNowPassword?: string }>
    ): Promise<Team | null> {
        const team = await this.getTeamById(teamId);
        if (!team) {
            return null;
        }

        // Encrypt password if provided
        let serviceNowPasswordEncrypted = team.serviceNowPasswordEncrypted;
        if (updates.serviceNowPassword) {
            serviceNowPasswordEncrypted = encrypt(updates.serviceNowPassword);
        }

        const updatedTeam: Partial<Team> = {
            name: updates.name,
            serviceNowUrl: updates.serviceNowUrl,
            serviceNowUsername: updates.serviceNowUsername,
            serviceNowPasswordEncrypted: updates.serviceNowPassword ? serviceNowPasswordEncrypted : undefined,
            settings: updates.settings ? {
                ticketCheckInterval: updates.settings.ticketCheckInterval ?? team.settings.ticketCheckInterval,
                enableTicketMonitor: updates.settings.enableTicketMonitor ?? team.settings.enableTicketMonitor,
            } : undefined,
        };

        return await this.teamRepository.update(teamId, updatedTeam);
    }

    /**
     * Delete team
     */
    async deleteTeam(teamId: string): Promise<boolean> {
        return await this.teamRepository.delete(teamId);
    }

    /**
     * Get all teams
     */
    async getAllTeams(): Promise<Team[]> {
        return await this.teamRepository.findAll();
    }

    /**
     * Test ServiceNow connection for a team
     */
    async testConnection(teamId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const teamWithCreds = await this.getTeamWithCredentials(teamId);
            if (!teamWithCreds) {
                return { success: false, error: 'Team not found' };
            }

            // Import ServiceNow API
            const { ServiceNowAPI } = await import('../index.js');

            const api = new ServiceNowAPI({
                instanceUrl: teamWithCreds.serviceNowUrl,
                username: teamWithCreds.serviceNowUsername,
                password: teamWithCreds.serviceNowPassword,
            });

            // Test connection by fetching one ticket
            await api.get_pending_tickets({ keywords: [], limit: 1 });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
