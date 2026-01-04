import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import type { VectorDB } from '../rag/vector-db.js';
import type { User, CreateUserInput } from './types.js';

const SALT_ROUNDS = 10;

export class UserManager {
    private vectorDB: VectorDB;

    constructor(vectorDB: VectorDB) {
        this.vectorDB = vectorDB;
    }

    /**
     * Create a new user
     */
    async createUser(input: CreateUserInput): Promise<User> {
        // Check if username already exists
        const existing = await this.getUserByUsername(input.username);
        if (existing) {
            throw new Error('Username already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

        const user: User = {
            id: uuidv4(),
            username: input.username,
            email: input.email,
            passwordHash,
            teamId: input.teamId,
            role: input.role,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Store in ChromaDB
        await this.vectorDB.addUser(user);

        return user;
    }

    /**
     * Get user by username
     */
    async getUserByUsername(username: string): Promise<User | null> {
        return await this.vectorDB.getUserByUsername(username);
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        return await this.vectorDB.getUserById(userId);
    }

    /**
     * Verify user credentials
     */
    async verifyCredentials(username: string, password: string): Promise<User | null> {
        console.log('🔍 Verifying credentials for:', username);
        const user = await this.getUserByUsername(username);
        if (!user) {
            console.warn('⚠️  User not found:', username);
            return null;
        }

        console.log('✅ User found, comparing password...');
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log('🔐 Password comparison result:', isValid);

        if (!isValid) {
            return null;
        }

        return user;
    }

    /**
     * Get all users for a team
     */
    async getUsersByTeam(teamId: string): Promise<User[]> {
        return await this.vectorDB.getUsersByTeam(teamId);
    }

    /**
     * Update user
     */
    async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>): Promise<User | null> {
        const user = await this.getUserById(userId);
        if (!user) {
            return null;
        }

        const updatedUser: User = {
            ...user,
            ...updates,
            id: user.id,
            createdAt: user.createdAt,
            passwordHash: user.passwordHash,
            updatedAt: new Date().toISOString(),
        };

        await this.vectorDB.updateUser(updatedUser);
        return updatedUser;
    }

    /**
     * Update user password
     */
    async updatePassword(userId: string, newPassword: string): Promise<boolean> {
        const user = await this.getUserById(userId);
        if (!user) {
            return false;
        }

        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        const updatedUser: User = {
            ...user,
            passwordHash,
            updatedAt: new Date().toISOString(),
        };

        await this.vectorDB.updateUser(updatedUser);
        return true;
    }

    /**
     * Delete user
     */
    async deleteUser(userId: string): Promise<boolean> {
        return await this.vectorDB.deleteUser(userId);
    }

    /**
     * Get all users
     */
    async getAllUsers(): Promise<User[]> {
        return await this.vectorDB.getAllUsers();
    }
}
