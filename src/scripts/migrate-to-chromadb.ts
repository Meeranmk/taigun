/**
 * Migration script to transfer knowledge base data from JSON to Qdrant Cloud
 * Run this once to migrate existing data
 */

import fs from 'fs/promises';
import { VectorDB } from '../rag/vector-db.js';
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import type { KnowledgeBaseEntry } from '../knowledge-base/types.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateToQdrant() {
    console.log('🔄 Starting migration from JSON to Qdrant Cloud...\n');

    // Read existing JSON file
    const jsonPath = './data/knowledge-base.json';
    let entries: KnowledgeBaseEntry[] = [];

    try {
        const data = await fs.readFile(jsonPath, 'utf-8');
        const rawEntries = JSON.parse(data);

        // Convert date strings to Date objects
        entries = rawEntries.map((entry: any) => ({
            ...entry,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
        }));

        console.log(`📄 Found ${entries.length} entries in JSON file\n`);
    } catch (error) {
        console.log('📄 No existing JSON file found or empty, starting fresh\n');
        return;
    }

    if (entries.length === 0) {
        console.log('✅ No entries to migrate\n');
        return;
    }

    // Initialize VectorDB (Qdrant Cloud)
    console.log('🔧 Initializing Qdrant Cloud...');
    const vectorDB = new VectorDB();
    await vectorDB.initialize();

    // Setup embedding function
    if (!process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY) {
        throw new Error('GOOGLE_API_KEY or OPENAI_API_KEY is required. Please set it in your .env file');
    }

    const embeddingModel = process.env.OPENAI_API_KEY
        ? openai.embedding('text-embedding-3-small')
        : google.textEmbeddingModel('text-embedding-004');
    console.log(`🔑 Using ${process.env.OPENAI_API_KEY ? 'OpenAI' : 'Google AI'} embeddings\n`);

    console.log('\n📦 Migrating entries to Qdrant Cloud...\n');

    let migrated = 0;
    let skipped = 0;

    for (const entry of entries) {
        try {
            // Check if already exists
            const existing = await vectorDB.getKBEntryById(entry.id);
            if (existing) {
                console.log(`   ⏭️  Skipping ${entry.id} - already exists`);
                skipped++;
                continue;
            }

            // Generate embedding
            const { embedding } = await embed({
                model: embeddingModel,
                value: entry.problem,
            });

            // Add to Qdrant Cloud
            await vectorDB.addKBEntry(entry, embedding);
            console.log(`   ✓ Migrated: ${entry.problem.substring(0, 50)}...`);
            migrated++;

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`   ❌ Failed to migrate entry ${entry.id}:`, error);
        }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${entries.length}\n`);

    // Create backup of JSON file
    const backupPath = './data/knowledge-base.backup.json';
    try {
        await fs.copyFile(jsonPath, backupPath);
        console.log(`💾 Backup created: ${backupPath}\n`);
    } catch (error) {
        console.error('⚠️  Failed to create backup:', error);
    }
}

// Run migration
migrateToQdrant()
    .then(() => {
        console.log('🎉 Migration script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    });
