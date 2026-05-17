# Saync Backend Architecture Design (Updated)

**Version:** 2.0  
**Date:** 2026-05-16  
**Status:** Approved

## Updates from V1
1. ✅ Added `X-Saync-Api-Key` header to all write endpoints
2. ✅ Added auto-cleanup policy (30 days retention)
3. ✅ Designed embedded backend mode (no subprocess spawning)
4. ✅ Confirmed markdown reports stay in `./saync-reports/`
5. ✅ Confirmed Drizzle owns schema (SQL is illustrative)
6. ✅ Removed `user_id` from production violations (privacy)
7. ✅ Clarified out-of-scope items for MVP

---

## Authentication (MVP)

All write endpoints require `X-Saync-Api-Key` header:
- `POST /api/runs`
- `POST /api/runs/:id/results`
- `POST /api/runs/:id/complete`
- `POST /api/violations`

**For MVP:** Any value is accepted and stored. This establishes the API contract for future enforcement without breaking clients.

```typescript
// Example request
fetch('http://localhost:4000/api/runs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Saync-Api-Key': 'dev-key-12345', // Any value accepted for now
  },
  body: JSON.stringify({ projectId: 'demo', ... }),
});
```

---

## Data Retention

Auto-cleanup runs on backend startup:

```sql
DELETE FROM runs WHERE started_at < datetime('now', '-30 days');
```

Cascade deletes through foreign keys handle related records automatically. This prevents the SQLite file from growing indefinitely and degrading developer experience.

---

## Embedded Backend Mode

The agent imports the backend as a library and runs it embedded if it can't reach the configured port (default: 4000). **No subprocess spawning.**

### Design

```typescript
// packages/agent/src/backend-manager.ts
import { startBackend } from '@saync/backend';

export async function ensureBackendRunning(port: number = 4000): Promise<void> {
  // Check if backend is already running
  try {
    const response = await fetch(`http://localhost:${port}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    if (response.ok) {
      console.log('✓ Backend already running');
      return;
    }
  } catch {
    // Backend not reachable, start embedded
  }
  
  // Start backend embedded (same process, non-blocking)
  console.log('Starting embedded backend...');
  await startBackend({ port, embedded: true });
  console.log(`✓ Backend running at http://localhost:${port}`);
}
```

```typescript
// packages/backend/src/index.ts
export async function startBackend(options: { 
  port: number; 
  embedded?: boolean;
  dbPath?: string;
}) {
  const app = createHonoApp();
  
  // Run auto-cleanup on startup
  await cleanupOldRuns();
  
  if (options.embedded) {
    // Embedded mode: run in background, don't block
    Bun.serve({
      port: options.port,
      fetch: app.fetch,
    });
    // Return immediately, server runs in background
  } else {
    // Standalone mode: blocks (for `pnpm backend:start`)
    console.log(`Backend listening on port ${options.port}`);
    await Bun.serve({
      port: options.port,
      fetch: app.fetch,
    });
  }
}
```

### Usage in Agent

```typescript
// packages/agent/src/cli.ts
import { ensureBackendRunning } from './backend-manager';

async function main() {
  // Ensure backend is running before starting tests
  await ensureBackendRunning(4000);
  
  // Now run tests
  await runTests();
}
```

**Developer Experience:**
```bash
# Developer runs this
pnpm test:saync

# Agent automatically:
# 1. Checks if backend is running at localhost:4000
# 2. If not, starts it embedded (same process)
# 3. Runs tests
# 4. Streams results to backend
# 5. Backend stays running for next test run
```

---

## Markdown Reports

**Confirmed:** Stay in `./saync-reports/` in the developer's project folder.
- Per-run
- Gitignored
- Ephemeral
- Written alongside database writes for AI-assisted debugging

```typescript
// Agent writes both
async function reportFailure(result: ContractResult) {
  // 1. Send to backend (for dashboard)
  await backendClient.reportResult(runId, result);
  
  // 2. Write markdown (for AI-assisted debugging in IDE)
  await reporter.writeMarkdown(result, {
    includeRootCause: true,
    includeSuggestedFix: true,
    includeCodeSnippets: true,
  });
}
```

---

## Schema Management

**Confirmed:** Drizzle ORM owns the schema as TypeScript code. Migrations are generated from Drizzle definitions. The raw SQL in the original doc is illustrative only.

```typescript
// packages/backend/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull(),
  status: text('status').notNull(), // 'running' | 'completed' | 'failed'
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  totalContracts: integer('total_contracts').notNull(),
  passedContracts: integer('passed_contracts').default(0),
  failedContracts: integer('failed_contracts').default(0),
  environment: text('environment').notNull(), // 'local' | 'ci'
  viewport: text('viewport'),
  gitBranch: text('git_branch'),
  gitCommit: text('git_commit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ... other tables
```

---

## Privacy & Production Violations

**Confirmed:** We are NOT building tracking infrastructure.

### Changes from V1:
- ❌ Removed `user_id` column from `production_violations` table
- ✅ `session_id` is a random UUID generated per page load by the SDK
- ✅ Never tied to real user identity
- ✅ No personally identifiable information collected

```typescript
// SDK generates session ID per page load
class SayncSDK {
  private sessionId: string;
  
  constructor() {
    // Random UUID, not tied to user identity
    this.sessionId = crypto.randomUUID();
  }
  
  reportViolation(violation: Violation) {
    this.violationQueue.push({
      ...violation,
      sessionId: this.sessionId, // Random, anonymous
      // NO userId field
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## Out of Scope for MVP

Explicitly deferred:
1. **Multi-tenancy:** One backend instance serves one project
2. **Rate limiting:** No limits on SDK violation reports
3. **Aggregated analytics:** No "top 10 failing contracts" queries

These can be added post-MVP if needed.

---

## API Surface (Updated)

### Write Endpoints (All require `X-Saync-Api-Key` header)

```typescript
// Start a new test run
POST /api/runs
Headers: { 
  'Content-Type': 'application/json',
  'X-Saync-Api-Key': string 
}
Body: {
  projectId: string;
  environment: 'local' | 'ci';
  viewport?: string;
  gitBranch?: string;
  gitCommit?: string;
  totalContracts: number;
}
Response: { runId: string }

// Report contract result (called as each contract is verified)
POST /api/runs/:runId/results
Headers: { 
  'Content-Type': 'application/json',
  'X-Saync-Api-Key': string 
}
Body: {
  contractName: string;
  componentName: string;
  status: 'pass' | 'fail' | 'warn';
  startedAt: string;
  completedAt: string;
  errorMessage?: string;
  expectedValue?: string;
  observedValue?: string;
  filePath?: string;
  lineNumber?: number;
  stackTrace?: string;
}
Response: { resultId: string, issueId?: string }

// Complete a run
POST /api/runs/:runId/complete
Headers: { 
  'Content-Type': 'application/json',
  'X-Saync-Api-Key': string 
}
Body: {
  status: 'completed' | 'failed';
}
Response: { success: boolean }

// Report production violations (batched)
POST /api/violations
Headers: { 
  'Content-Type': 'application/json',
  'X-Saync-Api-Key': string 
}
Body: {
  projectId: string;
  violations: Array<{
    contractName: string;
    componentName: string;
    errorMessage: string;
    expectedValue?: string;
    observedValue?: string;
    sessionId: string;  // Random UUID per page load, NOT tied to user identity
    userAgent: string;
    viewportWidth: number;
    viewportHeight: number;
    url: string;
    timestamp: string;
  }>;
}
Response: { received: number }
```

### Read Endpoints (No auth required for MVP)

```typescript
// Health check
GET /health
Response: { status: 'ok', version: string }

// Get project stats
GET /api/projects/:projectId/stats
Response: {
  openIssues: number;
  totalContracts: number;
  passRate: number;
  lastRunDuration: string;
}

// Get recent runs
GET /api/projects/:projectId/runs?limit=10
Response: Array<Run>

// Get run details
GET /api/runs/:runId
Response: Run & { results: Array<ContractResult> }

// Stream live run updates (SSE) ⚡
GET /api/runs/:runId/stream
Response: text/event-stream
Events:
  - result: { contractResult: ContractResult }
  - progress: { passed: number, failed: number, total: number }
  - complete: { status: 'completed' | 'failed' }

// Get all issues
GET /api/projects/:projectId/issues?status=open&severity=critical
Response: Array<Issue>

// Get issue details
GET /api/issues/:issueId
Response: Issue & { occurrences: Array<IssueOccurrence> }

// Get production violations
GET /api/projects/:projectId/violations?since=2024-01-01&contract=SayncButton.loading
Response: Array<ProductionViolation>
```

---

## Implementation Plan

### Phase 1: Backend Foundation
1. Create `packages/backend` package
2. Set up Bun + Hono + Drizzle + SQLite
3. Implement schema with Drizzle
4. Implement all 4 write endpoints
5. Implement all 6 read endpoints
6. Implement SSE streaming endpoint
7. Add auto-cleanup on startup
8. Add health check endpoint
9. Export `startBackend()` for embedded mode

**Deliverable:** Standalone backend that can be curled end-to-end

### Phase 2: Agent Integration
1. Create `BackendClient` class with offline queue
2. Create `ensureBackendRunning()` function
3. Update agent to stream results as they happen
4. Keep writing markdown files alongside database writes
5. Test: Run agent, verify results stream into SQLite live

**Deliverable:** Agent that auto-starts backend and streams results

### Phase 3: Dashboard Integration
1. Update dashboard to consume real-time API
2. Implement SSE client for live run view
3. Replace file-based data layer with API calls
4. Test: Watch live run in dashboard as agent executes

**Deliverable:** Real-time dashboard showing live test execution

---

## Technology Stack (Confirmed)

| Component | Technology | Why |
|-----------|-----------|-----|
| Runtime | Bun | Fast, built-in SQLite, WebSocket, TypeScript-first |
| Framework | Hono | Lightweight, portable, type-safe, edge-ready |
| Database (local) | SQLite | Zero-config, fast, single-file, perfect for local dev |
| Database (cloud) | PostgreSQL | Multi-user, concurrent writes, production-ready |
| ORM | Drizzle ORM | Type-safe, supports SQLite + PostgreSQL, lightweight |
| Real-time | SSE | Simple, HTTP-based, auto-reconnect, sufficient for our use case |
| Dashboard | Next.js 14 | Already built, SSR for initial data, client-side for real-time |

---

**End of Updated Architecture Document**