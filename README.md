# Saync

**Verify what your app should do.** Declare contracts on your UI components, run a Playwright-driven agent that drives them, see failures in a Sentry-style dashboard — all inside your repo. No SaaS, no signup, no telemetry. MIT licensed.

```bash
npm install --save-dev saync-web
```

```json
{ "scripts": { "saync": "saync start" } }
```

```bash
npm run saync
```

Open <http://localhost:3777>. Your data lives at `.saync/saync.db` inside your project — your code, your machine.

---

## 30-second example

```tsx
import { Saync, SayncForm, SayncInput, SayncSelect, SayncButton } from 'saync-web/react';

export default function App() {
  return (
    <Saync.Provider mode="log">
      <SayncForm
        name="checkout"
        onSubmit={placeOrder}
        expects={{
          onSubmit: {
            apiCall: { method: 'POST', url: '/api/orders', expectedStatus: 200 },
            responseShape: { orderId: 'string' },
          },
        }}
      >
        <SayncInput  name="email"    type="email" expects={{ validation: { required: true } }} />
        <SayncSelect name="shipping"              expects={{ validation: { required: true } }}>
          <option value="standard">Standard</option>
          <option value="express">Express</option>
        </SayncSelect>
        <SayncButton name="place-order" type="submit">Place order</SayncButton>
      </SayncForm>
    </Saync.Provider>
  );
}
```

Every part of that declaration is verified when the agent runs — the right API fires, the email validation actually blocks bad addresses, the shipping select offers the declared options. Each violation lands on `localhost:3777` with `expected` vs `observed`.

---

## Building with an AI assistant?

Saync ships a **single Markdown context file** designed to be pasted into Claude / ChatGPT / Cursor / any LLM. It teaches the model every component, contract shape, flow step, and CLI command in one paste.

After `saync start`, grab it at <http://localhost:3777/saync-llm.md>, or directly from the source: [apps/dashboard/public/saync-llm.md](apps/dashboard/public/saync-llm.md).

---

## What's in the monorepo

| Package | Published as | What it is |
|---|---|---|
| `apps/dashboard` | [`saync-web`](https://www.npmjs.com/package/saync-web) | The CLI binary + Next.js dashboard + standalone server bundled for npm. Most users install just this. |
| `packages/react` | [`@saync/react`](https://www.npmjs.com/package/@saync/react) | React SDK — 38 wrapped primitives (Button, Form, Input, Modal, Tooltip, Table, …) plus `useSaync()`. |
| `packages/agent` | [`@saync/agent`](https://www.npmjs.com/package/@saync/agent) | Playwright-driven runner. `saync run` invokes it; `saync-agent <url>` is the standalone CLI. |
| `packages/core` | [`@saync/core`](https://www.npmjs.com/package/@saync/core) | Types + `defineFlow` + the expectation registry. |
| `apps/site` | (Vercel) | Landing + docs site — `/` and `/docs`. |
| `examples/demo-app` | (not published) | "Saync Shop" demo with planted bugs and a `saync.flows.ts`. |

---

## Quick start (use Saync in your own app)

### 1. Install

```bash
npm install --save-dev saync-web
```

### 2. Add the script + boot

```json
{ "scripts": { "saync": "saync start" } }
```

```bash
npm run saync
# Open http://localhost:3777
```

### 3. Wrap your components

```tsx
import { Saync, SayncButton } from 'saync-web/react';

<Saync.Provider mode="log">
  <SayncButton
    name="add-to-cart"
    onClick={addToCart}
    expects={{
      onClick: { apiCall: { method: 'POST', url: '/api/cart', expectedStatus: 200 } },
    }}
  >
    Add to cart
  </SayncButton>
</Saync.Provider>
```

### 4. (Optional) Add multi-step flows

```ts
// saync.flows.ts at your repo root
import { defineFlow } from 'saync-web';

export const flows = [
  defineFlow({
    name: 'checkout',
    steps: [
      { interact: 'add-to-cart' },
      { interact: 'go-to-checkout' },
      { fill: 'email', with: 'demo@example.com' },
      { interact: 'place-order' },
      { expect: { url: '/success' } },
    ],
  }),
];
```

### 5. (Optional) Bring your own LLM for AI reports

Drop one of these into your project's `.env`:

```
WATSONX_API_KEY=…  +  WATSONX_PROJECT_ID=…
OPENAI_API_KEY=…
ANTHROPIC_API_KEY=…
```

Saync reads them at boot and surfaces a "Generate report" button on issue/run/violation pages.

---

## Modes

| Mode | When | Behavior |
|---|---|---|
| `local` (default) | dev | File watcher re-runs the agent on every save |
| `dev` | staging | One-shot at build time + production reporter live |
| `prod` | production | Production reporter only; retention tuned for live traffic |

Set via `SAYNC_MODE` env var or `mode: 'dev'` in `saync.config.ts`.

---

## Develop on this repo

```bash
git clone https://github.com/s-deepak-kumar/saync-ai
cd saync-ai
pnpm install

# Build the workspace
pnpm -r --filter='!demo-app' --filter='!@saync/site' build

# Terminal 1 — boot the dashboard against the demo-app
cd examples/demo-app && pnpm dev          # vite on :5173

# Terminal 2 — boot Saync from the demo's directory
cd examples/demo-app
node ../../apps/dashboard/bin/saync.mjs start
# Open http://localhost:3777
```

For the landing/docs site:

```bash
cd apps/site && pnpm dev                  # http://localhost:4000
```

---

## Contract types — what the agent actually verifies

| Contract | Applies to | Asserts |
|---|---|---|
| `apiCall: { method, url, expectedStatus, maxDuration }` | Button, Form, Input.onChange, Select, etc. | The right HTTP request fires with the right method/status/duration |
| `responseShape: { …field types }` | Any contract with `apiCall` | Response JSON has the declared field types |
| `validation: { required, pattern, minLength, maxLength, message }` | Input, Textarea | DOM attributes match declared rules |
| `validation: { required }` on Choice contracts | Select, Checkbox, Radio, Slider | Required state matches |
| `onSubmit: { apiCall, responseShape, resetAfterSubmit }` | Form | Submit fires the API, response matches |
| Navigation (`to`, `preventDefault`) | Link, NavLink | Click navigates to the declared URL |
| Disclosure (`closesOnEscape`, `closesOnOutsideClick`, `hasBackdrop`) | Modal, Drawer, Popover, Menu | Open/close behaviors work |
| Tooltip (`showsOnHover`, `containsText`, `hidesOnBlur`) | Tooltip | Hover/blur work as declared |
| Image / Badge / Avatar / Notice / List / Table / Tree | Each | Loaded, in range, contains text, etc. |

Full definitions: [packages/core/src/types.ts](packages/core/src/types.ts).

---

## Architecture

```
┌─────────────────────┐       ┌─────────────────────┐
│   Your dev server   │ ◄───  │  saync start :3777  │
│   localhost:3000    │ poll  │  · Next dashboard   │
│  components wrapped │       │  · Watcher          │
│  with <Saync.*>     │       │  · App probe        │
│                     │       └──────────┬──────────┘
└─────────────────────┘                  │ spawns
         ▲                               ▼
         │           ┌─────────────────────┐
         └───────────│  Playwright agent   │
            drives   │  reads contracts    │
                     │  POSTs to dashboard │
                     └─────────────────────┘
                              │
                              ▼
                     .saync/saync.db
                     (SQLite in your repo)
```

Single-process, single-tenant, local. No backend service. No keys, no projects, no remote anything.

---

## License

MIT. Source: <https://github.com/s-deepak-kumar/saync-ai>. Made with Bob.
