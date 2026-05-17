import { Hono } from 'hono';
import { getDb } from '../db/connection.js';
import { runs, issues, productionViolations } from '../db/schema.js';
import { eq, and, desc, sql, gte } from 'drizzle-orm';

const projectsRouter = new Hono();

/**
 * GET /api/projects/:projectId/stats
 * Get project statistics
 */
projectsRouter.get('/:projectId/stats', async (c) => {
  const projectId = c.req.param('projectId')!;
  const db = await getDb();

  try {
    // Get open issues count
    const openIssuesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(and(
        eq(issues.projectId, projectId),
        eq(issues.status, 'open')
      ));
    const openIssues = Number(openIssuesResult[0]?.count || 0);

    // Get last completed run
    const lastRun = await db.query.runs.findFirst({
      where: and(
        eq(runs.projectId, projectId),
        eq(runs.status, 'completed')
      ),
      orderBy: [desc(runs.completedAt)],
    });

    // Calculate stats from last run
    const totalContracts = lastRun?.totalContracts || 0;
    const passedContracts = lastRun?.passedContracts || 0;
    const passRate = totalContracts > 0 
      ? Math.round((passedContracts / totalContracts) * 100) / 100 
      : 0;

    // Calculate last run duration
    let lastRunDuration = 'N/A';
    if (lastRun?.startedAt && lastRun?.completedAt) {
      const durationMs = lastRun.completedAt.getTime() - lastRun.startedAt.getTime();
      const seconds = Math.round(durationMs / 1000);
      lastRunDuration = seconds < 60 
        ? `${seconds}s` 
        : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    }

    return c.json({
      openIssues,
      totalContracts,
      passRate,
      lastRunDuration,
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    throw error;
  }
});

/**
 * GET /api/projects/:projectId/runs
 * Get recent runs for a project
 */
projectsRouter.get('/:projectId/runs', async (c) => {
  const projectId = c.req.param('projectId')!;
  const limit = parseInt(c.req.query('limit') || '10');
  const db = await getDb();

  try {
    const projectRuns = await db.query.runs.findMany({
      where: eq(runs.projectId, projectId),
      orderBy: [desc(runs.startedAt)],
      limit,
    });

    return c.json(projectRuns);
  } catch (error) {
    console.error('Error fetching runs:', error);
    throw error;
  }
});

/**
 * GET /api/projects/:projectId/issues
 * Get issues for a project with optional filters
 */
projectsRouter.get('/:projectId/issues', async (c) => {
  const projectId = c.req.param('projectId')!;
  const status = c.req.query('status'); // 'open' | 'resolved'
  const severity = c.req.query('severity'); // 'low' | 'medium' | 'high' | 'critical'
  const db = await getDb();

  try {
    const conditions = [eq(issues.projectId, projectId)];
    
    if (status) {
      conditions.push(eq(issues.status, status));
    }
    
    if (severity) {
      conditions.push(eq(issues.severity, severity));
    }

    const projectIssues = await db.query.issues.findMany({
      where: and(...conditions),
      orderBy: [desc(issues.lastSeenAt)],
    });

    return c.json(projectIssues);
  } catch (error) {
    console.error('Error fetching issues:', error);
    throw error;
  }
});

/**
 * GET /api/projects/:projectId/violations
 * Get production violations for a project with optional filters
 */
projectsRouter.get('/:projectId/violations', async (c) => {
  const projectId = c.req.param('projectId')!;
  const since = c.req.query('since'); // ISO date string
  const contract = c.req.query('contract'); // contract name filter
  const db = await getDb();

  try {
    const conditions = [eq(productionViolations.projectId, projectId)];
    
    if (since) {
      conditions.push(gte(productionViolations.timestamp, since));
    }
    
    if (contract) {
      conditions.push(eq(productionViolations.contractName, contract));
    }

    const violations = await db.query.productionViolations.findMany({
      where: and(...conditions),
      orderBy: [desc(productionViolations.timestamp)],
      limit: 100, // Limit to prevent huge responses
    });

    return c.json(violations);
  } catch (error) {
    console.error('Error fetching violations:', error);
    throw error;
  }
});

export default projectsRouter;

// Made with Bob
