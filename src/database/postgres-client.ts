/**
 * PostgreSQL Database Client
 * Manages connection pool and provides database access
 */

import pg from 'pg';
const { Pool } = pg;

export class PostgresClient {
    private pool: pg.Pool | null = null;
    private static instance: PostgresClient;

    private constructor() { }

    /**
     * Get singleton instance
     */
    static getInstance(): PostgresClient {
        if (!PostgresClient.instance) {
            PostgresClient.instance = new PostgresClient();
        }
        return PostgresClient.instance;
    }

    /**
     * Initialize database connection pool
     */
    async initialize(): Promise<void> {
        const config: pg.PoolConfig = {
            host: process.env.PG_HOST,
            port: parseInt(process.env.PG_PORT || '5432'),
            database: process.env.PG_NAME,
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            ssl: {
                rejectUnauthorized: false // Accept Aiven's SSL certificate
            },
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        this.pool = new Pool(config);

        // Test connection
        try {
            const client = await this.pool.connect();
            console.log('✅ PostgreSQL connected successfully');
            client.release();
        } catch (error) {
            console.error('❌ PostgreSQL connection failed:', error);
            throw error;
        }

        // Handle pool errors
        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle PostgreSQL client', err);
        });
    }

    /**
     * Get database pool
     */
    getPool(): pg.Pool {
        if (!this.pool) {
            throw new Error('PostgreSQL pool not initialized. Call initialize() first.');
        }
        return this.pool;
    }

    /**
     * Execute a query
     */
    async query<T extends pg.QueryResultRow = pg.QueryResultRow>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
        const pool = this.getPool();
        return await pool.query<T>(text, params);
    }

    /**
     * Get a client from the pool for transactions
     */
    async getClient(): Promise<pg.PoolClient> {
        const pool = this.getPool();
        return await pool.connect();
    }

    /**
     * Close all connections
     */
    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            console.log('PostgreSQL pool closed');
        }
    }
}

export default PostgresClient.getInstance();
