import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { UserRepository } from '../database/repositories/user-repository.js';
import type { User, CreateUserInput } from './types.js';

const SALT_ROUNDS = 10;

export class UserManager {
    private userRepository: UserRepository;

    constructor() {
        this.userRepository = new UserRepository();
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

        // Store in PostgreSQL
        await this.userRepository.create(user);

        return user;
    }

    /**
     * Get user by username
     */
    async getUserByUsername(username: string): Promise<User | null> {
        return await this.userRepository.findByUsername(username);
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        return await this.userRepository.findById(userId);
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
        return await this.userRepository.findByTeamId(teamId);
    }

    /**
     * Update user
     */
    async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt' | 'passwordHash'>>): Promise<User | null> {
        return await this.userRepository.update(userId, updates);
    }

    /**
     * Update user password
     */
    async updatePassword(userId: string, newPassword: string): Promise<boolean> {
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        const result = await this.userRepository.update(userId, { passwordHash });
        return result !== null;
    }

    /**
     * Delete user
     */
    async deleteUser(userId: string): Promise<boolean> {
        return await this.userRepository.delete(userId);
    }

    /**
     * Get all users
     */
    async getAllUsers(): Promise<User[]> {
        return await this.userRepository.findAll();
    }
}
