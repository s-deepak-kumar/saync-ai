# saync-web

**Verify what your app should do.** Declare contracts on your UI components, run a Playwright-driven agent that drives them, see failures in a Sentry-style dashboard — all from inside your repo. No SaaS, no signup, no telemetry, MIT licensed.

```bash
npm install --save-dev saync-web
```

```json
{
  "scripts": {
    "saync": "saync start"
  }
}
```

```bash
npm run saync
```

Open <http://localhost:3777>. Your data lives at `.saync/saync.db` inside your project.

---

## Building with an AI assistant?

Saync ships a **single Markdown context file** designed to be dropped into Claude / ChatGPT / Cursor / any LLM. It teaches the model every component, every contract shape, every flow step, and every CLI command in one paste.

Get it inside the dashboard at <http://localhost:3777/saync-llm.md> (after `saync start`) or directly from the source: [`apps/dashboard/public/saync-llm.md`](https://github.com/s-deepak-kumar/saync-ai/blob/main/apps/dashboard/public/saync-llm.md).

---

## 30-second example

```tsx
import { Saync, SayncButton, SayncInput, SayncForm } from 'saync-web/react';

export default function App() {
  return (
    <Saync.Provider mode="log">
      <SayncForm
        name="login"
        expects={{
          onSubmit: {
            apiCall: { method: 'POST', url: '/api/login', expectedStatus: 200 },
            responseShape: { token: 'string' },
          },
        }}
      >
        <SayncInput name="email"    type="email"    expects={{ validation: { required: true } }} />
        <SayncInput name="password" type="password" expects={{ validation: { required: true, minLength: 8 } }} />
        <SayncButton name="submit" type="submit">Log in</SayncButton>
      </SayncForm>
    </Saync.Provider>
  );
}
```

That's the whole API surface for a contract: each component carries its expectations as a prop. The agent picks them up at runtime and verifies every one.

---

## Multi-step flows

Drop a `saync.flows.ts` at your repo root to test user journeys end-to-end:

```ts
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

Each step targets components by their `name` prop (rendered as `data-saync-name`). The agent halts on the first failure and screenshots the page.

---

## Modes

| Mode | When | Behavior |
|---|---|---|
| `local` (default) | development | File watcher re-runs the agent on every save |
| `dev` | staging deploys | One-shot agent run at build time + production reporter live |
| `prod` | production | Production reporter only; retention tuned for real traffic |

Set via `SAYNC_MODE` env var or `mode: 'dev'` in `saync.config.ts`.

---

## Configuration (optional)

`saync.config.ts` at your repo root:

```ts
export default {
  appUrl: 'http://localhost:3000',     // where your dev server runs
  port: 3777,                          // where Saync's dashboard runs
  watch: ['src/**/*.{ts,tsx}'],        // local-mode watch globs
  mode: 'local',
  dbPath: '.saync/saync.db',
};
```

Equivalent env vars: `SAYNC_MODE`, `SAYNC_PORT`, `SAYNC_APP_URL`, `SAYNC_DB_PATH`. Env wins over config file.

---

## Bring your own LLM (optional)

To get AI-generated reports on issues and runs, set one of these in your project's `.env`:

```
WATSONX_API_KEY=…
WATSONX_PROJECT_ID=…
# or
OPENAI_API_KEY=…
# or
ANTHROPIC_API_KEY=…
```

Saync reads them at boot. None set? The "Generate report" button shows a quiet "configure an LLM" hint. Your key never leaves your machine except for the API call itself.

---

## CLI

```
saync start    Boot the dashboard + watcher + app probe
saync run      One-shot agent run (use from CI / build hooks)
saync clear    Wipe local data
```

---

## What's in the package

- `saync-web/react` — the React SDK (38 wrapped components: Button, Input, Form, Image, Link, Select, Checkbox, Slider, …)
- `saync-web` (root) — `defineFlow` and shared types
- `saync-web/agent` — direct access to the Playwright runner for advanced CI usage
- `bin/saync` — the CLI binary

Each subpath also has a direct equivalent: `@saync/react`, `@saync/core`, `@saync/agent`. Use either set.

---

## Links

- Docs site & landing — coming soon
- Source — <https://github.com/s-deepak-kumar/saync-ai>
- Issues — <https://github.com/s-deepak-kumar/saync-ai/issues>

---

MIT licensed. Made with Bob.
