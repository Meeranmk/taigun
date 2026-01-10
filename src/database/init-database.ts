/**
 * Database initialization script
 * Runs SQL migrations to set up PostgreSQL schema
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import PostgresClient from './postgres-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initializeDatabase(): Promise<void> {
    console.log('🔧 Initializing PostgreSQL database...');

    try {
        // Initialize connection
        await PostgresClient.initialize();

        // Check if schema already exists
        const schemaExists = await checkDatabaseSchema();

        if (schemaExists) {
            console.log('✅ Database schema already exists, skipping migration');
            return;
        }

        // Read and execute migration SQL
        const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        // Execute migration
        await PostgresClient.query(migrationSQL);

        console.log('✅ Database schema created successfully');
    } catch (error: any) {
        // If error is about duplicate objects (triggers, tables, etc.), schema already exists
        if (error.code === '42710' || error.code === '42P07') {
            console.log('✅ Database schema already exists');
            return;
        }

        console.error('❌ Database initialization failed:', error.message);
        throw error;
    }
}

/**
 * Check if database tables exist
 */
export async function checkDatabaseSchema(): Promise<boolean> {
    try {
        const result = await PostgresClient.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);

        return result.rows[0].exists;
    } catch {
        return false;
    }
}
