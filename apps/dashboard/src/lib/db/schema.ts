import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Single-tenant local DB. The "project" is the install — every Saync
// instance owns one .saync/saync.db inside the user's repo. No projects
// table, no api_keys, no project_id columns.

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  totalContracts: integer('total_contracts').notNull(),
  passedContracts: integer('passed_contracts').notNull().default(0),
  failedContracts: integer('failed_contracts').notNull().default(0),
  environment: text('environment').notNull(),
  viewport: text('viewport'),
  gitBranch: text('git_branch'),
  gitCommit: text('git_commit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const contractResults = sqliteTable('contract_results', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  contractName: text('contract_name').notNull(),
  componentName: text('component_name').notNull(),
  status: text('status').notNull(),
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

export const issues = sqliteTable('issues', {
  id: text('id').primaryKey(),
  contractName: text('contract_name').notNull(),
  componentName: text('component_name').notNull(),
  errorMessage: text('error_message').notNull(),
  status: text('status').notNull().default('open'),
  severity: text('severity').notNull().default('medium'),
  firstSeenAt: integer('first_seen_at', { mode: 'timestamp' }).notNull(),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }).notNull(),
  occurrenceCount: integer('occurrence_count').notNull().default(1),
  dedupHash: text('dedup_hash').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  dedupHashIdx: index('dedup_hash_idx').on(table.dedupHash),
  statusIdx: index('issue_status_idx').on(table.status),
}));

export const issueOccurrences = sqliteTable('issue_occurrences', {
  id: text('id').primaryKey(),
  issueId: text('issue_id').notNull().references(() => issues.id, { onDelete: 'cascade' }),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  resultId: text('result_id').notNull().references(() => contractResults.id, { onDelete: 'cascade' }),
  occurredAt: integer('occurred_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const flows = sqliteTable('flows', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull().references(() => runs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: text('status').notNull(),
  durationMs: integer('duration_ms').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  runIdx: index('flow_run_idx').on(table.runId),
}));

export const flowStepResults = sqliteTable('flow_step_results', {
  id: text('id').primaryKey(),
  flowId: text('flow_id').notNull().references(() => flows.id, { onDelete: 'cascade' }),
  stepIndex: integer('step_index').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  errorMessage: text('error_message'),
  screenshot: text('screenshot'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  flowIdx: index('flow_step_flow_idx').on(table.flowId),
}));

export const productionViolations = sqliteTable('production_violations', {
  id: text('id').primaryKey(),
  contractName: text('contract_name').notNull(),
  componentName: text('component_name').notNull(),
  errorMessage: text('error_message').notNull(),
  expectedValue: text('expected_value'),
  observedValue: text('observed_value'),
  sessionId: text('session_id').notNull(),
  userAgent: text('user_agent').notNull(),
  viewportWidth: integer('viewport_width').notNull(),
  viewportHeight: integer('viewport_height').notNull(),
  url: text('url').notNull(),
  timestamp: text('timestamp').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  timestampIdx: index('violations_timestamp_idx').on(table.timestamp),
}));
