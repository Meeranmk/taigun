import { generateText, embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { v4 as uuidv4 } from 'uuid';
import type { KnowledgeBaseStorage } from '../knowledge-base/storage.js';
import type { KnowledgeBaseEntry } from '../knowledge-base/types.js';
import type {
    ProblemSubmission,
    SimilarCase,
    GeneratedSolution,
    RAGConfig,
    SolutionStep,
} from './types.js';
import { VectorDB } from './vector-db.js';
import { BatchEmbedder } from './batch-embedder.js';

export class RAGEngine {
    private config: RAGConfig;
    private knowledgeBase: KnowledgeBaseStorage;
    private llmProvider: any;
    private embeddingModel: any;
    private vectorDB: VectorDB;
    private batchEmbedder: BatchEmbedder;

    constructor(knowledgeBase: KnowledgeBaseStorage, config?: Partial<RAGConfig>) {
        this.knowledgeBase = knowledgeBase;
        this.config = {
            embeddingModel: config?.embeddingModel || 'text-embedding-3-small',
            similarityThreshold: config?.similarityThreshold || 0.7,
            maxSimilarCases: config?.maxSimilarCases || 5,
            kbPriorityWeight: config?.kbPriorityWeight || 2.0,
            googleApiKey: config?.googleApiKey,
            openaiApiKey: config?.openaiApiKey,
        };

        // Initialize LLM provider based on available API keys (from config or env)
        const openaiKey = this.config.openaiApiKey || process.env.OPENAI_API_KEY;
        const googleKey = this.config.googleApiKey || process.env.GOOGLE_API_KEY;

        if (openaiKey) {
            this.llmProvider = openai('gpt-4o-mini');
            this.embeddingModel = openai.embedding('text-embedding-3-small');
            console.log('   Using OpenAI for RAG');
        } else if (googleKey) {
            this.llmProvider = google('gemini-2.0-flash-exp');
            this.embeddingModel = google.textEmbeddingModel('text-embedding-004');
            console.log('   Using Google for RAG');
        } else {
            console.warn('   ⚠️  No LLM API key configured for RAG. AI solution generation will not work.');
            console.warn('   Configure via Admin Portal: http://localhost:3001/dashboard/settings');
            // Don't throw error - allow initialization to continue
            this.llmProvider = null;
            this.embeddingModel = null;
        }

        // Initialize Vector Database (Qdrant Cloud)
        this.vectorDB = new VectorDB();

        // Initialize Batch Embedder
        this.batchEmbedder = new BatchEmbedder(
            this.vectorDB,
            this.knowledgeBase,
            this.embedText.bind(this)
        );
    }

    /**
     * Initialize vector database and embed knowledge base
     */
    async initialize(): Promise<void> {
        await this.vectorDB.initialize();
        await this.batchEmbedder.embedKnowledgeBase();
    }

    /**
     * Generate embedding for a text string
     */
    private async embedText(text: string): Promise<number[]> {
        try {
            const { embedding } = await embed({
                model: this.embeddingModel,
                value: text,
            });
            return embedding;
        } catch (error) {
            console.error('Failed to generate embedding:', error);
            throw error;
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Find similar cases from knowledge base using Vector DB
     */
    private async findSimilarKBCases(
        problemEmbedding: number[],
        limit: number
    ): Promise<SimilarCase[]> {
        // Query vector database for similar entries
        const results = await this.vectorDB.queryKB(problemEmbedding, limit * 2);
        const similarCases: SimilarCase[] = [];

        for (const result of results) {
            // Apply priority weight to KB entries
            const weightedSimilarity = result.similarity * this.config.kbPriorityWeight;

            if (result.similarity >= this.config.similarityThreshold) {
                // Get full entry from knowledge base for solution details
                const entry = await this.knowledgeBase.getEntryById(result.id);
                if (entry) {
                    similarCases.push({
                        source: 'knowledge-base',
                        id: entry.id,
                        problem: entry.problem,
                        solution: this.formatKBSolution(entry),
                        similarity: weightedSimilarity,
                        metadata: {
                            category: entry.category,
                            tags: entry.tags,
                            priority: entry.priority,
                            usageCount: entry.usageCount,
                        },
                    });
                }
            }
        }

        // Sort by similarity and return top results
        return similarCases
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    /**
     * Format knowledge base solution as text
     */
    private formatKBSolution(entry: KnowledgeBaseEntry): string {
        return entry.solution
            .map((step) => `${step.stepNumber}. ${step.description}`)
            .join('\n');
    }

    /**
     * Find similar cases from ServiceNow tickets
     */
    async findSimilarServiceNowCases(
        problemEmbedding: number[],
        serviceNowAPI: any,
        limit: number
    ): Promise<SimilarCase[]> {
        try {
            // Get resolved tickets from ServiceNow
            const response = await serviceNowAPI.get_pending_tickets({
                keywords: [],
                limit: 100,
            });

            const tickets = JSON.parse(response.content[0].text).data;
            const similarCases: SimilarCase[] = [];

            for (const ticket of tickets) {
                if (!ticket.description) continue;

                // Generate embedding for ticket
                const ticketEmbedding = await this.embedText(ticket.description);
                const similarity = this.cosineSimilarity(problemEmbedding, ticketEmbedding);

                if (similarity >= this.config.similarityThreshold) {
                    similarCases.push({
                        source: 'servicenow',
                        id: ticket.sys_id,
                        problem: ticket.short_description || ticket.description,
                        solution: ticket.close_notes || 'See ticket for resolution details',
                        similarity,
                        metadata: {
                            number: ticket.number,
                            state: ticket.state,
                            priority: ticket.priority,
                        },
                    });
                }
            }

            return similarCases
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, limit);
        } catch (error) {
            console.error('Failed to search ServiceNow:', error);
            return [];
        }
    }

    /**
     * Generate solution using RAG
     */
    async generateSolution(
        submission: ProblemSubmission,
        serviceNowAPI?: any
    ): Promise<GeneratedSolution> {
        try {
            console.log('🔍 Analyzing problem...');

            // Check if knowledge base has any entries
            const kbEntries = await this.knowledgeBase.getEntries();
            const hasKBData = kbEntries.data.length > 0;

            let allCases: SimilarCase[] = [];

            // Try embedding-based search if we have data
            if (hasKBData) {
                try {
                    console.log('🔍 Generating embedding for problem...');
                    const problemEmbedding = await this.embedText(submission.problem);

                    console.log('📚 Searching knowledge base...');
                    const kbCases = await this.findSimilarKBCases(
                        problemEmbedding,
                        this.config.maxSimilarCases
                    );

                    console.log(`Found ${kbCases.length} similar KB cases`);

                    // Optionally search ServiceNow
                    let snowCases: SimilarCase[] = [];
                    if (serviceNowAPI) {
                        console.log('🎫 Searching ServiceNow tickets...');
                        snowCases = await this.findSimilarServiceNowCases(
                            problemEmbedding,
                            serviceNowAPI,
                            this.config.maxSimilarCases
                        );
                        console.log(`Found ${snowCases.length} similar ServiceNow cases`);
                    }

                    // Combine and sort all cases
                    allCases = [...kbCases, ...snowCases]
                        .sort((a, b) => b.similarity - a.similarity)
                        .slice(0, this.config.maxSimilarCases);

                    // Increment usage count for KB entries used
                    for (const case_ of kbCases) {
                        await this.knowledgeBase.incrementUsage(case_.id);
                    }
                } catch (embeddingError) {
                    console.warn('⚠️  Embedding failed, falling back to text search:', embeddingError);
                    // Fallback to simple text matching
                    allCases = await this.findSimilarKBCasesTextBased(
                        submission.problem,
                        this.config.maxSimilarCases
                    );
                }
            } else {
                console.log('📝 Knowledge base is empty, generating solution from AI expertise only');
            }

            console.log('🤖 Generating AI solution...');
            const solution = await this.generateAISolution(submission.problem, allCases);

            return {
                id: uuidv4(),
                problem: submission.problem,
                steps: solution.steps,
                similarCases: allCases,
                confidence: solution.confidence,
                createdAt: new Date(),
            };
        } catch (error) {
            console.error('Failed to generate solution:', error);
            throw error;
        }
    }

    /**
     * Fallback: Find similar cases using simple text matching (no embeddings)
     */
    private async findSimilarKBCasesTextBased(
        problemText: string,
        limit: number
    ): Promise<SimilarCase[]> {
        const allEntries = await this.knowledgeBase.getEntries();
        const similarCases: SimilarCase[] = [];
        const problemLower = problemText.toLowerCase();

        for (const entry of allEntries.data) {
            const entryLower = entry.problem.toLowerCase();

            // Simple keyword matching
            const problemWords = problemLower.split(/\s+/);
            const entryWords = entryLower.split(/\s+/);

            let matchCount = 0;
            for (const word of problemWords) {
                if (word.length > 3 && entryWords.some(ew => ew.includes(word) || word.includes(ew))) {
                    matchCount++;
                }
            }

            const similarity = matchCount / Math.max(problemWords.length, 1);

            if (similarity > 0.2) { // Lower threshold for text matching
                similarCases.push({
                    source: 'knowledge-base',
                    id: entry.id,
                    problem: entry.problem,
                    solution: this.formatKBSolution(entry),
                    similarity: similarity * this.config.kbPriorityWeight,
                    metadata: {
                        category: entry.category,
                        tags: entry.tags,
                        priority: entry.priority,
                        usageCount: entry.usageCount,
                    },
                });
            }
        }

        return similarCases
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    /**
     * Use LLM to generate solution based on similar cases
     */
    private async generateAISolution(
        problem: string,
        similarCases: SimilarCase[]
    ): Promise<{ steps: SolutionStep[]; confidence: number }> {
        // If we have a high-confidence knowledge base match, use it directly
        const bestKBCase = similarCases.find(c => c.source === 'knowledge-base');

        if (bestKBCase && bestKBCase.similarity >= 0.4) {
            console.log(`   ✅ Using exact knowledge base solution (similarity: ${bestKBCase.similarity.toFixed(2)})`);

            // Get the original KB entry to access structured solution steps
            const kbEntries = await this.knowledgeBase.getEntries();
            const kbEntry = kbEntries.data.find(e => e.id === bestKBCase.id);

            if (kbEntry && kbEntry.solution) {
                // Use the exact solution from knowledge base
                return {
                    steps: kbEntry.solution.map(step => ({
                        stepNumber: step.stepNumber,
                        description: step.description,
                        type: step.type as 'action' | 'verification' | 'note',
                    })),
                    confidence: Math.min(bestKBCase.similarity / this.config.kbPriorityWeight, 0.95),
                };
            }
        }

        // Otherwise, use AI to generate solution
        console.log('   🤖 Generating AI solution (no exact match found)');

        const contextText = similarCases
            .map(
                (c, i) =>
                    `Similar Case ${i + 1} (${c.source}, similarity: ${c.similarity.toFixed(2)}):\nProblem: ${c.problem}\nSolution: ${c.solution}`
            )
            .join('\n\n');

        const prompt = `You are an IT support assistant. A user has submitted the following problem:

"${problem}"

${similarCases.length > 0 ? `Here are similar cases from our knowledge base and ticket history:\n\n${contextText}\n\n` : ''}

Based on ${similarCases.length > 0 ? 'the similar cases and ' : ''}your expertise, provide a step-by-step solution to this problem.

IMPORTANT: If there are similar cases provided, use their solutions as the primary guidance. Do not create generic responses.

Return your response in the following JSON format:
{
  "steps": [
    {"stepNumber": 1, "description": "...", "type": "action"},
    {"stepNumber": 2, "description": "...", "type": "verification"},
    {"stepNumber": 3, "description": "...", "type": "note"}
  ],
  "confidence": 0.85
}

Step types:
- "action": Something the user should do
- "verification": How to verify the action worked
- "note": Additional information or context

Confidence should be 0.0-1.0 based on how certain you are about the solution.`;

        try {
            const { text } = await generateText({
                model: this.llmProvider,
                prompt,
            });

            // Parse JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse AI response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return {
                steps: parsed.steps,
                confidence: parsed.confidence || 0.5,
            };
        } catch (error) {
            console.error('Failed to generate AI solution:', error);

            // Fallback solution
            return {
                steps: [
                    {
                        stepNumber: 1,
                        description: 'Our team is investigating this issue and will resolve it soon. We appreciate your patience.',
                        type: 'note',
                    },
                ],
                confidence: 0.3,
            };
        }
    }
}
