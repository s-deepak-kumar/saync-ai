# Saync

**Declare what your app should do. Verify it automatically.**

Saync is a developer QA platform that catches bugs by checking *contracts you write inline* with your components — not separate test files, not AI-guessed intent, not after-the-fact error reports. Wrap an interactive element, declare what should happen when a user touches it, and a Playwright-driven agent verifies every contract on every run.

```tsx
import { Saync } from '@saync/react';

<Saync.Form
  name="checkout"
  onSubmit={placeOrder}
  expects={{
    onSubmit: {
      apiCall: { method: 'POST', url: '/api/orders', expectedStatus: 200 },
      responseShape: { orderId: 'string' },
      redirectTo: '/success',
    },
  }}
>
  <Saync.Input name="email" type="email" expects={{
    validation: { required: true, type: 'email', pattern: '^[^@]+@[^@]+\\.[a-z]{2,}$' },
  }} />
  <Saync.Select name="shipping" expects={{
    validation: { required: true, allowedValues: ['standard', 'express', 'overnight'] },
  }} />
  <Saync.Button name="place-order" type="submit" expects={{ onClick: {} }}>
    Place order
  </Saync.Button>
</Saync.Form>
```

When you run the agent, every part of that declaration is verified against reality — the form submit fires the right API, the email regex really blocks bad addresses, the shipping select actually offers all three options, the redirect lands where promised. Each violation lands on the dashboard with `expected` vs `observed` values.

---

## What's in the box

| Package | What it is |
|---|---|
| **`@saync/react`** | React SDK — 42 components (Button, Form, Input, Modal, Tooltip, Table, …) plus `useSaync()` hook and `<Saync.Provider>` |
| **`@saync/agent`** | Playwright-based CLI — `saync-agent <url>` reads your declared contracts from a running app and verifies each one |
| **`@saync/backend`** | Bun + Hono + SQLite server — receives results, deduplicates issues, streams live updates to the dashboard via SSE |
| **`@saync/core`** | Framework-agnostic types + registry the React SDK is built on |
| **`@saync/dashboard`** (Next.js app) | Editorial UI — your projects, runs, issues, install snippet. Multi-tenant by unguessable project URL. |
| **`examples/demo-app`** | A small "Saync Shop" (Vite + React) wrapped with 18 contracts and 5 intentionally planted bugs — the test subject the agent runs against |

---

## Quick start (use Saync in your own app)

### 1. Create a project on the dashboard

Visit your Saync dashboard (locally `http://localhost:3000`) → "Create project" → save the `sync_…` API key shown ONCE on the setup page.

### 2. Install the SDK + agent

```bash
pnpm add @saync/react @saync/agent
```

### 3. Wrap your app

```tsx
import { Saync } from '@saync/react';

export default function App() {
  return (
    <Saync.Provider projectId="<your-project-id>" mode="log">
      <YourApp />
    </Saync.Provider>
  );
}
```

Then wrap individual interactive elements:

```tsx
<Saync.Button name="add-to-cart" onClick={addToCart} expects={{
  onClick: { apiCall: { method: 'POST', url: '/api/cart', expectedStatus: 200 } },
}}>
  Add to cart
</Saync.Button>
```

### 4. Run the agent against your running app

```bash
SAYNC_BACKEND_URL=http://<your-saync-host>:4000 \
SAYNC_API_KEY=sync_… \
pnpm exec saync-agent --project-id <your-project-id> http://localhost:3000
```

Results stream to the dashboard live. Markdown failure reports are also written to `./saync-reports/` for your IDE to open.

---

## Run the whole platform locally (for development)

```bash
git clone https://github.com/your-org/saync-ai
cd saync-ai
pnpm install

# Build the packages
pnpm -r build

# Terminal 1 — backend (Bun runtime required)
bun run packages/backend/src/index.ts     # listens on :4000

# Terminal 2 — dashboard
cd apps/dashboard && pnpm dev             # serves on :3000

# Terminal 3 — demo app (the test subject)
cd examples/demo-app && pnpm dev          # serves on :5173

# Terminal 4 — run the agent against the demo
# (first, create a project at http://localhost:3000 and copy the API key)
SAYNC_BACKEND_URL=http://localhost:4000 \
SAYNC_API_KEY=sync_… \
pnpm --filter demo-app exec saync-agent \
  --project-id <the-id> http://localhost:5173
```

Then open `http://localhost:3000/p/<project-id>` to see the run land on the dashboard.

---

## SDK component reference

All 42 components share the same registration shape:

```tsx
<Saync.SomeComponent
  name="<contract-id-for-the-dashboard>"
  expects={{ ...what-the-agent-should-verify }}
  {...native-element-props}
/>
```

### Foundation
- `<Saync.Provider>` — wraps your app; required for context-based registration
- `useSaync()` — hook for manual `track(name, data)` events (sockets, polling)
- `<Saync.ErrorBoundary>` — catches React errors into `window.__SAYNC__.events`

### Forms & inputs
Button · Form · Input · Textarea · Select · Checkbox · Switch · Radio + RadioGroup · Slider · FileInput · DatePicker

### Navigation
Link · NavLink · Tabs + Tab · Breadcrumb + BreadcrumbItem · Pagination · Menu + MenuItem

### Containers
Region · Section · Modal · Dialog · Drawer · Popover · Tooltip · Accordion + AccordionItem

### Display
Image · Avatar · Badge · Toast · Alert · Spinner · Progress · Skeleton

### Data
List · Table · Card · Tree

---

## Contract types — what the agent actually verifies

| Contract | Applies to | Asserts |
|---|---|---|
| `apiCall: { method, url, expectedStatus, maxDuration }` | Button, Form, Input.onChange, Select, etc. | The right HTTP request fires with the right method/status/duration |
| `responseShape: { …field types }` | Any contract with `apiCall` | Response JSON has the declared field types |
| `validation: { required, pattern, min, max, allowedValues, type, … }` | Input, Textarea, Select, Slider, FileInput, DatePicker | DOM attributes match declared rules; select/radio offer the declared options |
| `onSubmit: { apiCall, responseShape, redirectTo, preventsSubmitWhenInvalid }` | Form | Submit fires the API, response matches, URL lands at the declared redirect |
| `onNavigate: { toUrl, appears, apiCall }` | Link, NavLink | Click navigates to `toUrl`, declared element appears at the destination |
| `layout: { visibleAt, notClipped, minTapTarget, containsText, appears }` | Region, Section | Element is visible at named viewports (mobile/tablet/desktop), not clipped, tap-target ≥ N px |
| Disclosure (`closesOnEscape`, `closesOnOutsideClick`, `hasBackdrop`) | Modal, Drawer, Popover, Menu | Open/close behaviors work; backdrop / Escape / outside-click all dismiss |
| Tooltip (`showsOnHover`, `containsText`, `hidesOnBlur`) | Tooltip | Hover shows bubble with declared text, blur hides it |
| Image / Badge / Avatar / Notice / List / Table / Tree | Each component | Loaded successfully, in range, contains text, row/column count matches, etc. |

The full type definitions live in [`packages/core/src/types.ts`](packages/core/src/types.ts).

---

## Architecture

```
Your app                                         Saync platform
─────────                                        ──────────────
<Saync.Provider>                                ┌────────────────┐
  <Saync.Button name="x" expects={…}>           │  Dashboard     │
                                                │  (Next.js)     │
                       ↓                        │                │
              window.__SAYNC_EXPECTATIONS__     │  GET /api/…   ←─
                                                │  SSE stream   ←─
                       ↓                        └────────────────┘
                                                        ↑ reads
              `saync-agent <url>`                       │
              (Playwright)                       ┌──────┴─────────┐
                       ↓                         │  Backend       │
              POST /api/runs                ─→   │  (Bun + Hono   │
              POST /api/runs/:id/results    ─→   │   + SQLite)    │
              POST /api/runs/:id/complete   ─→   │                │
              SSE → live stream             ←─   │  X-Saync-Api-  │
                                                 │  Key per       │
                                                 │  project       │
                                                 └────────────────┘
```

- Each project has an unguessable `id` (the dashboard URL slug) and an `apiKey` (write auth on the backend).
- Reads are public — knowing the URL is the access control.
- Writes require the project's API key in the `X-Saync-Api-Key` header.

---

## Modes

`<Saync.Provider mode={…}>` accepts three values:

- `'off'` — Provider does nothing; no globals, no overhead. Production builds default to this.
- `'log'` — Default in dev (`NODE_ENV !== 'production'`). Components register into `window.__SAYNC_EXPECTATIONS__` for the agent to read. No network activity from the SDK.
- `'report'` — Future: wraps `window.fetch`, batches contract violations from real users, POSTs to the backend as production observability data. Skeleton wired; not feature-complete in v0.1.

---

## Deploy

See [DEPLOY.md](DEPLOY.md) for IBM Cloud / VPS deploy recipes.

---

## License

MIT
