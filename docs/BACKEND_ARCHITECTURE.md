# Saync Backend Architecture Design

**Version:** 1.0  
**Date:** 2026-05-16  
**Status:** Proposal

## Executive Summary

This document proposes a backend architecture for Saync that supports:
1. Real-time streaming of test results during local development runs
2. Production violation tracking from real user browsers
3. Queryable historical data with filtering and aggregation
4. Graceful degradation when the backend is unavailable

The architecture is designed to run locally on a developer's laptop but can scale to cloud deployment without rewrites.

---

## 1. Backend Stack Selection

### Runtime: **Bun**

**Choice:** Bun over Node.js or Deno

**Reasoning:**
- **Performance:** Bun's native SQLite driver is 3-5x faster than better-sqlite3 on Node
- **Built-in features:** Native WebSocket support, built-in SQLite, fast HTTP server
- **Developer experience:** Single binary, fast startup, TypeScript-first
- **Compatibility:** Can run Node.js code, so we're not locked in
- **Local-first:** Optimized for the "runs on laptop" use case while still production-ready

**Trade-off:** Bun is newer (less mature ecosystem), but for our use case (SQLite + WebSockets + HTTP), it's battle-tested.

### Framework: **Hono**

**Choice:** Hono over Express or Fastify

**Reasoning:**
- **Lightweight:** 12KB, minimal overhead for local development
- **Modern:** Built for edge/serverless, making cloud migration trivial
- **Type-safe:** First-class TypeScript support with type inference
- **WebSocket support:** Native WebSocket middleware
- **Performance:** Faster than Express, comparable to Fastify
- **Portability:** Runs on Bun, Node, Deno, Cloudflare Workers without changes

**Trade-off:** Smaller ecosystem than Express, but we don't need many plugins.

### Database: **SQLite (local) → PostgreSQL (cloud)**

**Choice:** SQLite for local development, PostgreSQL for production

**Reasoning for SQLite locally:**
- **Zero configuration:** Single file, no server to run
- **Fast:** Perfect for single-user (developer) workloads
- **Reliable:** ACID compliant, battle-tested
- **Portable:** Database file can be committed to git for demos
- **Bun-optimized:** Native driver is extremely fast

**Migration path to PostgreSQL:**
- Use an ORM/query builder (Drizzle ORM) that supports both
- Schema definitions work identically
- Connection string swap for cloud deployment
- PostgreSQL needed for multi-user production (row-level locking, concurrent writes)

**Trade-off:** SQLite doesn't handle high concurrent writes well, but that's not our local use case.

### Real-time Communication: **Server-Sent Events (SSE)**

**Choice:** SSE over WebSockets or polling

**Reasoning:**
- **Simpler:** Unidirectional (server → client), which matches our use case
- **HTTP-based:** Works through proxies, firewalls, no special infrastructure
- **Auto-reconnect:** Browsers handle reconnection automatically
- **Efficient:** Persistent connection, no polling overhead
- **Sufficient:** We only need server → dashboard streaming, not bidirectional

**When we'd use WebSockets instead:**
- If we needed client → server real-time (we don't)
- If we needed sub-100ms latency (test results can tolerate 200-500ms)

**Trade-off:** SSE is one-way only, but that's exactly what we need.

---

## 2. Data Model

### Core Entities

```sql
-- A test run session (local agent execution)
CREATE TABLE runs (
  id TEXT PRIMARY KEY,              -- UUID
  project_id TEXT NOT NULL,         -- Links to project
  status TEXT NOT NULL,             -- 'running' | 'completed' | 'failed'
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  total_contracts INTEGER NOT NULL,
  passed_contracts INTEGER DEFAULT 0,
  failed_contracts INTEGER DEFAULT 0,
  environment TEXT NOT NULL,        -- 'local' | 'ci'
  viewport TEXT,                    -- 'desktop' | 'mobile' | 'tablet'
  git_branch TEXT,
  git_commit TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual contract verification results within a run
CREATE TABLE contract_results (
  id TEXT PRIMARY KEY,              -- UUID
  run_id TEXT NOT NULL,             -- FK to runs
  contract_name TEXT NOT NULL,      -- e.g., 'SayncButton.loading'
  component_name TEXT NOT NULL,     -- e.g., 'SayncButton'
  status TEXT NOT NULL,             -- 'pass' | 'fail' | 'warn' | 'running'
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_message TEXT,
  expected_value TEXT,
  observed_value TEXT,
  file_path TEXT,
  line_number INTEGER,
  stack_trace TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

-- Aggregated issues (failures that recur across runs)
CREATE TABLE issues (
  id TEXT PRIMARY KEY,              -- UUID
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,           -- 'critical' | 'high' | 'medium' | 'low'
  status TEXT NOT NULL,             -- 'open' | 'resolved' | 'snoozed'
  contract_name TEXT NOT NULL,
  component_name TEXT NOT NULL,
  file_path TEXT,
  first_seen_at TIMESTAMP NOT NULL,
  last_seen_at TIMESTAMP NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  affected_viewports TEXT,          -- JSON array
  reproducibility TEXT,             -- 'always' | 'intermittent' | 'rare'
  root_cause TEXT,
  suggested_fix TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Links contract results to aggregated issues
CREATE TABLE issue_occurrences (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  contract_result_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL,
  
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (contract_result_id) REFERENCES contract_results(id) ON DELETE CASCADE,
  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

-- Production violations from real users
CREATE TABLE production_violations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  contract_name TEXT NOT NULL,
  component_name TEXT NOT NULL,
  user_id TEXT,                     -- Optional: anonymized user ID
  session_id TEXT,                  -- Browser session
  error_message TEXT,
  expected_value TEXT,
  observed_value TEXT,
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  url TEXT,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects (for multi-project support)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repository_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Indexes

```sql
-- Query: Get all results for a run (live streaming)
CREATE INDEX idx_contract_results_run_id ON contract_results(run_id);

-- Query: Get recent runs for a project
CREATE INDEX idx_runs_project_started ON runs(project_id, started_at DESC);

-- Query: Get open issues by severity
CREATE INDEX idx_issues_status_severity ON issues(project_id, status, severity);

-- Query: Get issue occurrences over time
CREATE INDEX idx_issue_occurrences_issue_time ON issue_occurrences(issue_id, occurred_at DESC);

-- Query: Get production violations by contract
CREATE INDEX idx_prod_violations_contract ON production_violations(project_id, contract_name, timestamp DESC);

-- Query: Find existing issue by contract name
CREATE INDEX idx_issues_contract ON issues(project_id, contract_name, status);
```

### Relationships

```
projects (1) ──→ (N) runs
runs (1) ──→ (N) contract_results
contract_results (N) ──→ (N) issues (via issue_occurrences)
projects (1) ──→ (N) production_violations
```

### Data Flow

1. **Agent starts run** → Creates `runs` record with `status='running'`
2. **Agent verifies contract** → Creates `contract_results` record, updates `runs.passed_contracts`
3. **Contract fails** → Creates or updates `issues` record, creates `issue_occurrences` link
4. **Run completes** → Updates `runs.status='completed'`, `runs.completed_at`
5. **SDK detects violation** → Creates `production_violations` record

---

## 3. API Surface

### Base URL
- Local: `http://localhost:3001`
- Cloud: `https://api.saync.dev`

### Endpoints

#### **Agent → Backend (Write)**

```typescript
// Start a new test run
POST /api/runs
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
Body: {
  status: 'completed' | 'failed';
}
Response: { success: boolean }
```

#### **SDK → Backend (Write)**

```typescript
// Report production violation (batched)
POST /api/violations
Body: {
  projectId: string;
  violations: Array<{
    contractName: string;
    componentName: string;
    errorMessage: string;
    expectedValue?: string;
    observedValue?: string;
    userId?: string;
    sessionId: string;
    userAgent: string;
    viewportWidth: number;
    viewportHeight: number;
    url: string;
    timestamp: string;
  }>;
}
Response: { received: number }
```

#### **Dashboard → Backend (Read)**

```typescript
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

### Real-time Streaming

**SSE Endpoint:** `GET /api/runs/:runId/stream`

```typescript
// Client (Dashboard)
const eventSource = new EventSource(`/api/runs/${runId}/stream`);

eventSource.addEventListener('result', (e) => {
  const result = JSON.parse(e.data);
  // Update UI with new contract result
});

eventSource.addEventListener('progress', (e) => {
  const { passed, failed, total } = JSON.parse(e.data);
  // Update progress bar
});

eventSource.addEventListener('complete', (e) => {
  // Run finished
  eventSource.close();
});
```

**Server (Hono + SSE):**
```typescript
app.get('/api/runs/:runId/stream', async (c) => {
  return streamSSE(c, async (stream) => {
    // Send existing results
    const results = await db.getContractResults(runId);
    for (const result of results) {
      await stream.writeSSE({ data: JSON.stringify(result), event: 'result' });
    }
    
    // Subscribe to new results
    const unsubscribe = db.onContractResult(runId, async (result) => {
      await stream.writeSSE({ data: JSON.stringify(result), event: 'result' });
    });
    
    // Cleanup on disconnect
    stream.onAbort(() => unsubscribe());
  });
});
```

---

## 4. Agent & SDK Changes

### Agent Changes

**Current:** Writes JSON/markdown files at end of run

**New:** Streams results to backend as they happen

```typescript
// packages/agent/src/runner.ts

export async function runTests() {
  // 1. Start run
  const runId = await backendClient.startRun({
    projectId: config.projectId,
    environment: 'local',
    totalContracts: contracts.length,
  });
  
  // 2. Verify each contract
  for (const contract of contracts) {
    const result = await verifier.verify(contract);
    
    // 3. Report immediately (don't wait for all to finish)
    await backendClient.reportResult(runId, {
      contractName: contract.name,
      status: result.passed ? 'pass' : 'fail',
      ...result,
    });
  }
  
  // 4. Complete run
  await backendClient.completeRun(runId, { status: 'completed' });
}
```

**Fallback strategy:**
```typescript
class BackendClient {
  async reportResult(runId: string, result: ContractResult) {
    try {
      await fetch(`${this.baseUrl}/api/runs/${runId}/results`, {
        method: 'POST',
        body: JSON.stringify(result),
        signal: AbortSignal.timeout(5000), // 5s timeout
      });
    } catch (error) {
      // Backend down: queue locally, continue test run
      this.offlineQueue.push({ runId, result });
      console.warn('Backend unavailable, queuing result locally');
    }
  }
}
```

### SDK Changes

**Current:** Does nothing in production mode

**New:** Batches violations and sends to backend

```typescript
// packages/react/src/SayncButton.tsx

function SayncButton({ loading, ...props }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Verify contract in production
      const violation = verifyContract('SayncButton.loading', { loading });
      
      if (violation) {
        // Send to backend (batched)
        sayncSDK.reportViolation({
          contractName: 'SayncButton.loading',
          componentName: 'SayncButton',
          errorMessage: violation.message,
          expectedValue: violation.expected,
          observedValue: violation.observed,
        });
      }
    }
  }, [loading]);
  
  // ... rest of component
}
```

**Batching strategy:**
```typescript
class SayncSDK {
  private violationQueue: Violation[] = [];
  private flushInterval = 30000; // 30 seconds
  
  reportViolation(violation: Violation) {
    this.violationQueue.push({
      ...violation,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
    
    // Flush if queue is large
    if (this.violationQueue.length >= 10) {
      this.flush();
    }
  }
  
  private async flush() {
    if (this.violationQueue.length === 0) return;
    
    const batch = this.violationQueue.splice(0);
    
    try {
      await fetch(`${this.apiUrl}/api/violations`, {
        method: 'POST',
        body: JSON.stringify({ projectId: this.projectId, violations: batch }),
        keepalive: true, // Send even if page is closing
      });
    } catch (error) {
      // Backend down: drop violations (don't crash app)
      console.warn('Failed to send violations to Saync backend');
    }
  }
}
```

---

## 5. Fallback Strategy

### When Backend is Down

**Agent (local development):**
1. Continue running tests normally
2. Queue results in memory
3. Write to local SQLite fallback file (`~/.saync/offline.db`)
4. Retry sending when backend comes back up
5. Developer sees results in terminal even if dashboard is unavailable

**SDK (production):**
1. Drop violations silently (don't crash user's app)
2. Log warning to console (only in dev mode)
3. No retry logic (violations are not critical to app functionality)

**Dashboard:**
1. Show "Backend unavailable" banner
2. Display last known data from cache
3. Auto-reconnect SSE when backend comes back

### Graceful Degradation

```typescript
// Agent: Offline queue
class BackendClient {
  private offlineDb: SQLite.Database;
  
  constructor() {
    this.offlineDb = new SQLite(`${os.homedir()}/.saync/offline.db`);
    this.offlineDb.exec(`
      CREATE TABLE IF NOT EXISTS queued_results (
        id INTEGER PRIMARY KEY,
        run_id TEXT,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  async reportResult(runId: string, result: ContractResult) {
    try {
      await this.sendToBackend(runId, result);
    } catch (error) {
      // Queue locally
      this.offlineDb.run(
        'INSERT INTO queued_results (run_id, data) VALUES (?, ?)',
        [runId, JSON.stringify(result)]
      );
    }
  }
  
  async syncOfflineQueue() {
    const queued = this.offlineDb.query('SELECT * FROM queued_results').all();
    for (const item of queued) {
      try {
        await this.sendToBackend(item.run_id, JSON.parse(item.data));
        this.offlineDb.run('DELETE FROM queued_results WHERE id = ?', [item.id]);
      } catch {
        break; // Still offline, try again later
      }
    }
  }
}
```

---

## 6. Markdown Reports: Keep or Replace?

### Recommendation: **Keep Both**

**Reasoning:**

The markdown reports serve a different purpose than the database:

| Feature | Database | Markdown Files |
|---------|----------|----------------|
| **Purpose** | Queryable data, real-time streaming | AI-assisted debugging |
| **Consumer** | Dashboard UI | Developer + AI (Bob, Cursor) |
| **Format** | Structured (SQL) | Narrative (prose) |
| **Lifespan** | Persistent, historical | Ephemeral, current run |
| **Content** | Facts (expected vs observed) | Analysis (root cause, fix) |

**Use cases for markdown:**
1. Developer opens `saync-reports/button-state-mismatch.md` in Cursor
2. AI reads the narrative explanation and suggests a fix
3. Developer uses "Apply Fix" button in IDE
4. Markdown includes code snippets, reproduction steps, pull quotes

**Use cases for database:**
1. Dashboard shows aggregated stats across runs
2. Filter issues by severity, date, component
3. Track issue recurrence over time
4. Production violation analytics

**Implementation:**
```typescript
// Agent writes both
async function reportFailure(result: ContractResult) {
  // 1. Send to backend (for dashboard)
  await backendClient.reportResult(runId, result);
  
  // 2. Write markdown (for AI-assisted debugging)
  await reporter.writeMarkdown(result, {
    includeRootCause: true,
    includeSuggestedFix: true,
    includeCodeSnippets: true,
  });
}
```

**Storage:**
- Database: `~/.saync/saync.db` (or cloud PostgreSQL)
- Markdown: `./saync-reports/*.md` (git-ignored, ephemeral)

---

## 7. Deployment Scenarios

### Local Development (Default)

```bash
# Developer runs agent
pnpm test:saync

# Agent starts backend automatically (if not running)
# Backend: Bun + Hono + SQLite at http://localhost:3001
# Dashboard: Next.js at http://localhost:3000
# Data: ~/.saync/saync.db
```

### Cloud Deployment (Optional)

```bash
# Deploy backend to Cloudflare Workers / Vercel / Railway
# Backend: Bun + Hono + PostgreSQL
# Dashboard: Next.js (same codebase)
# Data: Managed PostgreSQL (Neon, Supabase, etc.)

# Agent/SDK point to cloud URL
SAYNC_API_URL=https://api.saync.dev pnpm test:saync
```

**Migration path:**
1. Change connection string from SQLite to PostgreSQL
2. Run migrations (Drizzle ORM handles both)
3. No code changes needed (same API)

---

## 8. Technology Choices Summary

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

## 9. Open Questions

1. **Authentication:** Do we need auth for cloud deployment? (API keys, OAuth, etc.)
2. **Multi-tenancy:** Should one backend support multiple projects/teams?
3. **Data retention:** How long do we keep old runs? Auto-cleanup policy?
4. **Rate limiting:** Should we limit SDK violation reports to prevent abuse?
5. **Analytics:** Do we want aggregated metrics (e.g., "top 10 failing contracts")?

---

## 10. Next Steps

1. **Review & approve** this architecture
2. **Create backend package** (`packages/backend`)
3. **Implement core API** (runs, results, issues)
4. **Add SSE streaming** for live runs
5. **Update agent** to use backend client
6. **Update SDK** to report production violations
7. **Update dashboard** to consume real-time API
8. **Write migration guide** from file-based to backend-based

---

## Appendix: Example Queries

```sql
-- Get open issues by severity
SELECT * FROM issues 
WHERE project_id = ? AND status = 'open' 
ORDER BY 
  CASE severity 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    ELSE 4 
  END,
  occurrence_count DESC;

-- Get issue trend over time (last 30 days)
SELECT 
  DATE(occurred_at) as date,
  COUNT(*) as occurrences
FROM issue_occurrences
WHERE issue_id = ? AND occurred_at >= DATE('now', '-30 days')
GROUP BY DATE(occurred_at)
ORDER BY date;

-- Get most common production violations
SELECT 
  contract_name,
  COUNT(*) as violation_count,
  COUNT(DISTINCT session_id) as affected_sessions
FROM production_violations
WHERE project_id = ? AND timestamp >= DATE('now', '-7 days')
GROUP BY contract_name
ORDER BY violation_count DESC
LIMIT 10;
```

---

**End of Architecture Proposal**