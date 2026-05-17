# Inspector — Design Doc

> **Purpose of this document:** This is the master design doc for building Inspector during the IBM Bob Hackathon. It contains the locked product vision, architecture, contracts, APIs, demo spec, and phased build order. Bob should read this carefully before writing any code, then plan execution one task at a time.

---

## 1. Project Overview

**Inspector** is a developer QA tool that catches bugs the way unit tests can't and observability can't — by verifying contracts the developer declares about their app's interactive behavior.

A developer installs a small SDK, wraps interactive elements (buttons, forms, inputs, links) with expectation contracts ("when this is clicked, the cart count should go up by 1, the API should fire with these specs, the URL should change to /success"), and Inspector then:

- **In development:** runs a Playwright-driven agent that exercises the app, verifies every contract at every breakpoint, and produces a beautifully designed bug report when contracts fail.
- **In production:** the same SDK observes real users silently, catching contract violations as they happen, surfacing the silent bugs Sentry misses.

The product's thesis: **expectations declared, not guessed.** Other tools rely on AI to guess intent. Inspector knows intent — because the developer wrote it down.

**Built with IBM Bob** — Bob's whole-repo reasoning is used during development (analyzing failures, generating root cause reports) and during the build process of Inspector itself.

---

## 2. Architecture

Inspector consists of five surfaces:

### Surface 1: Web SDK — `packages/sdk-web/`
A React library developers install in their app. Provides wrapper components for interactive elements. Captures interactions, registers them globally, wraps `fetch` to capture API calls.

### Surface 2: Agent — `packages/agent/`
A Node.js CLI tool that uses Playwright to open the developer's app, read the registry the SDK exposes, run through every tagged element, verify contracts, capture failures.

### Surface 3: Backend — `packages/backend/`
An Express server with SQLite. Receives results from the agent. Stores runs, results, issues. Triggers root cause analysis (writes markdown files Bob reads). Serves data to the dashboard.

### Surface 4: Dashboard — `apps/dashboard/`
A Next.js web app. Shows the developer their project's issues, test runs, contracts, and live agent activity. **This is the design moat.** Editorial design — Fraunces serif headlines, JetBrains Mono for code, calm off-white background, terracotta accent.

### Surface 5: Demo App — `apps/demo-shop/`
A small Next.js e-commerce app with deliberately planted bugs. Used to demonstrate Inspector during the demo.

### Data flow

```
Developer adds <Inspector.Button> tags to their app
        ↓
SDK registers each tag in window.__INSPECTOR__ at runtime
SDK wraps fetch to capture API calls
        ↓
Developer runs `npx inspector run`
        ↓
Agent opens app in Playwright (desktop + mobile)
Agent reads window.__INSPECTOR__ registry
        ↓
For each tagged element:
  - Capture pre-state
  - Execute action (click, type, submit)
  - Wait for stabilization
  - Capture post-state and API calls
  - Compare to contract
        ↓
Failures captured with rich context
        ↓
Agent POSTs results to backend
        ↓
Backend stores results, writes markdown to /inspector-reports/
        ↓
Bob (in IDE) reads the markdown + codebase → produces root cause + fix
        ↓
Dashboard renders issues as editorial bug reports
```

---

## 3. Contract Format (LOCKED)

The contract is the spine of the product. This format is locked. Every other component depends on it.

### TypeScript types

```ts
// packages/sdk-web/src/types.ts

export type InspectorTag = {
  id: string                    // unique id assigned at registration
  name: string                  // developer-provided name, e.g. "add-to-cart"
  type: 'button' | 'input' | 'link' | 'form' | 'region'
  expects?: Expects             // optional contract
  sourceFile?: string           // captured from React fiber or stack trace
  sourceLine?: number
  element?: HTMLElement | null  // ref to the DOM node
}

export type Expects = {
  // State change expectations (relative — works for any user)
  state?: {
    [key: string]: '+1' | '-1' | string | number | boolean
  }

  // API call expectations
  api?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    url?: string | RegExp
    status?: number | number[]
    responseShape?: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>
    bodyContains?: object
  }

  // UI expectations
  ui?: {
    url?: string                // expected URL after action
    appears?: string            // CSS selector that should become visible
    disappears?: string         // CSS selector that should disappear
    text?: { selector: string, contains: string }
  }

  // Timing expectations
  timing?: {
    maxMs?: number              // overall action max time
    apiMaxMs?: number           // max API response time
  }

  // Layout expectations (limited, deterministic only)
  layout?: {
    visibleAt?: ('mobile' | 'desktop')[]
    notClipped?: boolean
    minTapTarget?: number       // pixels, mobile only
  }
}

export type InspectorEvent = {
  tagId: string
  tagName: string
  eventType: 'click' | 'input' | 'submit' | 'navigate'
  timestamp: number
  preState?: Record<string, any>
  postState?: Record<string, any>
  apiCalls?: ApiCallRecord[]
  errors?: ErrorRecord[]
  durationMs?: number
}

export type ApiCallRecord = {
  method: string
  url: string
  status: number
  durationMs: number
  requestBody?: any
  responseBody?: any
}

export type ErrorRecord = {
  message: string
  source: 'console' | 'unhandled' | 'react-boundary'
  timestamp: number
}
```

### Example usage

```jsx
<Inspector.Button
  name="add-to-cart"
  onClick={addToCart}
  expects={{
    state: { cartCount: '+1' },
    api: { method: 'POST', url: '/api/cart', status: 200 },
    ui: { appears: '.toast-success' },
    timing: { maxMs: 500 }
  }}
>
  Add to Cart
</Inspector.Button>
```

---

## 4. SDK API

The SDK exports a namespace called `Inspector` with these components and hooks:

### `<Inspector.Provider>`

Wraps the entire app. Initializes the global registry. Wraps `fetch` for API capture. Provides React context to child components.

```jsx
<Inspector.Provider
  apiKey="ins_dev_xxx"
  projectId="demo-shop"
  mode="dev"  // or "prod"
>
  <App />
</Inspector.Provider>
```

Behavior:
- On mount, sets `window.__INSPECTOR__ = { tags: [], events: [], projectId, mode }`
- Wraps `window.fetch` to capture all outbound API calls
- Sets up a global error listener
- In `prod` mode, batches and sends events to the backend every 5s

### `<Inspector.Button>`

Wraps a native `<button>`. Registers the tag. Wraps `onClick` to capture pre/post state.

```jsx
<Inspector.Button name="..." onClick={...} expects={...}>
  Click me
</Inspector.Button>
```

Renders `<button data-inspector-id="...">` with all standard button props passed through.

### `<Inspector.Input>`

Wraps `<input>` or `<textarea>`. Captures keystrokes, blur events.

```jsx
<Inspector.Input name="email" type="email" value={...} onChange={...} expects={...} />
```

### `<Inspector.Link>`

Wraps `<a>` or `<Link>` (Next.js). Captures navigation.

```jsx
<Inspector.Link name="go-to-cart" href="/cart" expects={...}>
  View Cart
</Inspector.Link>
```

### `<Inspector.Form>`

Wraps `<form>`. Captures submission. Auto-detects child Inspector elements as form fields.

```jsx
<Inspector.Form name="checkout-form" onSubmit={...} expects={...}>
  <Inspector.Input name="email" />
  <Inspector.Button name="submit" type="submit">Pay</Inspector.Button>
</Inspector.Form>
```

### `<Inspector.Region>`

Wraps any element for layout-level expectations.

```jsx
<Inspector.Region name="hero" expects={{ layout: { visibleAt: ['mobile', 'desktop'] }}}>
  ...
</Inspector.Region>
```

### `useInspector()`

Hook for manual event tracking (sockets, polling, etc.)

```jsx
const { track } = useInspector()
track('order-update-received', { data })
```

---

## 5. The Demo App and Planted Bugs

The demo app is a small Next.js e-commerce app at `apps/demo-shop/`.

### Pages

- `/` (Home) — 3 product cards
- `/cart` (Cart) — list of items, remove, checkout
- `/checkout` (Checkout) — form with email, address, card
- `/success` (Success) — order confirmation

### Stack

- Next.js 14 (app router)
- Tailwind CSS
- localStorage for cart state (no backend needed)
- Fake API route at `/api/orders` that simulates an order POST

### The 6 planted bugs

#### Bug 1 — Dead button (functional)
**Where:** `components/ProductCard.tsx`, line 36
**What:** Product B's "Add to Cart" is rendered as `<div>` instead of `<button>`, no `onClick`
**Contract violated:** `state: { cartCount: '+1' }` — no state change after click
**Inspector catches:** click registered, no state change observed

#### Bug 2 — Regex chain (functional + API)
**Where:** `components/CheckoutForm.tsx`, line 67
**What:** Email validation regex missing TLD check (`\.[a-z]{2,}`)
**Contract violated:** API call returns 500 when expected 200 (server rejects malformed email)
**Inspector catches:** form accepts invalid email, traces failure to client-side regex

#### Bug 3 — Stale dependency (functional)
**Where:** `hooks/useCartTotal.ts`, line 14
**What:** `useMemo` dependency is `[cart.length]` instead of `[cart.items]`
**Contract violated:** removing an item changes cart items but total stays unchanged
**Inspector catches:** state contract violated (items changed, total didn't)

#### Bug 4 — API shape break (backend)
**Where:** `app/api/orders/route.ts`, line 23
**What:** When a discount code path is hit, response includes `orderId: null`
**Contract violated:** `responseShape: { orderId: 'string' }` — got null
**Inspector catches:** API returned 200 but with malformed shape (Sentry would miss)

#### Bug 5 — Tap target (layout)
**Where:** `components/CheckoutForm.tsx`, line 67 (Pay button)
**What:** Pay button height is 32px on mobile
**Contract violated:** `layout: { minTapTarget: 44 }`
**Inspector catches:** measurement at 375px viewport shows 32px height, below threshold

#### Bug 6 — Viewport overflow (layout)
**Where:** `components/PricingCard.tsx`, line 14
**What:** Pro plan card has `min-width: 380px`, overflows 375px mobile viewport
**Contract violated:** `layout: { notClipped: true }`
**Inspector catches:** element bounds extend past viewport width

---

## 6. Data Model (Backend)

SQLite database with 5 tables:

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  repo_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status TEXT,  -- 'running', 'completed', 'failed'
  viewport TEXT,
  environment TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE results (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  tag_type TEXT NOT NULL,
  expectation_json TEXT NOT NULL,
  observed_json TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  context_json TEXT,
  screenshot_path TEXT,
  source_file TEXT,
  source_line INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  title TEXT NOT NULL,
  first_seen_at TIMESTAMP,
  last_seen_at TIMESTAMP,
  severity TEXT,  -- 'critical', 'high', 'medium', 'low'
  root_cause_md TEXT,
  source_file TEXT,
  source_line INTEGER,
  status TEXT,  -- 'open', 'resolved', 'snoozed'
  occurrences_count INTEGER DEFAULT 1,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  session_id TEXT,
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  passed BOOLEAN,
  context_json TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### API endpoints

```
POST   /v1/runs                 # agent reports new run
POST   /v1/runs/:id/results     # agent reports result for one contract
POST   /v1/runs/:id/complete    # agent reports run complete
POST   /v1/events               # production SDK sends user events
GET    /v1/projects/:id/issues  # dashboard fetches issues
GET    /v1/issues/:id           # dashboard fetches one issue
GET    /v1/runs/:id             # dashboard fetches one run
GET    /v1/runs/:id/stream      # SSE stream of live run updates
```

---

## 7. Build Order (Phased Plan)

### Phase 1 — Foundation (Hours 0-3)

**Task 1.1:** Set up monorepo structure (npm workspaces)
**Task 1.2:** Create `packages/sdk-web/src/types.ts` with the full contract types (LOCKED above)
**Task 1.3:** Create `packages/sdk-web/src/InspectorContext.tsx` — React context for registry
**Task 1.4:** Create `packages/sdk-web/src/Provider.tsx` — wraps app, initializes registry on window, wraps fetch

**Exit criteria:** A test app wrapped in `<Inspector.Provider>` shows `window.__INSPECTOR__` initialized in the browser console.

### Phase 2 — SDK Components (Hours 3-8)

**Task 2.1:** `Inspector.Button` — register on mount, deregister on unmount, wrap onClick, capture pre/post state
**Task 2.2:** `Inspector.Input` — register, capture onChange/onBlur events
**Task 2.3:** `Inspector.Form` — register, detect child Inspector elements, capture onSubmit
**Task 2.4:** `Inspector.Link` — register, capture navigation
**Task 2.5:** `Inspector.Region` — register for layout checks

**Exit criteria:** A test app with all 5 component types correctly populates the registry, and clicks produce events in `window.__INSPECTOR__.events`.

### Phase 3 — Demo App (Hours 8-12)

**Task 3.1:** Scaffold Next.js app at `apps/demo-shop/`
**Task 3.2:** Build the 4 pages (Home, Cart, Checkout, Success)
**Task 3.3:** Add the fake API route `/api/orders`
**Task 3.4:** Wrap all interactive elements with Inspector components and contracts
**Task 3.5:** Plant the 6 bugs (manually — don't use Bob for this, you need full control)

**Exit criteria:** Demo app runs at localhost:3000, all 6 bugs are reproducible manually, the registry contains 18+ tagged contracts.

### Phase 4 — Agent (Hours 12-20)

**Task 4.1:** Scaffold Playwright in `packages/agent/`
**Task 4.2:** Open target URL, read `window.__INSPECTOR__` registry
**Task 4.3:** Plan interaction sequence based on registry
**Task 4.4:** For each contract:
  - Capture pre-state (cart count, URL, visible elements)
  - Execute action via Playwright
  - Wait for network idle + 200ms
  - Capture post-state and API calls
  - Compare to expectation
  - Record result
**Task 4.5:** Failure context capture (screenshots, DOM snapshot, console, network)
**Task 4.6:** Layout verification (viewport overflow, tap target measurement)
**Task 4.7:** Mobile viewport runs

**Exit criteria:** Running `npx inspector run` against the demo app produces a JSON results file that includes all 6 bugs flagged correctly.

### Phase 5 — Backend (Hours 20-24)

**Task 5.1:** Express server with SQLite at `packages/backend/`
**Task 5.2:** Implement the 7 API endpoints
**Task 5.3:** Issue aggregation logic (similar failures → one issue with N occurrences)
**Task 5.4:** Markdown report writer to `/inspector-reports/` folder
**Task 5.5:** Server-Sent Events for live run updates

**Exit criteria:** Agent successfully sends results to backend, backend writes markdown bug reports, dashboard can fetch issues via API.

### Phase 6 — Dashboard (Hours 24-32)

**Task 6.1:** Next.js app at `apps/dashboard/`
**Task 6.2:** Sidebar nav + project overview page
**Task 6.3:** Issues list with filters
**Task 6.4:** Issue detail page (editorial design — Fraunces, JetBrains Mono, terracotta accent)
**Task 6.5:** Live run page (browser frame mock + live activity log via SSE)
**Task 6.6:** Contracts page (list of all tagged elements)

Use the HTML mockups in `/inspector-mockup/` as the visual target. Replicate the design system: Fraunces serif headlines, Inter body, JetBrains Mono for code, #FAFAF7 background, #0F172A text, #D4502A accent.

**Exit criteria:** Dashboard is visually polished, all 5 pages work, real data from backend is displayed.

### Phase 7 — Polish & Submission (Hours 32-36)

**Task 7.1:** Demo video (2 minutes)
**Task 7.2:** README with setup instructions
**Task 7.3:** Export Bob sessions to `/bob_sessions/`
**Task 7.4:** Clean up credentials/keys
**Task 7.5:** Push to public GitHub
**Task 7.6:** Submit on lablab.ai

---

## 8. Bob Usage Strategy

Inspector relies on Bob's whole-repo reasoning twice:

1. **During development** (this hackathon): Bob writes the SDK, agent, backend, and dashboard. Bob session reports submitted as evidence.

2. **At runtime in the product**: When a bug is found, Bob (in the developer's own IDE) reads the bug report markdown + their codebase, generates the root cause analysis. This is built into the workflow — Inspector writes failure markdown to `/inspector-reports/`, the developer opens it in Bob, Bob fills in the root cause section.

For this 36-hour build, the 40 Bobcoins should be budgeted roughly:
- Phase 1 (types + Provider): 4 coins
- Phase 2 (5 SDK components): 8 coins
- Phase 3 (demo app): 5 coins
- Phase 4 (agent — the hardest part): 12 coins
- Phase 5 (backend): 4 coins
- Phase 6 (dashboard): 5 coins
- Reserve for debugging: 2 coins

---

## 9. What's deliberately cut from MVP

To stay buildable in time, we are NOT building:

- Mobile SDK runtime (we'll stub React Native components only)
- Visual UX quality detection (no AI judging "does this look good")
- Subjective layout checks beyond the 5 deterministic rules
- Multi-project management UI (hardcode one project for demo)
- API key UI flow (hardcoded for demo)
- Production observability backend (mock the UI only)
- Auth (single-user demo)
- Continuous mode (trigger manually via CLI)

These are mentioned in the pitch as "next" but not built.

---

## 10. Success Criteria

The hackathon submission is successful when:

1. ✅ The demo app runs at localhost:3000 with 6 reproducible bugs
2. ✅ Running `npx inspector run` finds all 6 bugs
3. ✅ Dashboard renders the bugs as editorial bug reports
4. ✅ Each bug report has Bob's root cause analysis
5. ✅ The live run page shows the agent working in real time
6. ✅ A 2-minute demo video shows the full flow
7. ✅ Bob session reports are exported to `/bob_sessions/`
8. ✅ Public GitHub repo is submitted on lablab.ai before deadline

---

## Instructions for Bob (Plan Mode)

Bob, read this entire document. Then:

1. Output the full project file structure as a tree
2. Output the first 10 implementation tasks in order, with file paths
3. Identify any clarifications or open questions
4. Do NOT write code yet — wait for explicit "code mode" instruction

Once the plan is approved, execute one task at a time. After each task, wait for review before moving to the next.

---

**End of design doc.**
