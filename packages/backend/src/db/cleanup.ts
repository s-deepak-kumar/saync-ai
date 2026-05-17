import { sql } from 'drizzle-orm';
import { getDb } from './connection.js';
import { runs } from './schema.js';

/**
 * Auto-cleanup: Delete runs older than 30 days
 * Cascade deletes will automatically remove related records (contract_results, issue_occurrences)
 * This runs on backend startup to prevent database bloat
 */
export async function cleanupOldRuns() {
  const db = await getDb();
  
  // Calculate timestamp for 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Delete old runs (cascade will handle related records)
  const result = await db
    .delete(runs)
    .where(sql`${runs.startedAt} < ${thirtyDaysAgo.getTime()}`)
    .returning({ id: runs.id });
  
  if (result.length > 0) {
    console.log(`🧹 Cleaned up ${result.length} runs older than 30 days`);
  }
  
  return result.length;
}

// Made with Bob
