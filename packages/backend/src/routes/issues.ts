import { Hono } from 'hono';
import { getDb } from '../db/connection.js';
import { issues, issueOccurrences, runs, contractResults } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const issuesRouter = new Hono();

/**
 * GET /api/issues/:issueId
 * Get issue details with all occurrences
 */
issuesRouter.get('/:issueId', async (c) => {
  const issueId = c.req.param('issueId')!;
  const db = await getDb();

  try {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });

    if (!issue) {
      return c.json({ error: 'Issue not found' }, 404);
    }

    // Get all occurrences with related run and result data
    const occurrences = await db
      .select({
        id: issueOccurrences.id,
        occurredAt: issueOccurrences.occurredAt,
        runId: issueOccurrences.runId,
        resultId: issueOccurrences.resultId,
        runStatus: runs.status,
        runStartedAt: runs.startedAt,
        resultFilePath: contractResults.filePath,
        resultLineNumber: contractResults.lineNumber,
      })
      .from(issueOccurrences)
      .leftJoin(runs, eq(issueOccurrences.runId, runs.id))
      .leftJoin(contractResults, eq(issueOccurrences.resultId, contractResults.id))
      .where(eq(issueOccurrences.issueId, issueId))
      .orderBy(desc(issueOccurrences.occurredAt))
      .limit(50); // Limit to last 50 occurrences

    return c.json({
      ...issue,
      occurrences,
    });
  } catch (error) {
    console.error('Error fetching issue:', error);
    throw error;
  }
});

export default issuesRouter;

// Made with Bob
