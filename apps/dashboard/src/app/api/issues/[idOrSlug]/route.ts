import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import {
  issues,
  issueOccurrences,
  runs,
  contractResults,
} from '@/lib/db/schema';
import { slugifyContract, looksLikeUuid } from '@/lib/slug';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { idOrSlug: string } },
) {
  const db = getDb();
  const { idOrSlug } = params;

  let issue = looksLikeUuid(idOrSlug)
    ? await db.query.issues.findFirst({ where: eq(issues.id, idOrSlug) })
    : undefined;

  if (!issue) {
    const candidates = await db.query.issues.findMany();
    issue = candidates.find((row) => slugifyContract(row.contractName) === idOrSlug);
  }

  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const occurrences = await db
    .select({
      id: issueOccurrences.id,
      occurredAt: issueOccurrences.occurredAt,
      runId: issueOccurrences.runId,
      resultId: issueOccurrences.resultId,
      runStatus: runs.status,
      runStartedAt: runs.startedAt,
      runEnvironment: runs.environment,
      runGitBranch: runs.gitBranch,
      runGitCommit: runs.gitCommit,
      resultFilePath: contractResults.filePath,
      resultLineNumber: contractResults.lineNumber,
      resultStackTrace: contractResults.stackTrace,
      resultExpectedValue: contractResults.expectedValue,
      resultObservedValue: contractResults.observedValue,
      resultErrorMessage: contractResults.errorMessage,
    })
    .from(issueOccurrences)
    .leftJoin(runs, eq(issueOccurrences.runId, runs.id))
    .leftJoin(contractResults, eq(issueOccurrences.resultId, contractResults.id))
    .where(eq(issueOccurrences.issueId, issue.id))
    .orderBy(desc(issueOccurrences.occurredAt))
    .limit(50);

  return NextResponse.json({ ...issue, occurrences });
}
