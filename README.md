# Saync

**Declare what your app should do. Verify it automatically.**

Saync is a developer tool that lets you declare behavioral expectations inline with your React components, then automatically verifies them using a Playwright-based agent. No more writing separate test files—your expectations live with your code.

## The Problem

When you build an app, you know what each button, form, and API call should do. But that knowledge lives only in your head or scattered across test files. Current solutions fall short:

- **Manual testing** — slow, doesn't scale, misses edge cases
- **Hand-written tests** — time-consuming, brittle, often skipped
- **Production monitoring** — only catches crashes, misses silent bugs
- **AI testing agents** — guess what your app should do (and guess wrong)

## The Solution

Saync lets you **declare expectations at the point of implementation** and **automatically verifies them** in both development and production.

```tsx
<SayncButton
  expect={{
    onClick: {
      apiCall: {
        method: 'POST',
        url: '/api/cart',
        expectedStatus: 200,
        maxDuration: 500
      },
      responseShape: {
        cartCount: 'number',
        success: 'boolean'
      }
    }
  }}
  onClick={handleAddToCart}
>
  Add to Cart
</SayncButton>
```

Run the agent:
```bash
pnpm saync-agent http://localhost:3000
```

Get instant verification:
```
✓ PASSED [button-1234] (245ms)
✗ FAILED [button-5678] (523ms)
  Error: API status mismatch
  Expected: 200
  Actual:   500
```

## Features

- **Inline expectations** — Declare what your code should do right where you write it
- **Automatic verification** — Playwright agent reads and verifies expectations from your running app
- **Beautiful reports** — Structured JSON + colorful terminal output with exact failure details
- **Production monitoring** — Same SDK works in production to catch real-world violations
- **Framework-agnostic core** — React wrapper provided, but core works anywhere

## Quick Start

### 1. Install

```bash
pnpm add @saync/react
pnpm add -D @saync/agent
```

### 2. Wrap your components

```tsx
import { SayncButton } from '@saync/react';

function MyComponent() {
  return (
    <SayncButton
      expect={{
        onClick: {
          apiCall: {
            method: 'POST',
            url: '/api/action',
            expectedStatus: 200,
            maxDuration: 500
          }
        }
      }}
      onClick={handleClick}
    >
      Click Me
    </SayncButton>
  );
}
```

### 3. Run the agent

```bash
# Start your dev server
pnpm dev

# In another terminal, run Saync
pnpm saync-agent http://localhost:3000
```

## Project Structure

This is a monorepo with the following packages:

```
saync-ai/
├── packages/
│   ├── core/          # Framework-agnostic expectation registry
│   ├── react/         # React wrapper components
│   └── agent/         # Playwright verification agent
└── examples/
    └── demo-app/      # Demo React app
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run demo app
cd examples/demo-app
pnpm dev

# Run agent against demo app
pnpm test:saync
```

## Configuration

Set the `SAYNC_MODE` environment variable:

- `off` — SDK is no-op, tree-shaken out by bundler
- `log` — Violations logged to console only (default in dev)
- `report` — Violations sent to webhook (for production monitoring)

```bash
# Development
SAYNC_MODE=log pnpm dev

# Production
SAYNC_MODE=report pnpm start
```

## API Reference

### `<SayncButton>`

React wrapper component for button expectations.

**Props:**
- `expect.onClick.apiCall` — Expected API call specification
  - `method` — HTTP method (GET, POST, etc.)
  - `url` — URL or RegExp pattern
  - `expectedStatus` — Expected HTTP status code
  - `maxDuration` — Max duration in milliseconds
- `expect.onClick.responseShape` — Expected response shape validation
- `sourceFile` — Source file path (for better error reporting)
- `sourceLine` — Source line number

### Agent CLI

```bash
saync-agent [options] <url>

Options:
  -u, --url <url>           URL of the application to test (required)
  --headless <true|false>   Run browser in headless mode (default: true)
  -t, --timeout <ms>        Timeout in milliseconds (default: 30000)
  -o, --output <file>       Output file for report (default: saync-failures.json)
  --screenshot <true|false> Take screenshots on failure (default: true)
```

## Roadmap

**v0.1 (Current)** — Proof of concept
- ✅ Button clicks + API calls
- ✅ Basic response validation
- ✅ React wrapper component
- ✅ Playwright agent
- ✅ Terminal + JSON reporting

**v0.2** — Enhanced validation
- Form submissions
- Redirect expectations
- Advanced response shape validation (nested objects, arrays)
- DOM state assertions

**v0.3** — Production features
- Webhook reporting
- Sampling for production monitoring
- Source map integration for better error reporting
- Browser overlay for dev mode

**v0.4** — Framework expansion
- Vue wrapper
- Svelte wrapper
- Vanilla JS examples

## Why "Saync"?

**Say** what your code should do + **Sync** expectations with reality = **Saync**

Also: **S**ynchronize **A**pplication **Y**ield with **N**amed **C**ontracts

(Okay, we just thought it sounded cool.)

## License

MIT

## Contributing

This is a v0.1 prototype. Feedback, issues, and PRs welcome!

---

Built with ❤️ by developers who are tired of writing tests that drift out of sync with code.