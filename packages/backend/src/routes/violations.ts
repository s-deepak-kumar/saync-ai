import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { productionViolations, projects } from '../db/schema.js';
import { validateApiKey } from '../middleware/auth.js';

const violationsRouter = new Hono();

// Zod schema for violations
const violationSchema = z.object({
  contractName: z.string().min(1),
  componentName: z.string().min(1),
  errorMessage: z.string().min(1),
  expectedValue: z.string().optional(),
  observedValue: z.string().optional(),
  sessionId: z.string().min(1),
  userAgent: z.string().min(1),
  viewportWidth: z.number().int().positive(),
  viewportHeight: z.number().int().positive(),
  url: z.string().url(),
  timestamp: z.string().datetime(),
});

const postViolationsSchema = z.object({
  projectId: z.string().min(1),
  violations: z.array(violationSchema).min(1),
});

/**
 * POST /api/violations
 * Report production violations (batched from SDK)
 */
violationsRouter.post(
  '/',
  validateApiKey,
  zValidator('json', postViolationsSchema),
  async (c) => {
    const body = c.req.valid('json');
    const { projectId, violations } = body;

    const db = await getDb();
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

      // Insert all violations
      const violationRecords = violations.map((v) => ({
        id: crypto.randomUUID(),
        projectId,
        contractName: v.contractName,
        componentName: v.componentName,
        errorMessage: v.errorMessage,
        expectedValue: v.expectedValue || null,
        observedValue: v.observedValue || null,
        sessionId: v.sessionId,
        userAgent: v.userAgent,
        viewportWidth: v.viewportWidth,
        viewportHeight: v.viewportHeight,
        url: v.url,
        timestamp: v.timestamp,
        createdAt: now,
      }));

      await db.insert(productionViolations).values(violationRecords);

      return c.json({ received: violations.length }, 201);
    } catch (error) {
      console.error('Error recording violations:', error);
      throw error;
    }
  }
);

export default violationsRouter;

// Made with Bob
