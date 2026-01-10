/**
 * User Repository
 * Handles all database operations for users
 */

import type { Pool, PoolClient } from 'pg';
import PostgresClient from '../postgres-client.js';
import type { User, CreateUserInput } from '../../auth/types.js';

export class UserRepository {
    private db: typeof PostgresClient;

    constructor() {
        this.db = PostgresClient;
    }

    /**
     * Create a new user
     */
    async create(user: User): Promise<User> {
        const query = `
            INSERT INTO users (id, username, email, password_hash, team_id, role, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            user.id,
            user.username,
            user.email,
            user.passwordHash,
            user.teamId || null,
            user.role,
            user.createdAt,
            user.updatedAt
        ];

        const result = await this.db.query<User>(query, values);
        return this.mapToUser(result.rows[0]);
    }

    /**
     * Find user by username
     */
    async findByUsername(username: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await this.db.query<any>(query, [username]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToUser(result.rows[0]);
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.db.query<any>(query, [id]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToUser(result.rows[0]);
    }

    /**
     * Find all users by team ID
     */
    async findByTeamId(teamId: string): Promise<User[]> {
        const query = 'SELECT * FROM users WHERE team_id = $1 ORDER BY created_at DESC';
        const result = await this.db.query<any>(query, [teamId]);

        return result.rows.map(row => this.mapToUser(row));
    }

    /**
     * Get all users
     */
    async findAll(): Promise<User[]> {
        const query = 'SELECT * FROM users ORDER BY created_at DESC';
        const result = await this.db.query<any>(query);

        return result.rows.map(row => this.mapToUser(row));
    }

    /**
     * Update user
     */
    async update(id: string, user: Partial<User>): Promise<User | null> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (user.username !== undefined) {
            fields.push(`username = $${paramCount++}`);
            values.push(user.username);
        }
        if (user.email !== undefined) {
            fields.push(`email = $${paramCount++}`);
            values.push(user.email);
        }
        if (user.passwordHash !== undefined) {
            fields.push(`password_hash = $${paramCount++}`);
            values.push(user.passwordHash);
        }
        if (user.teamId !== undefined) {
            fields.push(`team_id = $${paramCount++}`);
            values.push(user.teamId);
        }
        if (user.role !== undefined) {
            fields.push(`role = $${paramCount++}`);
            values.push(user.role);
        }

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);
        const query = `
            UPDATE users 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await this.db.query<any>(query, values);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapToUser(result.rows[0]);
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<boolean> {
        const query = 'DELETE FROM users WHERE id = $1';
        const result = await this.db.query(query, [id]);

        return (result.rowCount ?? 0) > 0;
    }

    /**
     * Check if username exists
     */
    async usernameExists(username: string): Promise<boolean> {
        const query = 'SELECT COUNT(*) as count FROM users WHERE username = $1';
        const result = await this.db.query<{ count: string }>(query, [username]);

        return parseInt(result.rows[0].count) > 0;
    }

    /**
     * Map database row to User object
     */
    private mapToUser(row: any): User {
        return {
            id: row.id,
            username: row.username,
            email: row.email,
            passwordHash: row.password_hash,
            teamId: row.team_id,
            role: row.role,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
