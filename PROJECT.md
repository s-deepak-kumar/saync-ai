# Saync — Project Context

*A deep-context memo. Read this and you understand what we built, why it exists,
and where the lines are drawn.*

---

## The one-paragraph version

**Saync** is a local-first QA platform for React apps. Developers wrap their
interactive components with thin SDK wrappers and declare *behavioral
contracts* inline — "this button should POST `/api/cart` in under 500ms",
"this form should redirect to `/success` on submit", "this input requires a
minimum of 8 characters". A Playwright-driven agent boots the user's dev
server, drives every declared contract, and reports any drift in a local
Sentry-style dashboard at `localhost:3777`. Everything — the SQLite database,
the agent, the dashboard — lives inside the user's repo. No SaaS. No signup.
No telemetry. Built for the IBM Bob hackathon.

---

## The problem we set out to solve

UI bugs slip through three different testing layers in modern React shops:

1. **Unit tests** assert function-level correctness, not user-visible behavior.
2. **Snapshot tests** catch DOM diffs but not *behavioral* drift — a button
   can still render correctly and call the wrong API.
3. **End-to-end tests** (Playwright, Cypress) are valuable but live in a
   separate `__tests__/` folder, drift from the components they test, and
   require their own maintenance budget. "I'll add tests later" is the
   default outcome.

The thing every dev *knows* about a component — which API it calls, what
status it should return, where it should navigate — usually lives only in
the dev's head or in a stale doc. Saync's wager: **make that knowledge a
declaration on the component itself, then verify it for free.**

The contract lives next to the implementation. They cannot drift.

---

## How it works (architecture)

```
┌─────────────────────────────────────┐    ┌────────────────────────────┐
│  Your React app (dev server)        │    │  saync-web (port 3777)     │
│  http://localhost:3000              │ ◄──┤    Next.js dashboard       │
│                                     │    │    + Route Handlers (API)  │
│  Components wrapped with the SDK    │    │    + better-sqlite3 store  │
│  emit:                              │    │    + chokidar watcher      │
│    data-saync-name="add-to-cart"    │    │    + app-connectivity probe│
│  Contracts live in:                 │    └────────────┬───────────────┘
│    window.__SAYNC_EXPECTATIONS__    │                 │
│                                     │                 │  spawns
└─────────────────────────────────────┘                 ▼
                ▲                            ┌─────────────────────────┐
                │ drives every contract      │  @saync/agent           │
                └────────────────────────────┤    Playwright (chromium)│
                                             │    POSTs results back   │
                                             └─────────────────────────┘
                                                          │
                                                          ▼
                                             .saync/saync.db
                                             (SQLite, in your repo)
```

Single process for the user, single tenant, fully local.

---

## Major design decisions (and why)

### 1. Local-first, not SaaS

We started building Saync as a multi-tenant SaaS — projects with unguessable
URL slugs, API-key auth, IBM Cloud deployment, separate backend service. Built
that in full. **Then pivoted.**

Reason: the value prop is "a tool that lives in your repo," not "a service
that hosts your QA data." Three concrete benefits of the pivot:

- **Trust collapses to zero ceremony.** No signup, no key rotation, no "where
  does my data go" question. The dev's machine *is* the deployment.
- **The mental model is simpler.** One process. One port. One DB file. The
  whole product is a single `npm install`.
- **Hackathon adoption gets easier.** A judge can install + run in under a
  minute. A SaaS demo requires a hosted instance.

The pivot took about half a day. We deleted `packages/backend`, swapped
Bun → Node, replaced `bun:sqlite` with `better-sqlite3`, dropped the
`projects` and `api_keys` tables, flattened all `/p/[id]/*` routes to `/*`,
and stripped every auth header.

The dashboard JSX survived. The data layer + routing did not.

### 2. Single shippable package (`saync-web`)

Users install **one thing**:

```bash
npm install --save-dev saync-web
```

`saync-web` bundles the dashboard (a Next.js standalone server), the CLI
binary, and the SQLite schema. It declares the three SDK packages
(`@saync/core`, `@saync/react`, `@saync/agent`) as dependencies, so npm
installs them transitively. Users can import from either:

- `saync-web` / `saync-web/react` / `saync-web/agent` — the friendlier
  one-package paths backed by re-exports.
- `@saync/core` / `@saync/react` / `@saync/agent` — direct npm packages,
  same code.

Both work. The npm page shows the saync-web README; the source-of-truth
documentation lives in this repo.

### 3. Bring your own LLM (BYOK)

Saync ships **no LLM keys**. AI report generation is opt-in via the user's
own `.env`:

```
WATSONX_API_KEY=…  +  WATSONX_PROJECT_ID=…
OPENAI_API_KEY=…
ANTHROPIC_API_KEY=…
```

Whichever's set wins (Watson takes precedence to match the IBM-first angle).
Privacy: only the prompt context (issue messages, stack traces, expected /
observed values) goes to the chosen provider; nothing else leaves the
machine. The dashboard's `/settings` page shows which provider is configured.

### 4. Playwright over Cypress / Puppeteer

Playwright is a real browser, has the best parallel test infra, mature
network-interception primitives, and a Node-native CLI. The agent uses
Chromium specifically (one engine to verify against, smaller install).

### 5. Drizzle + better-sqlite3

- **better-sqlite3** is the fastest synchronous SQLite binding in Node. The
  whole product is a single process, so async I/O for the DB adds no value
  and synchronous reads simplify the route handlers.
- **Drizzle** gives best-in-class TypeScript inference on top of SQLite,
  with first-class migration tooling. The schema is co-located with the
  code that uses it (`apps/dashboard/src/lib/db/schema.ts`).

### 6. Next.js 14 App Router as the entire backend

After the SaaS-to-local pivot, we collapsed the standalone backend service
into Next.js Route Handlers. One process serves the dashboard, the agent
ingest API, and the SSE stream. The standalone build (`output: 'standalone'`)
ships a self-contained server that boots in ~150ms.

### 7. Single-tenant, no auth

In local mode the agent runs on the same machine as the dashboard, so any
auth would just be ceremony. All HTTP endpoints are unauthenticated. If
a future user deploys Saync alongside a public app for production violations
collection, they can put a reverse proxy in front; we don't paper over that
problem in the core.

### 8. Sentry-style dashboard, not Storybook-style

We took inspiration from Sentry's dense, technical UI rather than the
playful catalogue style of Storybook / Chromatic. Reason: contracts are
about *correctness*, not visual review. The user mental model is closer to
"production observability for dev" than "design system catalog".

### 9. IBM Plex typography (the hackathon angle)

The landing site uses IBM Plex Sans / Plex Serif / Plex Mono — the
free-and-Google-hosted IBM type family. This matches the Bob brand without
needing licensed assets. The dashboard kept a neutral Sentry-ish system but
the same color palette (terracotta accent, dark sidebar, light canvas).

---

## What's in the box

### Published npm packages

| Package | Version | Purpose |
|---|---|---|
| [`saync-web`](https://www.npmjs.com/package/saync-web) | 0.1.1 | CLI binary + Next.js dashboard + standalone server. Most users install only this. |
| [`@saync/react`](https://www.npmjs.com/package/@saync/react) | 0.1.0 | React SDK — 38 wrapped primitives (Button, Form, Input, Modal, Tooltip, Table, …). |
| [`@saync/agent`](https://www.npmjs.com/package/@saync/agent) | 0.1.0 | Playwright-driven runner. `saync run` invokes it; `saync-agent <url>` is the standalone CLI. |
| [`@saync/core`](https://www.npmjs.com/package/@saync/core) | 0.1.1 | Types + `defineFlow` + the expectation registry. |

### Repo layout

```
saync-ai/
├── apps/
│   ├── dashboard/              published as saync-web
│   │   ├── bin/saync.mjs       CLI entrypoint
│   │   ├── cli/                start | run | clear + config loader + probe + watcher
│   │   ├── public/saync-llm.md the AI-context download
│   │   ├── sdk/                subpath re-exports (./react, ./agent, ./)
│   │   ├── src/app/            Next.js App Router: home, issues, runs, flows, violations, settings, setup
│   │   ├── src/app/api/        Route Handlers (all backend endpoints)
│   │   ├── src/lib/db/         schema + connection (Drizzle + better-sqlite3)
│   │   └── drizzle/            migrations
│   └── site/                   landing + docs (Vercel)
│
├── packages/
│   ├── core/                   @saync/core — types, registry, defineFlow
│   ├── react/                  @saync/react — 38 SDK components
│   └── agent/                  @saync/agent — Playwright runner
│
├── examples/
│   └── demo-app/               Vite "Saync Shop" with 18 contracts + planted bugs
│
├── README.md                   monorepo overview
├── PROJECT.md                  this file
└── apps/dashboard/public/saync-llm.md
                                 single-file LLM context for AI assistants
```

---

## Tech stack

| Layer | Tech | Why |
|---|---|---|
| Runtime | Node 18+ | Ubiquitous on dev machines |
| Package manager | pnpm (internal) | Workspaces + symlink hoisting |
| Bundler / shell | Next.js 14 App Router | Routes + SSR + standalone output in one box |
| UI | React 18 | What the SDK targets |
| Database | SQLite | Zero-config, embeddable, fast for our scale |
| DB driver | better-sqlite3 | Fastest sync binding; matches one-process model |
| ORM | Drizzle | Best TS inference for SQLite |
| Validation | Zod | Route Handler request body validation |
| File watcher | chokidar | Stable cross-platform fs watcher |
| User-config loader | jiti | Loads `saync.config.ts` / `saync.flows.ts` at runtime |
| Browser automation | Playwright (chromium) | Real browser, mature CI story |
| Styling | Tailwind | Density + utility velocity |
| Typography (site) | IBM Plex Sans/Serif/Mono | IBM Bob brand alignment |
| Typography (dashboard) | System fonts + JetBrains Mono | Sentry-style readability |
| Icons | lucide-react | Open-source, tree-shakable |

---

## Three contract types the agent verifies (the conceptual model)

### Atomic contracts (component-level)

Declared on the SDK component itself.

```tsx
<SayncButton
  name="add-to-cart"
  expects={{
    onClick: {
      apiCall: { method: 'POST', url: '/api/cart', expectedStatus: 200, maxDuration: 500 },
      responseShape: { cartCount: 'number' },
    },
  }}
  onClick={addToCart}
>
  Add to cart
</SayncButton>
```

The agent finds every element with a `data-saync-name`, drives the
appropriate interaction, observes the network and DOM, asserts each
declared field.

### Multi-step flows (journey-level)

Declared in `saync.flows.ts` at the repo root.

```ts
import { defineFlow } from 'saync-web';

export const flows = [
  defineFlow({
    name: 'checkout',
    steps: [
      { interact: 'add-to-cart' },
      { fill: 'email', with: 'demo@example.com' },
      { interact: 'place-order' },
      { expect: { url: '/success' } },
    ],
  }),
];
```

The agent halts at the first failing step; subsequent steps are marked
`skipped`. Failed steps capture a base64 PNG screenshot.

### Production violations (real-user level)

When the SDK is mounted with `mode="report"`, it wraps `window.fetch` and
batches contract violations from real users to the local Saync server via
`POST /api/violations`. They appear next to local runs in the dashboard.

---

## The journey (and the cuts)

### Original plan (the SaaS chapter)

- Multi-tenant Next.js dashboard at `/p/[id]/*`
- Bun + Hono backend on a separate process / port (4000)
- Drizzle + bun:sqlite, projects + api_keys tables
- `X-Saync-Api-Key` header on every write
- IBM Cloud VPC VSI deployment
- Public docs at `localhost:3000`, project-scoped views at `/p/<uuid>`

We shipped Phase 1 (flows) and Phase 2 (Sentry-style UI rewrite) of that
plan. Then realized the local-first pivot.

### What we cut

- `packages/backend/` entirely (~1500 lines)
- `projects` and `api_keys` tables
- All `project_id` columns
- API-key middleware + reporter auth headers
- Hono + Bun runtime dependencies
- IBM Cloud deployment scaffolding + Dockerfile chapter
- Project-creation landing page + setup flow
- Multi-tenant URL routing

### What we kept

- Drizzle schema (minus the auth tables)
- All Hono route handlers (ported one-to-one to Next Route Handlers)
- The 38-component SDK
- The Playwright agent
- The flows system (defineFlow + step kinds + screenshots)
- The dashboard JSX (rewritten paths, same components)
- The SSE pubsub for live updates (currently unwired — see "what's pending")

### What we added (Phase C–E)

- `bin/saync` CLI binary
- `saync.config.ts` loader (jiti)
- App-connectivity probe
- chokidar file watcher (local-mode auto-rerun)
- BYOK LLM detection (WatsonX / OpenAI / Anthropic)
- `/settings` page with mode + DB + clear-data + LLM status
- `apps/site/` landing + docs (Vercel-ready)
- `saync-llm.md` — 647-line AI-context download
- Sub-path re-exports so `saync-web/react` works from one install

---

## Current state — honest

### Works end-to-end (verified via fresh `npm install` in `/tmp/saync-dogfood`)

- `npm install --save-dev saync-web` resolves all four packages from the public registry
- `npm run saync` boots the dashboard standalone server in ~150ms
- Drizzle migrations run automatically on first boot
- App-connectivity probe writes status every 3s
- File watcher debounces saves and re-invokes `saync run`
- Agent drives all atomic contracts + all flows against the live dev server
- Results POST to the dashboard, dedupe into issues, render in the UI
- All 7 dashboard routes return 200
- `saync-llm.md` is served from the npm-installed package
- `/settings` "clear data" wipes the DB correctly
- LLM-status endpoint detects all three providers via env vars

### Doesn't work yet (deliberately)

| Gap | Status | Why it's a gap |
|---|---|---|
| **Live SSE updates** | Infra exists (`/api/runs/[id]/stream`); the UI doesn't wire it | Dashboard feels static; new runs require a refresh |
| **Production violations clustered view** | `POST /api/violations` works; UI is a placeholder card | The "production reporter" half of the product is invisible |
| **`POST /api/llm/generate`** | Returns 501 | The "Generate report" buttons are decorative |
| **Runs filtering** | None | Can't filter to failed runs only |
| **Empty-state polish** | Bare zeros and dashes | First-time experience could explain the next move |
| **Dark mode** | None | Not a blocker; nice for devs |

### Known papercuts

| Papercut | Fix |
|---|---|
| Connected-dot flashes red at boot for ~3s | Initial sync probe before Next spawns |
| Port 3777 collision dies with raw EADDRINUSE | Catch + print friendly message |
| Missing chromium gives Playwright stack trace | Print `npx playwright install chromium` instead |
| `examples/demo-app` still uses workspace deps | Switch to `saync-web@0.1.1` from npm |

---

## How to develop on this repo

```bash
git clone https://github.com/s-deepak-kumar/saync-ai
cd saync-ai
pnpm install

# Build the SDK packages
pnpm -r --filter='!demo-app' --filter='!@saync/site' build

# Terminal 1 — the demo app
cd examples/demo-app && pnpm dev          # vite on :5173

# Terminal 2 — Saync, from the demo's directory
cd examples/demo-app
node ../../apps/dashboard/bin/saync.mjs start
# Open http://localhost:3777

# Terminal 3 — one-shot agent run
cd examples/demo-app
node ../../apps/dashboard/bin/saync.mjs run

# Site (landing + docs)
cd apps/site && pnpm dev                  # http://localhost:4000
```

For testing the published flow exactly as a new user would:

```bash
mkdir /tmp/saync-trial && cd /tmp/saync-trial
npm init -y
npm install --save-dev saync-web
npm run saync   # add the script first
```

---

## File-level pointers

| Want to read | Look at |
|---|---|
| The contract type definitions | `packages/core/src/types.ts` |
| The flow step union | `packages/core/src/flows.ts` |
| How a component wraps a contract | `packages/react/src/Button.tsx` (every other follows the same shape) |
| The Provider + global registry | `packages/react/src/Provider.tsx` + `packages/core/src/registry.ts` |
| Production-mode fetch wrapping | `packages/react/src/reporter.ts` |
| Agent's entry point | `packages/agent/src/runner.ts` |
| How the agent discovers `saync.flows.ts` | `packages/agent/src/flows.ts` (jiti) |
| Database schema | `apps/dashboard/src/lib/db/schema.ts` |
| CLI subcommands | `apps/dashboard/cli/index.mjs` |
| LLM provider resolution | `apps/dashboard/src/lib/llm.ts` |
| Landing page sections | `apps/site/src/app/page.tsx` |
| The big LLM context doc | `apps/dashboard/public/saync-llm.md` |

---

## Glossary

- **Contract** — a structured promise about how a component should behave
  (which API it should call, how fast, what shape the response should have).
- **Expectation** — synonym for contract; the API uses both terms
  interchangeably.
- **Flow** — an ordered sequence of steps representing a user journey.
- **Run** — a single agent execution. Includes all contract verifications
  + all flows + their step results.
- **Result** — one row in `contract_results`. A pass / fail / warn for a
  single contract.
- **Issue** — a deduplicated cluster of contract failures (same contract +
  same error message rolled into one).
- **Occurrence** — a single instance of an issue, linked to the run /
  result that produced it.
- **Violation** — a production-mode (real-user) contract failure, posted
  by the SDK via `POST /api/violations`.
- **Mode** — `local` (watcher) / `dev` (one-shot + reporter) / `prod`
  (reporter only). Set via `SAYNC_MODE` or `saync.config.ts`.
- **Provider** — `<Saync.Provider>`, the root SDK component. Initializes
  the global registry + optionally the production reporter.

---

## Bottom line

What we have: a working, dogfood-verified, npm-published, locally-runnable
QA platform with a clear product story, decent landing page, and a single-
file LLM-context doc you can paste into any AI assistant.

What's missing from "great": live updates, the production-violations view,
real LLM report generation, a few empty-state and polish touches.

Built for the IBM Bob hackathon. MIT licensed. Made with Bob.
