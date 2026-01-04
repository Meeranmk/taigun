/**
 * Script to reset admin user
 * Run this to delete and recreate the admin user with correct credentials
 */

import { VectorDB } from './src/rag/vector-db.js';
import { UserManager } from './src/auth/user-manager.js';
import { TeamManager } from './src/auth/team-manager.js';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdminUser() {
    console.log('🔄 Resetting admin user...\n');

    // Initialize VectorDB
    const vectorDB = new VectorDB();
    await vectorDB.initialize();

    const userManager = new UserManager(vectorDB);
    const teamManager = new TeamManager(vectorDB);

    // Get all users
    const users = await userManager.getAllUsers();
    console.log(`Found ${users.length} existing users`);

    // Delete all users
    for (const user of users) {
        console.log(`Deleting user: ${user.username} (${user.id})`);
        await userManager.deleteUser(user.id);
    }

    // Get all teams
    const teams = await teamManager.getAllTeams();
    console.log(`\nFound ${teams.length} existing teams`);

    // Delete all teams
    for (const team of teams) {
        console.log(`Deleting team: ${team.name} (${team.id})`);
        await teamManager.deleteTeam(team.id);
    }

    // Create default team
    console.log('\n📦 Creating default team...');
    const defaultTeam = await teamManager.createTeam({
        name: 'Default Team',
        serviceNowUrl: process.env.SERVICENOW_INSTANCE_URL || '',
        serviceNowUsername: process.env.SERVICENOW_USERNAME || '',
        serviceNowPassword: process.env.SERVICENOW_PASSWORD || '',
        settings: {
            ticketCheckInterval: 60000,
            enableTicketMonitor: true,
        },
    });
    console.log(`✅ Created team: ${defaultTeam.name}`);

    // Create admin user
    console.log('\n👤 Creating admin user...');
    const adminUser = await userManager.createUser({
        username: 'admin',
        email: 'admin@localhost',
        password: 'admin123',
        teamId: defaultTeam.id,
        role: 'admin',
    });

    console.log('\n✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log(`   User ID: ${adminUser.id}`);
    console.log(`   Team ID: ${defaultTeam.id}`);

    process.exit(0);
}

resetAdminUser().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
