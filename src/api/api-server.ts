import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import session from 'express-session';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import type { KnowledgeBaseStorage } from '../knowledge-base/storage.js';
import type { RAGEngine } from '../rag/rag-engine.js';
import type { KnowledgeBaseEntry } from '../knowledge-base/types.js';
import type { ProblemSubmission } from '../rag/types.js';
import { UserManager } from '../auth/user-manager.js';
import { TeamManager } from '../auth/team-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extend session data type
declare module 'express-session' {
    interface SessionData {
        isAuthenticated?: boolean;
        username?: string;
        userId?: string;
        role?: 'admin' | 'user';
        teamId?: string;
    }
}

export class APIServer {
    private app: express.Application;
    private knowledgeBase: KnowledgeBaseStorage;
    private ragEngine: RAGEngine;
    private serviceNowAPI: any;
    private port: number;
    private userManager: UserManager;
    private teamManager: TeamManager;

    constructor(
        knowledgeBase: KnowledgeBaseStorage,
        ragEngine: RAGEngine,
        serviceNowAPI: any,
        port: number = 3000
    ) {
        this.app = express();
        this.knowledgeBase = knowledgeBase;
        this.ragEngine = ragEngine;
        this.serviceNowAPI = serviceNowAPI;
        this.port = port;
        this.userManager = new UserManager();
        this.teamManager = new TeamManager();

        this.initializeMiddleware();
        this.initializeRoutes();
    }

    /**
     * Initialize default admin user if no users exist
     */
    async initialize(): Promise<void> {
        // Check if any users exist
        const users = await this.userManager.getAllUsers();

        if (users.length === 0) {
            console.log('🔐 No users found. Creating default admin user...');

            // Create default team first
            const defaultTeam = await this.teamManager.createTeam({
                name: 'Default Team',
                serviceNowUrl: process.env.SERVICENOW_INSTANCE_URL || '',
                serviceNowUsername: process.env.SERVICENOW_USERNAME || '',
                serviceNowPassword: process.env.SERVICENOW_PASSWORD || '',
                settings: {
                    ticketCheckInterval: 60000,
                    enableTicketMonitor: true,
                },
            });

            // Create default admin user
            await this.userManager.createUser({
                username: 'admin',
                email: 'admin@localhost',
                password: 'admin123',
                teamId: defaultTeam.id,
                role: 'admin',
            });

            console.log('✅ Default admin user created:');
            console.log('   Username: admin');
            console.log('   Password: admin123');
            console.log('   ⚠️  IMPORTANT: Please change this password after first login!');
        } else {
            console.log(`✅ Found ${users.length} existing user(s)`);
        }
    }


    /**
     * Setup middleware
     */
    private initializeMiddleware(): void {
        // CORS
        this.app.use(cors({
            origin: process.env.ENABLE_CORS === 'true' ? '*' : false,
            credentials: true,
        }));

        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Session management
        this.app.use(
            session({
                secret: process.env.ADMIN_SESSION_SECRET || 'your-secret-key-change-in-production',
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: false, // Set to true in production with HTTPS
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000, // 24 hours
                },
            })
        );

        // Static files
        const publicPath = path.join(__dirname, '../../public');
        this.app.use(express.static(publicPath));
    }

    /**
     * Authentication middleware
     */
    private requireAuth = (req: Request, res: Response, next: NextFunction): void => {
        console.log('🔐 Auth check:', {
            isAuthenticated: req.session.isAuthenticated,
            username: req.session.username,
            role: req.session.role,
            sessionID: req.sessionID,
        });

        if (req.session.isAuthenticated) {
            next();
        } else {
            console.warn('⚠️  Unauthorized access attempt');
            res.status(401).json({ error: 'Unauthorized' });
        }
    };

    /**
     * Admin-only middleware
     */
    private requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
        if (req.session.isAuthenticated && req.session.role === 'admin') {
            next();
        } else {
            console.warn('⚠️  Admin access denied');
            res.status(403).json({ error: 'Admin access required' });
        }
    };

    /**
     * Setup routes
     */
    private initializeRoutes(): void {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // ===== USER ENDPOINTS =====

        /**
         * Submit a problem and get AI-generated solution
         */
        this.app.post('/api/submit-problem', async (req: Request, res: Response) => {
            try {
                const { problem, userEmail, userName } = req.body;

                if (!problem || typeof problem !== 'string') {
                    return res.status(400).json({ error: 'Problem description is required' });
                }

                const submission: ProblemSubmission = {
                    problem,
                    userEmail,
                    userName,
                };

                const solution = await this.ragEngine.generateSolution(
                    submission,
                    this.serviceNowAPI
                );

                res.json({
                    success: true,
                    solution,
                });
            } catch (error: any) {
                console.error('Error submitting problem:', error);
                res.status(500).json({
                    error: 'Failed to generate solution',
                    message: error.message,
                });
            }
        });

        /**
         * Get solution by ID (for future reference)
         */
        this.app.get('/api/solution/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                // For now, we don't store solutions, but this could be added
                res.status(501).json({ error: 'Not implemented yet' });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // ===== ADMIN ENDPOINTS =====

        /**
         * Admin login
         */
        this.app.post('/api/admin/auth', async (req: Request, res: Response) => {
            try {
                const { username, password } = req.body;
                console.log('🔐 Login attempt:', { username, passwordLength: password?.length });

                const user = await this.userManager.verifyCredentials(username, password);
                console.log('🔐 User verification result:', user ? 'SUCCESS' : 'FAILED');

                if (user) {
                    req.session.isAuthenticated = true;
                    req.session.username = user.username;
                    req.session.userId = user.id;
                    req.session.role = user.role;
                    req.session.teamId = user.teamId;

                    res.json({
                        success: true,
                        message: 'Logged in successfully',
                        user: {
                            username: user.username,
                            role: user.role,
                        }
                    });
                } else {
                    console.warn('⚠️  Login failed for username:', username);
                    res.status(401).json({ error: 'Invalid credentials' });
                }
            } catch (error: any) {
                console.error('Login error:', error);
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Admin logout
         */
        this.app.post('/api/admin/logout', (req: Request, res: Response) => {
            req.session.destroy((err) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to logout' });
                } else {
                    res.json({ success: true });
                }
            });
        });

        /**
         * Check auth status
         */
        this.app.get('/api/admin/auth/status', (req: Request, res: Response) => {
            res.json({
                isAuthenticated: req.session.isAuthenticated || false,
                username: req.session.username,
                role: req.session.role,
            });
        });


        /**
         * Get all knowledge base entries
         */
        this.app.get('/api/admin/knowledge-base', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 10;
                const category = req.query.category as string;
                const searchQuery = req.query.search as string;

                const result = await this.knowledgeBase.getEntries(
                    { category, searchQuery },
                    { page, limit }
                );

                res.json(result);
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Get single knowledge base entry
         */
        this.app.get('/api/admin/knowledge-base/:id', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const entry = await this.knowledgeBase.getEntryById(id);

                if (!entry) {
                    return res.status(404).json({ error: 'Entry not found' });
                }

                res.json(entry);
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Add new knowledge base entry
         */
        this.app.post('/api/admin/knowledge-base', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { problem, solution, category, tags, priority, createdBy } = req.body;

                if (!problem || !solution || !category) {
                    return res.status(400).json({
                        error: 'Problem, solution, and category are required',
                    });
                }

                const entry = await this.knowledgeBase.addEntry({
                    problem,
                    solution,
                    category,
                    tags: tags || [],
                    priority: priority || 'medium',
                    createdBy: createdBy || req.session.username || 'admin',
                });

                res.status(201).json(entry);
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Update knowledge base entry
         */
        this.app.put('/api/admin/knowledge-base/:id', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const updates = req.body;

                const entry = await this.knowledgeBase.updateEntry(id, updates);

                if (!entry) {
                    return res.status(404).json({ error: 'Entry not found' });
                }

                res.json(entry);
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Delete knowledge base entry
         */
        this.app.delete('/api/admin/knowledge-base/:id', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const success = await this.knowledgeBase.deleteEntry(id);

                if (!success) {
                    return res.status(404).json({ error: 'Entry not found' });
                }

                res.json({ success: true, message: 'Entry deleted' });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Get analytics
         */
        this.app.get('/api/admin/analytics', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const analytics = await this.knowledgeBase.getAnalytics();
                res.json(analytics);
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Get application settings
         */
        this.app.get('/api/admin/settings', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { SettingsManager } = await import('../config/settings-manager.js');
                const settingsManager = new SettingsManager();

                const settings = await settingsManager.getSettings();

                if (!settings) {
                    return res.json({
                        serviceNowUrl: '',
                        serviceNowUsername: '',
                        ticketCheckInterval: 30000,
                        enableTicketMonitor: true,
                    });
                }

                res.json({
                    serviceNowUrl: settings.serviceNowUrl,
                    serviceNowUsername: settings.serviceNowUsername,
                    ticketCheckInterval: settings.ticketCheckInterval,
                    enableTicketMonitor: settings.enableTicketMonitor,
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Update application settings
         */
        this.app.put('/api/admin/settings', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { SettingsManager } = await import('../config/settings-manager.js');
                const settingsManager = new SettingsManager();

                const { serviceNowUrl, serviceNowUsername, serviceNowPassword, ticketCheckInterval, enableTicketMonitor } = req.body;

                const settings = await settingsManager.updateSettings({
                    serviceNowUrl,
                    serviceNowUsername,
                    serviceNowPassword,
                    ticketCheckInterval,
                    enableTicketMonitor,
                });

                res.json({
                    success: true,
                    message: 'Settings updated successfully',
                    settings: {
                        serviceNowUrl: settings.serviceNowUrl,
                        serviceNowUsername: settings.serviceNowUsername,
                        ticketCheckInterval: settings.ticketCheckInterval,
                        enableTicketMonitor: settings.enableTicketMonitor,
                    },
                });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Test ServiceNow connection
         */
        this.app.post('/api/admin/settings/test-connection', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { SettingsManager } = await import('../config/settings-manager.js');
                const settingsManager = new SettingsManager();

                const { serviceNowUrl, serviceNowUsername, serviceNowPassword } = req.body;

                if (!serviceNowUrl || !serviceNowUsername || !serviceNowPassword) {
                    return res.status(400).json({ error: 'All fields are required' });
                }

                const result = await settingsManager.testConnection(
                    serviceNowUrl,
                    serviceNowUsername,
                    serviceNowPassword
                );

                res.json(result);
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // ===== USER MANAGEMENT ENDPOINTS =====

        /**
         * Get all users (admin only)
         */
        this.app.get('/api/admin/users', this.requireAdmin, async (req: Request, res: Response) => {
            try {
                const users = await this.userManager.getAllUsers();

                // Remove password hashes from response
                const safeUsers = users.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    teamId: user.teamId,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                }));

                res.json({ success: true, users: safeUsers });
            } catch (error: any) {
                console.error('Error fetching users:', error);
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Create new user (admin only)
         */
        this.app.post('/api/admin/users', this.requireAdmin, async (req: Request, res: Response) => {
            try {
                const { username, email, password, role } = req.body;

                if (!username || !password) {
                    return res.status(400).json({ error: 'Username and password are required' });
                }

                // Use the current user's team
                const teamId = req.session.teamId!;

                const user = await this.userManager.createUser({
                    username,
                    email: email || `${username}@localhost`,
                    password,
                    teamId,
                    role: role || 'user',
                });

                res.status(201).json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        teamId: user.teamId,
                        createdAt: user.createdAt,
                    },
                });
            } catch (error: any) {
                console.error('Error creating user:', error);
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Delete user (admin only)
         */
        this.app.delete('/api/admin/users/:userId', this.requireAdmin, async (req: Request, res: Response) => {
            try {
                const { userId } = req.params;

                // Prevent deleting yourself
                if (userId === req.session.userId) {
                    return res.status(400).json({ error: 'Cannot delete your own account' });
                }

                const success = await this.userManager.deleteUser(userId);

                if (success) {
                    res.json({ success: true, message: 'User deleted successfully' });
                } else {
                    res.status(404).json({ error: 'User not found' });
                }
            } catch (error: any) {
                console.error('Error deleting user:', error);
                res.status(500).json({ error: error.message });
            }
        });

        /**
         * Change password (authenticated users)
         */
        this.app.put('/api/admin/users/password', this.requireAuth, async (req: Request, res: Response) => {
            try {
                const { currentPassword, newPassword } = req.body;

                if (!newPassword) {
                    return res.status(400).json({ error: 'New password is required' });
                }

                // Verify current password if provided
                if (currentPassword) {
                    const user = await this.userManager.verifyCredentials(
                        req.session.username!,
                        currentPassword
                    );

                    if (!user) {
                        return res.status(401).json({ error: 'Current password is incorrect' });
                    }
                }

                const success = await this.userManager.updatePassword(
                    req.session.userId!,
                    newPassword
                );

                if (success) {
                    res.json({ success: true, message: 'Password changed successfully' });
                } else {
                    res.status(500).json({ error: 'Failed to change password' });
                }
            } catch (error: any) {
                console.error('Error changing password:', error);
                res.status(500).json({ error: error.message });
            }
        });


        // ===== PUBLIC CHAT ENDPOINT =====
        this.app.post('/api/chat', async (req: Request, res: Response) => {
            try {
                const { question } = req.body;
                if (!question) {
                    return res.status(400).json({ error: 'Question is required' });
                }

                // Use RAG engine to find answer - pass as ProblemSubmission object
                const result = await this.ragEngine.generateSolution({
                    problem: question,
                });

                // Extract sources from similar cases
                const sources = result.similarCases
                    ? result.similarCases
                        .filter((c: any) => c.similarity > 0.7)
                        .map((c: any) => c.problem)
                        .slice(0, 3)
                    : [];

                // Format steps into readable text
                let answer = 'No solution found.';
                if (result.steps && Array.isArray(result.steps) && result.steps.length > 0) {
                    answer = result.steps
                        .map((step: any) => {
                            // Remove leading "1. ", "2. " etc from description
                            const desc = step.description || '';
                            return desc.replace(/^\d+\.\s*/, '');
                        })
                        .join('\n\n');
                } else if (typeof result.steps === 'string') {
                    answer = result.steps;
                }

                console.log('📤 Chat response:', { answer: answer.substring(0, 100), confidence: result.confidence, sourcesCount: sources.length });

                res.json({
                    answer,
                    confidence: result.confidence,
                    sources: sources.length > 0 ? sources : undefined,
                });
            } catch (error: any) {
                console.error('Chat error:', error);
                res.status(500).json({ error: 'Failed to generate answer' });
            }
        });


        // ===== TEST ENDPOINTS =====

        /**
         * Dummy test endpoint - Get incident by ID
         * This is a test endpoint that returns mock incident data
         */
        this.app.get('/api/test/incident/:incidentId', async (req: Request, res: Response) => {
            try {
                const { incidentId } = req.params;

                if (!incidentId) {
                    return res.status(400).json({ error: 'Incident ID is required' });
                }

                // Generate mock incident data
                const mockIncident = {
                    id: incidentId,
                    number: `INC${incidentId.padStart(7, '0')}`,
                    shortDescription: `Test incident ${incidentId}`,
                    description: `This is a dummy test incident with ID: ${incidentId}. This endpoint is for testing purposes only.`,
                    state: 'New',
                    priority: '3 - Moderate',
                    category: 'Software',
                    assignedTo: 'Test User',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    status: 'open',
                    impact: '3 - Low',
                    urgency: '3 - Low',
                };

                console.log(`📋 Test endpoint called for incident: ${incidentId}`);

                res.json({
                    success: true,
                    incident: mockIncident,
                    message: 'This is a dummy test endpoint',
                });
            } catch (error: any) {
                console.error('Test endpoint error:', error);
                res.status(500).json({
                    error: 'Failed to retrieve test incident',
                    message: error.message
                });
            }
        });

        // Redirect root to admin portal
        this.app.get('/', (req, res) => {
            res.redirect('/admin');
        });

        this.app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public/admin.html'));
        });
    }

    /**
     * Start the server
     */
    async start(): Promise<void> {
        await this.initialize();

        this.app.listen(this.port, () => {
            console.log(`\n🌐 API Server running on http://localhost:${this.port}`);
            console.log(`   Admin Portal: http://localhost:${this.port}/admin`);
        });
    }
}



