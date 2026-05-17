# Saync — Roadmap

This document is the locked plan for the next five phases. It captures what's built today, what each phase delivers, why the order is what it is, every file that gets touched, the watsonX.ai integration shape, the contracts between phases, and the open questions still on the table. Nothing is left to interpretation at build time.

---

## Snapshot of where we are today

Built and verified:
- `@saync/core` — 26 contract types, full registry, frozen public API
- `@saync/react` — 42 components, 6 contexts, Provider+ErrorBoundary+useSaync, **real production-mode reporter** (fetch wrap + batched violations + sendBeacon on unload)
- `@saync/agent` — Playwright-based, exhaustive verifier for every contract type, exhaustive `never` check at the dispatch
- `@saync/backend` — Bun + Hono + SQLite, multi-tenant via per-project `apiKey`, all REST + SSE endpoints, production-violations table + endpoint
- `@saync/dashboard` (Next.js) — landing + project home + setup + issue detail; multi-tenant URL routing under `/p/[id]/...`
- `examples/demo-app` (Vite + React) — real HTTP backend via Vite middleware, real product SVGs, 5 intentionally planted bugs, 18 contracts across 14 SDK surfaces
- Docker deploy recipe (dry-run validated; deployment paused)
- README.md + DEPLOY.md + audited zero-mocks state

Honest gaps the roadmap closes:
- **No flows** — Saync verifies atomic contracts but cannot test multi-step user journeys (login → dashboard → action → result).
- **UI is editorial template, not industry-grade observability** — feels generic; needs Sentry-class density and opinions.
- **Production violations are write-only data** — backend stores them but no dashboard view renders them.
- **No LLM analysis anywhere** — every report is mechanical templated output; no root-cause, no suggested-fix, no cross-issue clustering.
- **No one-click report download** — devs have to read individual markdown files in `./saync-reports/`; no consolidated AI-written export.
- **Install requires manual env vars** — setup page tells you what to run but doesn't generate a `package.json` script.

---

## Phase 1 — Flows

**Goal:** Saync verifies multi-step user journeys, not just atomic contracts.

**Why first:** This is the only phase that changes what Saync fundamentally does. The remaining four polish capability we already have; this one adds a new capability category. Built first so subsequent phases (UI, LLM reports, prod view) can include flows from day one.

### Deliverables

**Core types** — [packages/core/src/flows.ts](packages/core/src/flows.ts) (new)
```ts
export type FlowStep =
  | { interact: string }                               // click the element named X
  | { fill: string; with: string }                     // type into the input named X
  | { select: string; value: string }                  // pick option in select X
  | { expect: { url?: string; appears?: string; text?: string } }
  | { wait: number };                                  // ms

export interface FlowDefinition {
  name: string;                                        // human-readable id ("checkout")
  description?: string;
  steps: FlowStep[];
}

export function defineFlow(def: FlowDefinition): FlowDefinition;
```

**User-facing config file** — `saync.flows.ts` at the developer's repo root (NEW convention)
```ts
import { defineFlow } from '@saync/core';

export const flows = [
  defineFlow({
    name: 'checkout',
    steps: [
      { interact: 'add-to-cart' },
      { interact: 'go-to-checkout' },
      { fill: 'email', with: 'agent+test@saync.dev' },
      { select: 'shipping', value: 'standard' },
      { interact: 'place-order' },
      { expect: { url: '/success', appears: '[data-saync-name="success-region"]' } },
    ],
  }),
];
```

**Agent discovery + execution** — [packages/agent/src/flows.ts](packages/agent/src/flows.ts) (new), wired into `runner.ts`
- After atomic contracts complete, look for `saync.flows.ts` in `process.cwd()` (and `--flows <path>` CLI flag override).
- For each flow: clean page (`page.goto(startUrl)`), driver clears `localStorage` + `sessionStorage` + cookies between flows, drives each step in order, captures per-step pass/fail, screenshot on first failure, records total flow duration.
- A step that fails halts that flow; subsequent flows still run.

**Runtime loading of `saync.flows.ts`** — important practical detail. The agent is compiled JS running under Node; the user writes their flows in TypeScript. Three viable paths:
1. **Use `jiti`** (sub-100ms TS loader, no compile step). Add `jiti` as a runtime dep of `@saync/agent`. Agent does `const { flows } = createJiti(...)(absPath)`. Best UX — no user setup.
2. **Use `tsx`** as a launcher (wrap `saync-agent` in `tsx`). Heavier, slower startup.
3. **Bun-only**: if Bun is detected, native `.ts` import works. Fallback to jiti otherwise.

Going with option 1 (jiti). Adds ~1MB to the agent install but means users don't need to install anything else.

**Step driver mapping** (agent side):
| Step | DOM action | Pass criterion |
|---|---|---|
| `interact: name` | Find `[data-saync-name="<name>"]`, click | element existed + click didn't throw |
| `fill: name, with` | Find input by data-saync-name, fill | value attribute matches |
| `select: name, value` | selectOption | option exists |
| `expect: { url }` | check `page.url()` | matches (suffix match if startsWith `*`) |
| `expect: { appears }` | `locator.isVisible()` after settle | true |
| `expect: { text }` | `locator.innerText().includes()` | true |
| `wait: ms` | `page.waitForTimeout(ms)` | always passes |

**Backend** — new tables in [packages/backend/src/db/schema.ts](packages/backend/src/db/schema.ts):
```sql
flows ( id, runId, name, status, durationMs, startedAt, completedAt )
flow_step_results ( id, flowId, stepIndex, kind, status, errorMessage, screenshot )
```

**Drizzle migration** — `pnpm db:generate` creates `drizzle/0002_*.sql` (the third migration after `0000_initial` and `0001_apikey`). Migration runs automatically on backend startup (existing behavior via `getDb()`). Existing deployments get the new tables on next restart with no manual intervention.

**Backend endpoints** — extend [packages/backend/src/routes/runs.ts](packages/backend/src/routes/runs.ts):
- `POST /api/runs/:runId/flows` — body `{ name, status, durationMs, steps: [...] }`, auth: same X-Saync-Api-Key
- `GET  /api/runs/:runId/flows` — list flows + step results for a run
- `GET  /api/flows/:flowId` — single flow's step-by-step result

**SSE additions** — pubsub event types in [packages/backend/src/lib/pubsub.ts](packages/backend/src/lib/pubsub.ts):
- `flow-step`: `{ flowName, stepIndex, status }`
- `flow-complete`: `{ flowName, status }`

**Agent BackendClient** — extend [packages/agent/src/lib/backend-client.ts](packages/agent/src/lib/backend-client.ts) with `postFlow(runId, payload)`. Same offline queue / retry semantics as `postResult`.

**Demo app** — new file `examples/demo-app/saync.flows.ts` defining 2 flows: `add-to-cart` and `checkout` (the full happy path). Demonstrates the format on a real, runnable app.

### Acceptance criteria

- Running the agent against `demo-app` after Phase 1 produces:
  - The same atomic contract results we have today, PLUS
  - 2 flow results stored under runId, each with per-step pass/fail data in `flow_step_results`
- `curl /api/runs/<id>/flows` returns a list with both flows
- `flows.ts` is **opt-in** — if absent, agent ignores it cleanly; no breaking change for existing usage

### What Phase 1 does NOT include

- Dashboard rendering of flows (Phase 2)
- watsonX-generated flow reports (Phase 3)
- Real-user flow tracking in production (out of scope; the prod reporter watches atomic contracts only — flows are agent-time only)

---

## Phase 2 — Sentry-like Dashboard Rewrite

**Goal:** Dashboard reads as an industry-grade observability tool. Dense, technical, filterable, opinionated.

**Why second:** Phase 1 produced data we cannot see yet. UI rewrite renders both old and new data correctly the first time; doing UI first would mean re-skinning during Phase 1, doing UI third would mean ugly flow data lingering on the current generic template.

### Design system

| Token | Today | After Phase 2 |
|---|---|---|
| Sidebar | white, 240px, sparse | **dark ink `#0F172A`**, 220px, dense, terracotta logo dot |
| Primary background | warm off-white `#FAFAF7` | same (canvas) |
| Card backgrounds | white with thin border | **alternating zebra rows** in tables; cards only for hero stats |
| Hero typography | Fraunces 40px | Fraunces 28–32px (smaller, denser) |
| Body | Inter 14px | Inter 13px (denser) |
| Mono | JetBrains Mono 12px | JetBrains Mono 12px (everywhere — IDs, paths, durations, statuses) |
| Severity dots | colored circles in pills only | **6px circles in row left-edges + pills + chart accents** |
| Iconography | none | **Lucide icons** for type indicators, actions, status |
| Active row | hover bg | **left-edge accent strip in severity color** |
| Live indicator | none | **pulsing terracotta dot** on active runs |

### Sidebar nav structure (NEW)

```
● Saync
   {project name}
   ──────────────
   OVERVIEW
     · Project home
   TEST RESULTS
     · Issues          (issue-list page)
     · Runs            (run-list page)
     · Flows           (flow-list page)
   PRODUCTION
     · Violations      (production-violations page)
   SETTINGS
     · Install
     · API keys
   ──────────────
   ← Switch project
```

### Routes after Phase 2

| Route | Today | After |
|---|---|---|
| `/` | landing+create-project | unchanged |
| `/p/[id]` | project home with stats + recent runs + open issues cards | **reskinned**: stats hero, runs sparkline, top 3 issues — Sentry-style |
| `/p/[id]/issues` | — | NEW — filterable issue table |
| `/p/[id]/issues/[issueId]` | editorial single-column | **reskinned** — three-column: contract spec / observed values / occurrences timeline. AI analysis section (filled by Phase 3) |
| `/p/[id]/runs` | — | NEW — runs list with filters (date, status, branch) |
| `/p/[id]/runs/[runId]` | — | NEW — single-run detail: contract results table + flows section + Generate Report button |
| `/p/[id]/flows` | — | NEW — flows list, latest result per flow |
| `/p/[id]/flows/[flowName]` | — | NEW — flow detail: step-by-step timeline across runs, success rate over time |
| `/p/[id]/violations` | — | NEW — production-violations table (data from Phase 4 viz; backend endpoint exists today) |
| `/p/[id]/setup` | basic install page | **reskinned** + Phase 5 will fold in `package.json` script generator |

### Issue list table — column layout

| Severity | Title | Component | First seen | Last seen | Occurrences | Environment | Action |
|---|---|---|---|---|---|---|---|

- Severity column is a 6px-wide colored strip on the left edge, no text — combined with a 12px text badge for screen readers
- Title is `componentName · contractMethod` in Inter 14px
- Component is mono-font path-like text
- Filter chips above the table: status (open / resolved), severity (critical / high / medium / low), environment (local / ci / production), time range
- URL search params back the filter state (sharable links)

### Files to touch

- [apps/dashboard/src/app/p/[id]/layout.tsx](apps/dashboard/src/app/p/[id]/layout.tsx) — dark sidebar
- [apps/dashboard/src/components/Sidebar.tsx](apps/dashboard/src/components/Sidebar.tsx) — restructured nav
- [apps/dashboard/src/components/SeverityPill.tsx](apps/dashboard/src/components/SeverityPill.tsx) — three variants (pill, strip, dot)
- New: `components/IssueTable.tsx`, `components/FilterChips.tsx`, `components/StatusBadge.tsx`, `components/RunRow.tsx`, `components/FlowStepTimeline.tsx`
- Pages: `app/p/[id]/issues/page.tsx`, `app/p/[id]/runs/page.tsx`, `app/p/[id]/runs/[runId]/page.tsx`, `app/p/[id]/flows/page.tsx`, `app/p/[id]/flows/[flowName]/page.tsx`
- New tailwind utility additions for severity accent strips, mono cells, zebra rows

### Acceptance criteria

- Open-handed visual test against Sentry's UI: same kind of density, same kind of color discipline, same use of monospace for technical content
- Every existing issue / run still renders correctly (no data migration needed; just new presentation)
- Filter chips persist across navigation via URL params

---

## Phase 3 — watsonX.ai Integration + Generate Report

**Goal:** Click one button → backend asks IBM's foundation model to write a developer-readable markdown report → browser downloads the file.

### watsonX.ai contract (from IBM's REST API research)

**Authentication** — exchange API key for IAM token:
```
POST https://iam.cloud.ibm.com/identity/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<WATSONX_API_KEY>
```
Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "expiration": <unix_timestamp>
}
```
Token lifetime: 1 hour. Cache server-side, refresh ~10 min before expiry.

**Text generation** — single foundation-model call:
```
POST {WATSONX_BASE_URL}/ml/v1/text/generation?version=2024-05-31
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "input": "<prompt text>",
  "model_id": "ibm/granite-13b-instruct-v2",
  "project_id": "<WATSONX_PROJECT_ID>",
  "parameters": {
    "max_new_tokens": 800,
    "min_new_tokens": 50,
    "stop_sequences": [],
    "temperature": 0.3,
    "time_limit": 30000
  }
}
```
Response:
```json
{
  "model_id": "ibm/granite-13b-instruct-v2",
  "created_at": "...",
  "results": [{
    "generated_text": "...",
    "generated_token_count": 423,
    "input_token_count": 612,
    "stop_reason": "eos_token"
  }]
}
```

**Regional base URLs** — set via `WATSONX_BASE_URL`:
- `https://us-south.ml.cloud.ibm.com` (Dallas)
- `https://eu-de.ml.cloud.ibm.com` (Frankfurt)
- `https://eu-gb.ml.cloud.ibm.com` (London)
- `https://jp-tok.ml.cloud.ibm.com` (Tokyo)

**Default model**: `ibm/granite-3-3-8b-instruct` (Granite 3.3 8B — current production-ready Granite, smaller + faster + cheaper than the older 13B series, instruction-tuned, English). Overridable via `WATSONX_MODEL_ID` if the user wants `granite-4-h-small` (newer) or `granite-13b-instruct-v2` (older, may deprecate). **Verify availability in the user's region** before first call — backend logs a clear error if `model_id` isn't found.

### Backend additions — new module + endpoints

**New file**: [packages/backend/src/watsonx.ts](packages/backend/src/watsonx.ts)
```ts
export async function generateMarkdown(prompt: string, options?: {
  maxNewTokens?: number;
  temperature?: number;
}): Promise<string>
```
- Caches IAM token in module scope; refreshes 10 min before `expires_in`
- Reads `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, `WATSONX_BASE_URL`, `WATSONX_MODEL_ID` from env
- Returns plain text; caller formats as markdown
- Throws a typed `WatsonxNotConfigured` error if any required env var is unset — endpoint handlers catch and return 503 with a structured "configure watsonX" payload

**New endpoints** — [packages/backend/src/routes/reports.ts](packages/backend/src/routes/reports.ts):

| Endpoint | Body | Returns |
|---|---|---|
| `POST /api/issues/:id/report` | (no body) | `text/markdown` content + `Content-Disposition: attachment; filename="issue-<slug>.md"` |
| `POST /api/runs/:id/report` | (no body) | same; filename `run-<id-short>-<ts>.md` |
| `POST /api/projects/:id/violations/report` | optional `{ since, until }` | same; filename `production-<project>-<ts>.md` |

All require `X-Saync-Api-Key`.

### Report markdown structure

```markdown
# Saync run report — <project name>
Run #<n> · <branch>@<commit> · <date>

## Summary
- Total contracts: 18
- Passed: 14 (78%)
- Failed: 4
- Flows verified: 2 (1 passed, 1 failed)

## ## Page: /checkout
### CheckoutButton · apiCall (CRITICAL)
Expected: `POST /api/orders → 200`
Observed: `500 Internal Server Error`

**Root cause** (watsonX): <generated text — what likely went wrong>
**Suggested fix** (watsonX): <generated text — concrete change>
**Where to look**: `src/components/CheckoutButton.tsx:47`

### email · validation (MEDIUM)
...

## ## API: POST /api/orders
2 violations, both 500. <watsonX: likely backend issue analysis>

## ## Flow: checkout-journey (FAILED at step 4)
1. ✅ click add-to-cart
2. ✅ click go-to-checkout
3. ✅ fill email
4. ❌ select shipping — option 'overnight' missing
5. — (skipped)

<watsonX: end-to-end flow analysis>
```

### Prompt template (the system prompt sent to watsonX)

```
You are a senior software engineer reviewing automated contract-verification
failures from the Saync platform. You are writing concise, actionable
markdown for the developer to read in their IDE and fix.

For each failure, write:
  1. **Root cause** — 1–2 sentences on what likely went wrong, based on the
     contract spec, observed values, and any code context provided.
  2. **Where to look** — file path / line / component name from the data.
  3. **Suggested fix** — a concrete code change. Use a fenced code block
     when proposing code.

Be specific. Don't hedge with "might" or "could be" unless genuinely
ambiguous. Skip filler — assume the developer reads code fluently.

Input data:
<violation JSON>

Output: markdown only. No preamble.
```

### Token-budget strategy (large runs)

watsonX models have a per-request token cap (Granite 3.3 8B: 8k tokens shared between input and output). A run with 100+ violations can blow this budget if we inline every contract+observation into one prompt.

Strategy:
- **Per-issue calls**, not per-run. The backend loops over violations, calls watsonX once per issue (or once per small cluster of related issues), gets analysis paragraphs, then **assembles the markdown locally** with deterministic structure (summary header, grouping, etc.).
- This is more API calls but each one stays well under the token limit and runs in parallel (with concurrency cap of 3 so we don't trip rate limits).
- The per-page / per-API / per-flow grouping the user asked for is **a backend concern**, not a prompt concern — the backend slices the run, generates analysis per slice, stitches the markdown together. The LLM never sees more than one slice at a time.

Concretely:
```
For run R with N failures grouped into G page-or-api-or-flow groups:
  For each group:
    promptInput = { spec, observed, code-context-if-available }
    response    = watsonX.generate(promptInput)  // ~600 input + ~400 output
    sectionMd   = template(response)
  fullMd = headerMd + groupSections.join('\n\n')
```

This makes the cost predictable: ~G watsonX calls per Generate-Report click. At default group size (~5 violations per group), a typical run is 3-5 calls = ~$0.01 per report.

### Dashboard wiring

- "Generate report" button — primary action on Run Detail, Issue Detail, Production Violations pages
- Client-side handler:
  1. `setLoading(true)`
  2. `fetch(`${backend}/api/runs/${id}/report`, { method: 'POST', headers })`
  3. Get response as Blob
  4. Create `URL.createObjectURL(blob)` + invisible `<a download>`, click it
  5. Revoke object URL after 1s
- Toast confirmation
- If response is 503 (`WatsonxNotConfigured`), show modal with link to configure docs and the exact env vars needed

### Files

- New: `packages/backend/src/watsonx.ts`, `packages/backend/src/routes/reports.ts`, `packages/backend/src/prompts/report.ts`
- Updated: `packages/backend/src/app.ts` (mount new router)
- Updated: dashboard issue/run/violations pages with "Generate report" button + handler
- New: `apps/dashboard/src/lib/downloadReport.ts` (Blob→download helper)

### Deploy implications

[DEPLOY.md](DEPLOY.md) needs an update in this phase. Add to the `/etc/saync.env` block:
```
WATSONX_API_KEY=<IBM Cloud API key with watsonx.ai access>
WATSONX_PROJECT_ID=<watsonx project id>
WATSONX_BASE_URL=https://us-south.ml.cloud.ibm.com   # or eu-de, eu-gb, jp-tok
WATSONX_MODEL_ID=ibm/granite-3-3-8b-instruct
```
If they're absent, the rest of the stack runs fine — only the Generate Report endpoints return 503. Saync still does its job; the AI layer is optional.

### Acceptance criteria

- With `WATSONX_API_KEY` + `WATSONX_PROJECT_ID` set, clicking "Generate report" downloads a real watsonX-written markdown file in <30s for a typical run
- Without those env vars, clicking shows a clear "Configure watsonX.ai" state with exact env-var names
- Generated markdown contains: summary stats, per-page sections, per-API sections, per-flow sections, root-cause + fix per failure
- Token caching works (one IAM call per hour, not per report)
- A 30s `time_limit` on each watsonX call prevents hung requests
- Per-group concurrency capped at 3 — no thundering herd to watsonX

---

## Phase 4 — Production Violations Dashboard

**Goal:** Surface the production-violation data the reporter already collects, with the same Generate Report flow.

### Why this can't ship before Phase 3

The Generate Report button is the centerpiece of this page; without watsonX wired up, the page is half-built.

### Deliverables

**New dashboard page** — `apps/dashboard/src/app/p/[id]/violations/page.tsx`

Layout (same Sentry density as Phase 2):
- Top: aggregate stats — total violations last 24h / 7d / 30d, top affected contract
- Filter chips: time range, contract name, severity
- Table: contract · count · sessions · last hit · environment · action

**Aggregation** — backend extension to `/api/projects/:id/violations`:
- Optional `groupBy=contract` query param — returns clustered rows
- Each cluster: `{ contractName, componentName, occurrenceCount, sessionCount, firstSeenAt, lastSeenAt, severity, exampleViolation }`

**Detail drilldown** — click any clustered row → modal with last N raw violations, agent-style context

**Generate Report button** — uses the existing `/api/projects/:id/violations/report` endpoint from Phase 3, optionally with `?since=2024-01-01&until=2024-01-08` if a time range is filtered

**Reporter improvement** — rate limiting in [packages/react/src/reporter.ts](packages/react/src/reporter.ts):
- Per-session max 100 violations / 60s window
- After threshold, drop with `console.warn` once (don't spam console)
- Configurable via `<Saync.Provider maxViolationsPerWindow={...}>` for power users

### Acceptance criteria

- Inject 50 violations from a test user-agent, see them clustered into ~5 issues with `count: 10` each (or however they actually group)
- Filter by contract name reduces the table
- Time range filter persists in URL
- Generate Report downloads a markdown that summarizes the production patterns (not a per-contract dump)

---

## Phase 5 — Easy Install

**Goal:** A new user goes from "Create project" to "first run on the dashboard" in under 60 seconds.

### Deliverables

**Setup page** — extend [apps/dashboard/src/app/p/[id]/setup/page.tsx](apps/dashboard/src/app/p/[id]/setup/page.tsx):

Add a "One-block install" section that includes:

1. **Install command** with package-manager toggle (pnpm / npm / yarn / bun)
   ```bash
   pnpm add @saync/react @saync/agent
   ```

2. **Provider snippet** with the project ID hardcoded:
   ```tsx
   import { Saync } from '@saync/react';

   <Saync.Provider
     projectId="<this-project-id>"
     mode={import.meta.env.PROD ? 'report' : 'log'}
     apiKey={import.meta.env.VITE_SAYNC_API_KEY}
     backendUrl="<your-deployed-saync-url>"
   >
     <App />
   </Saync.Provider>
   ```

3. **`package.json` script** with all env vars baked in:
   ```json
   "scripts": {
     "saync": "SAYNC_BACKEND_URL=<host> SAYNC_API_KEY=<key> saync-agent --project-id <id> http://localhost:3000"
   }
   ```
   - Tabs for npm/pnpm/yarn/bun (only the runner command changes)
   - **Important**: API key shown ONLY on the fresh-from-create state (sessionStorage). Revisit → shows `<your-api-key>` placeholder.

4. **flows.ts starter** — boilerplate file the user can drop in:
   ```ts
   import { defineFlow } from '@saync/core';
   export const flows = [
     defineFlow({ name: 'example', steps: [
       { interact: 'login-button' },
       { expect: { url: '/dashboard' } },
     ]}),
   ];
   ```

5. **"Copy everything"** button — copies all 4 blocks as one paste-ready chunk with comments

### Files

- Updated: `apps/dashboard/src/app/p/[id]/setup/page.tsx` (rewrite with tabs + copy-everything)
- New: `apps/dashboard/src/components/InstallTabs.tsx`
- New: `apps/dashboard/src/components/CopyEverythingButton.tsx`

### Acceptance criteria

- Fresh project → setup page shows everything pre-filled with the real project ID and API key
- Copy-everything button puts a 4-section chunk in clipboard
- Pasting into a new Vite app + running `pnpm install && pnpm saync` produces a first run on the dashboard within 60s

---

## Cross-cutting

### Every new dashboard route (Phases 2 & 4) ships with three states
Each `app/p/[id]/<route>/page.tsx` must have:
- **Loading state** — a `loading.tsx` sibling using Skeleton blocks shaped like the final layout. Sentry's "feels fast" comes mostly from skeletons matching the real content.
- **Error state** — `error.tsx` with a clear message + "Try again" button + link back to project home.
- **Empty state** — explicit design when the data array is empty (no runs / no issues / no flows / no violations). Each different and useful.

Skipping these creates the AI-generic-template feeling we're explicitly avoiding.

### README + DEPLOY updates after each phase
Each phase produces user-visible changes that need to land in docs:
- After Phase 1: README mentions `saync.flows.ts`; agent help text covers flows
- After Phase 2: README screenshots refreshed; routes list updated
- After Phase 3: DEPLOY.md adds `WATSONX_*` env vars; README has a watsonX section
- After Phase 4: README adds the production-mode end-to-end story
- After Phase 5: README rewrites the Quick Start section around the one-block install

Don't ship a phase without its doc update.

### Env vars introduced across all phases

| Var | Where read | Required? | Default |
|---|---|---|---|
| `WATSONX_API_KEY` | backend | Required for Phase 3+ report endpoints | — |
| `WATSONX_PROJECT_ID` | backend | Required for Phase 3+ report endpoints | — |
| `WATSONX_BASE_URL` | backend | Optional | `https://us-south.ml.cloud.ibm.com` |
| `WATSONX_MODEL_ID` | backend | Optional | `ibm/granite-13b-instruct-v2` |
| `SAYNC_FLOWS_FILE` | agent | Optional | `./saync.flows.ts` |

### Security

- `WATSONX_API_KEY` lives **server-side only** — never sent to the dashboard client, never logged.
- All report endpoints require `X-Saync-Api-Key` matching the project's stored key.
- watsonX response is treated as untrusted text — escape any HTML in dashboard rendering (the markdown comes back as the file body, not as dashboard HTML, so XSS isn't a concern there).
- Token cache is per-process; restart loses cache but a fresh IAM exchange is one round-trip.

### Naming conventions

- Saync types in core: `SomethingExpectation`, `SomethingContract`.
- React components: `Saync.Component` namespace + `SayncComponent` named exports.
- Backend routes: kebab-case URL segments, snake_case DB columns, camelCase JS.
- Markdown filenames: `<kind>-<slug-or-id>-<YYYYMMDD>.md`.

### Open questions still on the table

1. **Source-map decoding for production stack traces** — out of scope for v1. Workaround: ship unminified bundles, or upload source maps to the backend later.
2. **PR-creation from a report** — out of scope. Reports are markdown the dev pastes into their IDE; auto-PR is a future thing.
3. **Multi-language support** — watsonX prompts are English-only for v1. Granite supports other languages; system prompt would need localization.
4. **Cost per report** — granite-13b-instruct-v2 is billed per token; expected per report: ~1.5k input + ~800 output tokens. Negligible at low volume, worth monitoring once any real team uses it.

---

## Glossary

- **Contract** — a behavioral assertion declared inline with a component (`expects={...}`).
- **Expectation** — the runtime representation of a contract, registered in `window.__SAYNC_EXPECTATIONS__`.
- **Run** — one invocation of the Playwright agent against a target URL.
- **Issue** — deduplicated cluster of failures (same `dedupHash`) across runs.
- **Violation** — single failed observation, from prod-mode reporter or one row in an agent run.
- **Flow** — an ordered sequence of interactions verifying a user journey, declared in `saync.flows.ts`.

---

## Phase 6 — Cleanup (run last, or interleaved as low-priority)

Small but real items not addressed in Phases 1–5. Listed here so they don't slip:

| Item | Fix |
|---|---|
| **Verifier waits 30s on disabled buttons** | In [verifier.ts](packages/agent/src/verifier.ts) `verifyButtonClick`, check `element.disabled` before click; if true, skip with a `pass: skipped-disabled` note. Stops the 30s Playwright retry. |
| **Demo's NavLink declares `toUrl` but `preventDefault`s** | Either change the demo's contract to remove `toUrl`, or change the onClick to actually navigate. The current setup catches itself; fine as a real-bug-example but worth resolving. |
| **No `data-saync-id` exposure for the user's own e2e tests** | The selectors we emit are namespaced (`data-saync-id`, `data-saync-name`); these double as stable selectors any external tool (Cypress, Playwright) can use. Document this in README. |
| **30-day auto-cleanup isn't configurable** | Backend's `cleanupOldRuns` uses a hardcoded 30 days. Add `SAYNC_RETENTION_DAYS` env var (default 30). One-line change. |
| **CORS env var doesn't support multiple origins** | Currently single-origin string. Accept comma-separated list for projects that serve the dashboard from multiple environments. |
| **Run history needs a "delete project" action** | No endpoint exists today to remove a project + its data. Add `DELETE /api/projects/:id` requiring the apiKey. |

None block any of Phases 1–5. Pick up between phases when the mood strikes.

---

## Out of scope (v1) — named so they don't drift in

Things that come up in product conversations but aren't in this roadmap. Listed to keep scope honest.

| Out of scope | Why later |
|---|---|
| Streaming reports (watsonX supports it) | Adds complexity to the download flow; current generation finishes in 10–20s — not worth the engineering for v1 |
| Source-map decoding for prod stack traces | Production builds minify; we'd need a source-map upload pipeline (Sentry's flow). Big feature, not a v1 |
| Webhook / Slack / email alerts on violation spike | Real-time alerting is a separate product surface |
| CSV / JSON export of raw data | Markdown report covers the AI-readable need; raw data lives in SQLite for SQL-savvy users |
| Multi-language UI / report generation | watsonX prompts and dashboard copy are English-only |
| Auto-PR from a report | Markdown is the handoff to the dev's IDE; auto-PR is a follow-on tool |
| Test-flake detection (intermittent failures) | Statistical, needs run history beyond v1 scope |
| Test-coverage view (which components have contracts vs. don't) | Useful but secondary |
| Multi-environment per project (dev / staging / prod tabs) | Today: one project = one env's data. Multi-env adds a column to most tables |

---

## Phase order is locked

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5  (→ Phase 6 cleanup, opportunistic)
Flows     UI         AI         Prod       Install     Polish
```

Each phase ends with a green build, all four existing packages compiling, and demo-app runnable. Each phase produces something demoable in isolation. Re-orderable in principle but unlikely worth it.

---

**End of roadmap.** Built ones get checked off; unbuilt ones get refined as we hit them, but the shape doesn't change.
