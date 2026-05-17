import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { stream } from 'hono/streaming';
import { getDb } from '../db/connection.js';
import { runs, contractResults, projects, issues, issueOccurrences } from '../db/schema.js';
import { validateApiKey } from '../middleware/auth.js';
import { generateIssueHash } from '../utils/hash.js';
import { pubsub } from '../lib/pubsub.js';
import { eq, sql, asc } from 'drizzle-orm';

const runsRouter = new Hono();

// Zod schemas for validation
const createRunSchema = z.object({
  projectId: z.string().min(1),
  environment: z.enum(['local', 'ci']),
  viewport: z.string().optional(),
  gitBranch: z.string().optional(),
  gitCommit: z.string().optional(),
  totalContracts: z.number().int().positive(),
});

const postResultSchema = z.object({
  contractName: z.string().min(1),
  componentName: z.string().min(1),
  status: z.enum(['pass', 'fail', 'warn']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  errorMessage: z.string().optional(),
  expectedValue: z.string().optional(),
  observedValue: z.string().optional(),
  filePath: z.string().optional(),
  lineNumber: z.number().int().optional(),
  stackTrace: z.string().optional(),
});

const completeRunSchema = z.object({
  status: z.enum(['completed', 'failed']),
});

/**
 * POST /api/runs
 * Start a new test run
 */
runsRouter.post(
  '/',
  validateApiKey,
  zValidator('json', createRunSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { projectId, environment, viewport, gitBranch, gitCommit, totalContracts } = body;

    const db = await getDb();
    const runId = crypto.randomUUID();
    const now = new Date();

    try {
      // Ensure project exists (upsert)
      await db
        .insert(projects)
        .values({
          id: projectId,
          name: projectId,
          createdAt: now,
        })
        .onConflictDoNothing();

      // Create run
      await db.insert(runs).values({
        id: runId,
        projectId,
        status: 'running',
        startedAt: now,
        totalContracts,
        passedContracts: 0,
        failedContracts: 0,
        environment,
        viewport: viewport || null,
        gitBranch: gitBranch || null,
        gitCommit: gitCommit || null,
        createdAt: now,
      });

      return c.json({ runId }, 201);
    } catch (error) {
      console.error('Error creating run:', error);
      throw error;
    }
  }
);

/**
 * POST /api/runs/:id/results
 * Report a contract result (called as each contract is verified)
 */
runsRouter.post(
  '/:id/results',
  validateApiKey,
  zValidator('json', postResultSchema),
  async (c) => {
    const runId = c.req.param('id')!;
    const body = c.req.valid('json');
    const {
      contractName,
      componentName,
      status,
      startedAt,
      completedAt,
      errorMessage,
      expectedValue,
      observedValue,
      filePath,
      lineNumber,
      stackTrace,
    } = body;

    const db = await getDb();
    const resultId = crypto.randomUUID();
    const now = new Date();

    try {
      // Get run to find projectId
      const run = await db.query.runs.findFirst({
        where: eq(runs.id, runId),
      });

      if (!run) {
        return c.json({ error: 'Run not found' }, 404);
      }

      // Insert contract result
      await db.insert(contractResults).values({
        id: resultId,
        runId,
        contractName,
        componentName,
        status,
        startedAt: new Date(startedAt),
        completedAt: new Date(completedAt),
        errorMessage: errorMessage || null,
        expectedValue: expectedValue || null,
        observedValue: observedValue || null,
        filePath: filePath || null,
        lineNumber: lineNumber || null,
        stackTrace: stackTrace || null,
        createdAt: now,
      });

      // Update run counters and compute progress inline
      let newPassed = run.passedContracts;
      let newFailed = run.failedContracts;
      
      if (status === 'pass') {
        newPassed = run.passedContracts + 1;
        await db
          .update(runs)
          .set({ passedContracts: sql`${runs.passedContracts} + 1` })
          .where(eq(runs.id, runId));
      } else if (status === 'fail') {
        newFailed = run.failedContracts + 1;
        await db
          .update(runs)
          .set({ failedContracts: sql`${runs.failedContracts} + 1` })
          .where(eq(runs.id, runId));
      }

      let issueId: string | undefined;

      // Handle failure: atomic upsert for issue deduplication
      if (status === 'fail' && errorMessage) {
        const dedupHash = generateIssueHash(run.projectId, contractName, errorMessage);
        const newIssueId = crypto.randomUUID();

        // Atomic upsert: insert new issue or update existing
        const result = await db
          .insert(issues)
          .values({
            id: newIssueId,
            projectId: run.projectId,
            contractName,
            componentName,
            errorMessage,
            status: 'open',
            severity: 'medium',
            firstSeenAt: now,
            lastSeenAt: now,
            occurrenceCount: 1,
            dedupHash,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: issues.dedupHash,
            set: {
              lastSeenAt: now,
              occurrenceCount: sql`${issues.occurrenceCount} + 1`,
            },
          })
          .returning({ id: issues.id });

        issueId = result[0].id;

        // Record issue occurrence
        await db.insert(issueOccurrences).values({
          id: crypto.randomUUID(),
          issueId,
          runId,
          resultId,
          occurredAt: now,
          createdAt: now,
        });
      }

      // Publish to SSE subscribers
      await pubsub.publish(runId, 'result', { contractResult: {
        id: resultId,
        runId,
        contractName,
        componentName,
        status,
        startedAt: new Date(startedAt),
        completedAt: new Date(completedAt),
        errorMessage: errorMessage || null,
        expectedValue: expectedValue || null,
        observedValue: observedValue || null,
        filePath: filePath || null,
        lineNumber: lineNumber || null,
        stackTrace: stackTrace || null,
        createdAt: now,
      }});

      // Publish progress update using inline computed values
      await pubsub.publish(runId, 'progress', {
        passed: newPassed,
        failed: newFailed,
        total: run.totalContracts,
      });

      return c.json({ resultId, issueId }, 201);
    } catch (error) {
      console.error('Error creating result:', error);
      throw error;
    }
  }
);

/**
 * POST /api/runs/:id/complete
 * Mark a run as completed
 */
runsRouter.post(
  '/:id/complete',
  validateApiKey,
  zValidator('json', completeRunSchema),
  async (c) => {
    const runId = c.req.param('id')!;
    const body = c.req.valid('json');
    const { status } = body;

    const db = await getDb();

    try {
      const result = await db
        .update(runs)
        .set({
          status,
          completedAt: new Date(),
        })
        .where(eq(runs.id, runId))
        .returning({ id: runs.id });

      if (result.length === 0) {
        return c.json({ error: 'Run not found' }, 404);
      }

      // Publish complete event to SSE subscribers
      await pubsub.publish(runId, 'complete', { status });

      return c.json({ success: true });
    } catch (error) {
      console.error('Error completing run:', error);
      throw error;
    }
  }
);

export default runsRouter;

// Made with Bob

/**
 * GET /api/runs/:id
 * Get run details with all results
 */
runsRouter.get('/:id', async (c) => {
  const runId = c.req.param('id')!;
  const db = await getDb();

  try {
    const run = await db.query.runs.findFirst({
      where: eq(runs.id, runId),
    });

    if (!run) {
      return c.json({ error: 'Run not found' }, 404);
    }

    // Get all results for this run (chronological order, oldest first)
    const results = await db.query.contractResults.findMany({
      where: eq(contractResults.runId, runId),
      orderBy: [asc(contractResults.createdAt)],
    });

    return c.json({
      ...run,
      results,
    });
  } catch (error) {
    console.error('Error fetching run:', error);
    throw error;
  }
});

/**
 * GET /api/runs/:id/stream
 * Server-Sent Events endpoint for live run updates
 * Emits existing results first, then live updates as they arrive
 */
runsRouter.get('/:id/stream', async (c) => {
  const runId = c.req.param('id')!;
  const db = await getDb();

  return stream(c, async (stream) => {
    // Set SSE headers
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');

    try {
      // First, send all existing results (chronological order, oldest first)
      const existingResults = await db.query.contractResults.findMany({
        where: eq(contractResults.runId, runId),
        orderBy: [asc(contractResults.createdAt)],
      });

      for (const result of existingResults) {
        await stream.write(`event: result\ndata: ${JSON.stringify({ contractResult: result })}\n\n`);
      }

      // Get current run status for progress
      const run = await db.query.runs.findFirst({
        where: eq(runs.id, runId),
      });

      if (run) {
        await stream.write(`event: progress\ndata: ${JSON.stringify({
          passed: run.passedContracts,
          failed: run.failedContracts,
          total: run.totalContracts,
        })}\n\n`);

        // If run is already complete, send complete event
        if (run.status === 'completed' || run.status === 'failed') {
          await stream.write(`event: complete\ndata: ${JSON.stringify({ status: run.status })}\n\n`);
          // Let function exit normally, Hono will close the stream
        }
      }

      // Subscribe to live updates (only if run is not complete)
      if (run && (run.status === 'running' || run.status === 'pending')) {
        const unsubscribe = pubsub.subscribe(runId, async (event, data) => {
          await stream.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        });

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(async () => {
          try {
            await stream.write(': heartbeat\n\n');
          } catch {
            clearInterval(heartbeat);
            unsubscribe();
          }
        }, 15000); // Every 15 seconds

        // Register cleanup on abort
        stream.onAbort(() => {
          clearInterval(heartbeat);
          unsubscribe();
        });

        // Wait for client disconnect
        await stream.sleep(Number.MAX_SAFE_INTEGER);
      }
    } catch (error) {
      console.error('SSE stream error:', error);
    }
  });
});
