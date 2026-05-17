# Saync — Complete LLM Context

> **How to use this file.** Drop the entire contents of this document into any AI assistant (Claude, ChatGPT, Cursor, Copilot Chat, etc.) at the start of a session, then ask for help adding Saync to a project. The assistant will have full context: what Saync is, how to install it, every component prop, every flow step type, every CLI command, and the exact API surface.
>
> **Last verified for:** `saync-web@0.1.0`, `@saync/react@0.1.0`, `@saync/agent@0.1.0`, `@saync/core@0.1.0`.

---

## 1. What Saync is

Saync is a **local-first QA platform** for React apps. You wrap interactive components and declare what they should do; a Playwright-driven agent runs your app and verifies every declared contract; a Sentry-style dashboard surfaces failures.

The whole thing runs inside the developer's repo. No SaaS, no signup, no API keys, no telemetry. SQLite DB lives in `.saync/saync.db` inside the project; the dashboard is a local Next.js app at `http://localhost:3777`.

**Three things make it different from regular testing:**
1. **Contracts live with components** — not in a separate `__tests__/` folder. The expectation and the implementation never drift apart.
2. **The agent verifies everything every run** — no need to write a test for each contract; declaring is enough.
3. **Three modes** — `local` (watcher re-runs on save), `dev` (one-shot at build time + real-user violation collection), `prod` (real-traffic observability).

---

## 2. Install in 60 seconds

```bash
npm install --save-dev saync-web
```

Then add a script to `package.json`:

```json
{
  "scripts": {
    "saync": "saync start"
  }
}
```

Boot:

```bash
npm run saync
```

The dashboard is at <http://localhost:3777>. The first run auto-creates `.saync/saync.db` in your project.

---

## 3. Package map

When the developer installs `saync-web`, npm pulls these as transitive deps. They can import from any of the paths below:

| Package | What it exports | Typical import path |
|---|---|---|
| `saync-web` | Dashboard, CLI binary, runtime store | (no JS imports — install only) |
| `saync-web/react` | All React SDK components | `import { SayncButton, SayncProvider } from 'saync-web/react'` |
| `saync-web` (root) | `defineFlow`, types from core | `import { defineFlow } from 'saync-web'` |
| `saync-web/agent` | `runAgent` etc. — advanced CI usage | `import { runAgent } from 'saync-web/agent'` |
| `@saync/react` | Same as `saync-web/react` (direct path) | `import { SayncButton } from '@saync/react'` |
| `@saync/core` | Same as `saync-web` root | `import { defineFlow } from '@saync/core'` |
| `@saync/agent` | Same as `saync-web/agent` | `import { runAgent } from '@saync/agent'` |

**Recommendation for AI assistants:** when generating code, use `saync-web/react` for components and `saync-web` for `defineFlow`. Those are the one-package-install paths.

---

## 4. Mental model

```
┌─────────────────────┐       ┌─────────────────────┐
│   Your dev server   │ ◄───  │  saync start (3777) │
│   localhost:3000    │ poll  │  · Next dashboard   │
│                     │       │  · Watcher          │
│  Components wrapped │       │  · App probe        │
│  with <Saync.*>     │       └──────────┬──────────┘
│  data-saync-name    │                  │ spawns
│                     │                  ▼
└─────────────────────┘       ┌─────────────────────┐
         ▲                    │  Playwright agent   │
         │   drives           │  reads contracts    │
         └────────────────────┤  from window globals│
                              │  POSTs results back │
                              └─────────────────────┘
```

1. The developer wraps a button: `<SayncButton name="add-to-cart" expects={{onClick: {apiCall: {…}}}}>Add</SayncButton>`.
2. At runtime, the SDK registers the contract on `window.__SAYNC_EXPECTATIONS__` and stamps the DOM element with `data-saync-name="add-to-cart"`.
3. The dev runs `saync start`. It boots a local Next.js dashboard on port 3777 and (in `local` mode) starts a file watcher.
4. The agent visits `localhost:3000` via Playwright, reads `window.__SAYNC_EXPECTATIONS__`, drives each registered contract, and POSTs results to the dashboard.
5. The dashboard renders runs, flows, and issues at <http://localhost:3777>.

---

## 5. Configuration

### `saync.config.ts` at the repo root (optional)

```ts
// saync.config.ts
export default {
  appUrl: 'http://localhost:3000',     // where the user's dev server runs
  port: 3777,                          // where Saync's dashboard runs
  watch: ['src/**/*.{ts,tsx,js,jsx}'], // local-mode watch globs
  mode: 'local',                       // 'local' | 'dev' | 'prod'
  dbPath: '.saync/saync.db',           // absolute or relative to repo root
};
```

### Env-var equivalents (env wins over file)

| Env var | Default | Maps to config field |
|---|---|---|
| `SAYNC_MODE` | `local` | `mode` |
| `SAYNC_PORT` | `3777` | `port` |
| `SAYNC_APP_URL` | `http://localhost:3000` | `appUrl` |
| `SAYNC_DB_PATH` | `.saync/saync.db` | `dbPath` |
| `SAYNC_INTERNAL_URL` | `http://localhost:3777` | server-side fetch base (rarely needed) |

### Modes — what each one does

| Mode | Behavior |
|---|---|
| `local` | Default. Boots dashboard. Watches `watch` globs. On every save, re-runs the agent against `appUrl`. |
| `dev` | Dashboard only. Use `saync run` from a build step or CI job. The production reporter (mode="report" in the SDK) is also active for the deployed app. |
| `prod` | Same as dev but with retention tuned for real traffic. The SDK posts violations as users interact. |

---

## 6. SDK — Provider setup

Wrap your app root with `<Saync.Provider>`:

```tsx
import { Saync } from 'saync-web/react';

export default function App() {
  return (
    <Saync.Provider mode="log">
      {/* the rest of your app */}
    </Saync.Provider>
  );
}
```

### `<Saync.Provider>` props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `mode` | `'off' \| 'log' \| 'report'` | `'log'` in dev, `'off'` in prod | `log` = register contracts for the agent; `report` = wrap fetch + POST violations live; `off` = no-op. |
| `backendUrl` | `string` | `'http://localhost:3777'` | Only used in `report` mode — where to POST violations. |
| `children` | `ReactNode` | — | — |

### Named exports

You can also import each component by name:

```tsx
import { SayncProvider, SayncButton, SayncInput, useSaync } from 'saync-web/react';
```

`Saync.X` and `SayncX` are the same component — pick the style you prefer.

---

## 7. SDK — Every component

Every component below extends its native HTML element's props (so `className`, `style`, `aria-*`, `onClick`, `onChange`, `ref`, etc. all work). The Saync-specific additions are:

- `name?: string` — **strongly recommended.** Human-readable contract id; surfaces in the dashboard. Without it, you get a random id and a one-time dev warning.
- `expects?: <Contract>` — the contract for this element. Optional; if omitted, the component still registers itself (so flows can target it via `name`) but no contracts are checked.
- `expect?: <Contract>` — backwards-compat alias for `expects`. Use `expects` in new code.

### Form controls

| Component | Native el | Contract | Example |
|---|---|---|---|
| `SayncButton` | `<button>` | `{ onClick?: ButtonClickExpectation }` | See below |
| `SayncInput` | `<input>` | `InputContract` | See below |
| `SayncTextarea` | `<textarea>` | `InputContract` | Same shape as Input |
| `SayncSelect` | `<select>` | `ChoiceContract` | — |
| `SayncCheckbox` | `<input type=checkbox>` | `ChoiceContract` | — |
| `SayncSwitch` | `<input type=checkbox role=switch>` | `ChoiceContract` | — |
| `SayncRadioGroup` | `<div role=radiogroup>` | `ChoiceContract` | Children are `<SayncRadio>` |
| `SayncRadio` | `<input type=radio>` | (parent group owns the contract) | — |
| `SayncSlider` | `<input type=range>` | `ChoiceContract` | — |
| `SayncFileInput` | `<input type=file>` | `FileContract` | — |
| `SayncDatePicker` | `<input type=date>` | `ChoiceContract` | — |
| `SayncForm` | `<form>` | `FormContract` | Wrap any combination of inputs |

### Navigation

| Component | Native el | Contract |
|---|---|---|
| `SayncLink` | `<a>` | `NavigationContract` |
| `SayncNavLink` | `<a>` (router-aware) | `NavigationContract` |
| `SayncPagination` | `<nav role=navigation>` | `PaginationContract` |
| `SayncBreadcrumb` / `SayncBreadcrumbItem` | `<nav>` / `<a>` | `BreadcrumbContract` |
| `SayncMenu` / `SayncMenuItem` | `<ul>` / `<li>` | `MenuContract` |
| `SayncTabs` / `SayncTab` | `<div role=tablist>` / `<button role=tab>` | `LayoutContract` |

### Display

| Component | Contract |
|---|---|
| `SayncModal` / `SayncDialog` / `SayncDrawer` | `DisclosureContract` |
| `SayncPopover` | `DisclosureContract` |
| `SayncTooltip` | `TooltipContract` |
| `SayncAccordion` / `SayncAccordionItem` | `AccordionContract` |
| `SayncImage` | `ImageContract` |
| `SayncAvatar` | `AvatarContract` |
| `SayncBadge` | `BadgeContract` |
| `SayncToast` / `SayncAlert` | `NoticeContract` |
| `SayncSpinner` / `SayncProgress` / `SayncSkeleton` | `SpinnerContract` / `ProgressContract` / `SkeletonContract` |
| `SayncList` / `SayncTable` / `SayncCard` / `SayncTree` | corresponding `*Contract` |
| `SayncRegion` / `SayncSection` | `LayoutContract` |

### Utility

| Export | What it is |
|---|---|
| `SayncErrorBoundary` | React error boundary that surfaces uncaught errors as Saync issues. Use `<SayncErrorBoundary name="root">{children}</SayncErrorBoundary>` at the app root. |
| `useSaync()` | Hook returning `{ mode, register, unregister, track }`. Use `track(name, data?)` for non-DOM events (sockets, polling, custom state machines). |

---

## 8. Contract types — full reference

### `ApiCallExpectation`

Shared by most contracts (anywhere you say "this action should trigger an API call").

```ts
interface ApiCallExpectation {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string | RegExp;        // string is matched as a pathname prefix or exact path
  expectedStatus?: number;     // e.g. 200, 201
  maxDuration?: number;        // milliseconds; fail if slower
}
```

### `ButtonClickExpectation`

```ts
interface ButtonClickExpectation {
  apiCall?: ApiCallExpectation;
  responseShape?: ResponseShape;
}
type ResponseShape = {
  [key: string]: 'string' | 'number' | 'boolean' | 'object' | 'array' | ResponseShape;
};
```

### `InputContract` (for `<SayncInput>` and `<SayncTextarea>`)

```ts
interface InputContract {
  onChange?: {
    apiCall?: ApiCallExpectation;
    debounce?: number;   // ms — agent verifies the fetch only fires after this much idle time
  };
  onBlur?: {
    apiCall?: ApiCallExpectation;
  };
  validation?: {
    required?: boolean;
    pattern?: string | RegExp;       // regex source
    minLength?: number;
    maxLength?: number;
    message?: string;                // expected error text
  };
}
```

### `FormContract` (for `<SayncForm>`)

```ts
interface FormContract {
  onSubmit?: {
    apiCall?: ApiCallExpectation;
    responseShape?: ResponseShape;
  };
  resetAfterSubmit?: boolean;
  // Child inputs auto-register; the agent fills every input before submitting.
}
```

### `ChoiceContract` (Select / Checkbox / Switch / Radio / Slider)

```ts
interface ChoiceContract {
  onChange?: { apiCall?: ApiCallExpectation };
  validation?: { required?: boolean };
}
```

### `NavigationContract` (Link / NavLink)

```ts
interface NavigationContract {
  to: string;                  // expected destination URL (pathname or full)
  preventDefault?: boolean;    // router-style links: true; plain <a href>: false
}
```

### Other contracts

Each follows the same pattern — see [`@saync/core` types](https://github.com/s-deepak-kumar/saync-ai/blob/main/packages/core/src/types.ts) for full shapes. The dashboard and the agent handle them automatically; you don't need to memorize every variant — just supply what you know.

---

## 9. Concrete component examples

### Button with API contract

```tsx
import { SayncButton } from 'saync-web/react';

export function AddToCartButton({ productId }: { productId: string }) {
  return (
    <SayncButton
      name="add-to-cart"
      expects={{
        onClick: {
          apiCall: {
            method: 'POST',
            url: '/api/cart',
            expectedStatus: 200,
            maxDuration: 500,
          },
          responseShape: { cartCount: 'number' },
        },
      }}
      onClick={() => addToCart(productId)}
    >
      Add to cart
    </SayncButton>
  );
}
```

### Input with validation + debounce

```tsx
import { SayncInput } from 'saync-web/react';

<SayncInput
  name="search"
  type="search"
  placeholder="Search products…"
  expects={{
    onChange: {
      apiCall: { method: 'GET', url: '/api/search' },
      debounce: 300,
    },
    validation: { minLength: 2 },
  }}
/>
```

### Form with child inputs

```tsx
import { SayncForm, SayncInput, SayncButton } from 'saync-web/react';

<SayncForm
  name="login"
  expects={{
    onSubmit: {
      apiCall: { method: 'POST', url: '/api/login', expectedStatus: 200 },
      responseShape: { token: 'string', user: { id: 'string' } },
    },
  }}
  onSubmit={handleLogin}
>
  <SayncInput name="email" type="email" expects={{ validation: { required: true } }} />
  <SayncInput name="password" type="password" expects={{ validation: { required: true, minLength: 8 } }} />
  <SayncButton type="submit" name="submit">Log in</SayncButton>
</SayncForm>
```

### Link with navigation contract

```tsx
import { SayncLink } from 'saync-web/react';

<SayncLink name="go-to-dashboard" href="/dashboard" expects={{ to: '/dashboard' }}>
  Dashboard
</SayncLink>
```

---

## 10. Flows — multi-step journeys

A flow is an ordered sequence of steps the agent drives end-to-end. Declare them in `saync.flows.ts` at your repo root.

```ts
// saync.flows.ts
import { defineFlow } from 'saync-web';

export const flows = [
  defineFlow({
    name: 'checkout',
    description: 'Add a product, fill checkout form, place order, see success.',
    steps: [
      { interact: 'add-to-cart' },
      { interact: 'open-cart' },
      { interact: 'go-to-checkout' },
      { fill: 'email',   with: 'test@example.com' },
      { fill: 'address', with: '1 Main St' },
      { interact: 'place-order' },
      { expect: { url: '/success' } },
    ],
  }),
];
```

### Step shapes — exhaustive list

```ts
type FlowStep =
  | { interact: string }                                // click the element with data-saync-name="..."
  | { fill: string; with: string }                      // fill input/textarea
  | { select: string; value: string }                   // pick a select option
  | { wait: number }                                    // pause N ms
  | { expect: { url?: string; appears?: string; text?: string } };
```

For `expect`:
- `url` — substring (or prefix if it ends in `*`) match against `window.location.href`
- `appears` — CSS selector that must be visible
- `text` — substring that must be present anywhere in the document body

Provide at least one of `url`, `appears`, or `text`.

### How flow steps match components

The `name` you pass to `<SayncButton name="add-to-cart">` becomes the `data-saync-name` attribute on the rendered DOM. Flow steps target that attribute. So `{ interact: 'add-to-cart' }` clicks whatever element has `data-saync-name="add-to-cart"`.

### Failure semantics

The agent halts the flow at the first failing step; subsequent steps are marked `skipped`. Failed steps capture a screenshot, which appears on the flow-detail page in the dashboard.

---

## 11. CLI reference

### `saync start`

Boots the dashboard + (in `local` mode) the file watcher + the app probe. Runs in the foreground; ctrl-c to stop.

### `saync run`

One-shot agent invocation. Useful for CI hooks:

```json
{
  "scripts": {
    "build": "next build && saync run"
  }
}
```

### `saync clear`

Wipes the local DB. Prompts for confirmation.

### Flags / env

The CLI reads `saync.config.ts` and env vars. There are no positional args.

---

## 12. BYOK LLM (optional)

To get AI-generated reports on issues / runs / violations, drop one of these into your project's `.env`:

```env
# IBM watsonX
WATSONX_API_KEY=…
WATSONX_PROJECT_ID=…
WATSONX_MODEL=ibm/granite-3-3-8b-instruct    # optional; this is the default

# or OpenAI
OPENAI_API_KEY=…
OPENAI_MODEL=gpt-4o-mini                     # optional

# or Anthropic
ANTHROPIC_API_KEY=…
ANTHROPIC_MODEL=claude-sonnet-4-6            # optional
```

Saync reads these at boot. The dashboard's `/settings` page surfaces which provider is configured. The "Generate report" buttons hit `POST /api/llm/generate` — if no provider is set, the endpoint returns 503 with a message explaining what to do.

**Privacy:** Saync only sends prompt context (issue messages, stack traces, expected/observed) to the provider you chose. Nothing else leaves your machine.

---

## 13. HTTP API (advanced)

The Saync server exposes a small REST API. The agent uses it; the dashboard reads from it; you can too.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| `GET`  | `/api/system` | — | `{ mode, appConnected, appUrl, dbPath, checkedAt }` |
| `GET`  | `/api/stats` | — | `{ openIssues, totalContracts, passRate, lastRunDuration }` |
| `GET`  | `/api/runs?limit=50` | — | `Run[]` (newest first) |
| `POST` | `/api/runs` | `{ environment, viewport?, gitBranch?, gitCommit?, totalContracts }` | `{ runId }` |
| `GET`  | `/api/runs/:id` | — | `Run & { results, flows }` |
| `POST` | `/api/runs/:id/results` | result body | `{ resultId, issueId? }` |
| `POST` | `/api/runs/:id/complete` | `{ status: 'completed' \| 'failed' }` | `{ success }` |
| `GET`  | `/api/runs/:id/stream` | — | SSE stream of `result` / `progress` / `complete` events |
| `POST` | `/api/runs/:id/flows` | flow body | `{ flowId }` |
| `GET`  | `/api/runs/:id/flows` | — | `FlowWithSteps[]` |
| `GET`  | `/api/flows` | — | `FlowSummary[]` (one row per unique flow name) |
| `GET`  | `/api/flows/:id` | — | `FlowWithSteps` |
| `GET`  | `/api/issues?status=open&severity=critical` | — | `Issue[]` |
| `GET`  | `/api/issues/:idOrSlug` | — | `IssueDetail` |
| `POST` | `/api/violations` | `Violation \| Violation[]` | `{ inserted }` |
| `GET`  | `/api/violations?since=&contract=` | — | `Violation[]` |
| `GET`  | `/api/llm/status` | — | `{ configured, provider, model }` |
| `POST` | `/api/llm/generate` | `{ kind, payload }` | report (or 503 if no LLM) |
| `POST` | `/api/clear` | — | `{ ok: true }` |

All endpoints are unauthenticated — Saync is single-tenant local, so there's no key or session concept.

---

## 14. Recipes

### Recipe — verifying a debounced search

```tsx
<SayncInput
  name="search"
  expects={{
    onChange: {
      apiCall: { method: 'GET', url: '/api/search' },
      debounce: 300,                  // agent verifies the fetch fires ONCE, after 300ms of idle
    },
  }}
/>
```

### Recipe — verifying optimistic UI

When a button optimistically updates UI before the API responds, declare both:

```tsx
<SayncButton
  name="like-post"
  expects={{
    onClick: {
      apiCall: { method: 'POST', url: '/api/posts/:id/like', expectedStatus: 200 },
      responseShape: { likes: 'number', liked: 'boolean' },
    },
  }}
>
  Like
</SayncButton>
```

### Recipe — login flow

```ts
// saync.flows.ts
import { defineFlow } from 'saync-web';

export const flows = [
  defineFlow({
    name: 'login',
    steps: [
      { interact: 'login-cta' },
      { expect: { url: '/login' } },
      { fill: 'email',    with: 'demo@example.com' },
      { fill: 'password', with: 'password123' },
      { interact: 'submit' },
      { expect: { url: '/dashboard' } },
      { expect: { text: 'Welcome' } },
    ],
  }),
];
```

### Recipe — CI smoke test

```yaml
# .github/workflows/saync.yml
- run: npm ci
- run: npm run build
- run: npx saync start &        # boot the dashboard
- run: sleep 5                  # give it a moment
- run: npm start &              # boot the app under test
- run: sleep 5
- run: npx saync run            # one-shot agent
```

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `App offline` dot in sidebar | `appUrl` doesn't have anything listening | Start your dev server first, then `saync start` |
| `[Saync] <SayncButton> rendered without a name prop` | Missing `name` prop | Add a stable name; issue titles will be readable |
| Playwright errors `browserType.launch: Executable doesn't exist` | Chromium not installed | `npx playwright install chromium` |
| Migrations failed on first boot | DB path not writable | Set `SAYNC_DB_PATH` or `dbPath` in `saync.config.ts` to a writable location |
| Dashboard shows old data | Cache from a different DB | `saync clear` (or delete `.saync/saync.db`) |
| Port 3777 in use | Another tool on the same port | Set `SAYNC_PORT` to anything else |
| Subpath import `saync-web/react` not found in tests | Vitest/Jest sometimes need explicit ESM resolution | Add `"saync-web/react"` to your bundler's `transformIgnorePatterns` / equivalent |

---

## 16. The minimum viable Saync setup

If an AI assistant needs to add Saync to a project from scratch, this is the shortest valid set of changes:

1. `npm install --save-dev saync-web`
2. `package.json` — add `"saync": "saync start"` to scripts.
3. Wrap your app root:
   ```tsx
   import { Saync } from 'saync-web/react';
   <Saync.Provider mode="log">{children}</Saync.Provider>
   ```
4. On any interactive component, replace the native tag with the Saync version and add `name`:
   ```tsx
   import { SayncButton } from 'saync-web/react';
   <SayncButton name="add-to-cart" onClick={…}>Add to cart</SayncButton>
   ```
5. (Optional) Add `saync.flows.ts` for multi-step journeys.
6. `npm run saync` — open <http://localhost:3777>.

That's it. Nothing else is required.

---

## 17. Glossary

- **Contract** — a structured promise about how a component should behave (which API it should call, how fast, what shape the response should have).
- **Flow** — an ordered sequence of steps representing a user journey.
- **Run** — a single agent execution; includes all contract verifications + all flows.
- **Issue** — a deduplicated cluster of contract failures (same contract + same error message).
- **Occurrence** — a single instance of an issue, linked to the run/result that produced it.
- **Violation** — a production-mode (real-user) contract failure, posted by the SDK.

---

*MIT licensed. Source: <https://github.com/s-deepak-kumar/saync-ai>. Made with Bob.*
