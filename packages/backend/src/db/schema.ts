import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Projects table - minimal metadata
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Test runs table
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: text('status').notNull(), // 'running' | 'completed' | 'failed'
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  totalContracts: integer('total_contracts').notNull(),
  passedContracts: integer('passed_contracts').notNull().default(0),
  failedContracts: integer('failed_contracts').notNull().default(0),
  environment: text('environment').notNull(), // 'local' | 'ci'
  viewport: text('viewport'),
  gitBranch: text('git_branch'),
  gitCommit: text('git_commit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Contract test results
export const contractResults = sqliteTable('contract_results', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  contractName: text('contract_name').notNull(),
  componentName: text('component_name').notNull(),
  status: text('status').notNull(), // 'pass' | 'fail' | 'warn'
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
  errorMessage: text('error_message'),
  expectedValue: text('expected_value'),
  observedValue: text('observed_value'),
  filePath: text('file_path'),
  lineNumber: integer('line_number'),
  stackTrace: text('stack_trace'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Issues - aggregated failures with deduplication
export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractName: text('contract_name').notNull(),
  componentName: text('component_name').notNull(),
  errorMessage: text('error_message').notNull(),
  status: text('status').notNull().default('open'), // 'open' | 'resolved'
  severity: text('severity').notNull().default('medium'), // 'low' | 'medium' | 'high' | 'critical'
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  dedupHash: text('dedup_hash').notNull().unique(), // MD5 hash for deduplication
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  dedupHashIdx: index('dedup_hash_idx').on(table.dedupHash),
  projectStatusIdx: index('project_status_idx').on(table.projectId, table.status),
}));

// Issue occurrences - links issues to specific test runs
export const issueOccurrences = sqliteTable('issue_occurrences', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  resultId: text('result_id').notNull().references(() => contractResults.id, { onDelete: 'cascade' }),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Production violations - reported by SDK in production
export const productionViolations = sqliteTable('production_violations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contractName: text('contract_name').notNull(),
  componentName: text('component_name').notNull(),
  errorMessage: text('error_message').notNull(),
  expectedValue: text('expected_value'),
  observedValue: text('observed_value'),
  sessionId: text('session_id').notNull(), // Random UUID per page load, NOT tied to user identity
  userAgent: text('user_agent').notNull(),
  viewportWidth: integer('viewport_width').notNull(),
  viewportHeight: integer('viewport_height').notNull(),
  url: text('url').notNull(),
  timestamp: text('timestamp').notNull(), // ISO 8601 string from client
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  projectTimestampIdx: index('project_timestamp_idx').on(table.projectId, table.timestamp),
}));

// Made with Bob
