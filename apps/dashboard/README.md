# saync-web

Local-first QA platform. Declare contracts on your UI components, run an agent that drives them, see the failures in a Sentry-style dashboard — all from inside your repo. No SaaS, no signup, no telemetry.

## Install

```bash
npm install --save-dev saync-web
```

## Add a script

```json
{
  "scripts": {
    "saync": "saync start"
  }
}
```

## Start it

```bash
npm run saync
```

Open <http://localhost:3777>. The Saync server reads from `.saync/saync.db` in your project root — your data, your machine.

## Modes

- `SAYNC_MODE=local` (default) — the watcher re-runs your contracts + flows on every save
- `SAYNC_MODE=dev` — one-shot run at build time, plus production-style violation reports
- `SAYNC_MODE=prod` — production reporter, slower polling, retention tuned for real traffic

## Configure

`saync.config.ts` at your repo root (optional):

```ts
export default {
  appUrl: 'http://localhost:3000',
  port: 3777,
  watch: ['src/**/*.{ts,tsx}'],
};
```

## Bring your own LLM

Saync never ships an LLM key. Set one of these in `.env` to enable AI-generated reports:

```
WATSONX_API_KEY=…
WATSONX_PROJECT_ID=…
# or
OPENAI_API_KEY=…
# or
ANTHROPIC_API_KEY=…
```

## Subcommands

```
saync start    Boot the dashboard + watcher
saync run      One-shot agent run
saync clear    Wipe local data
```

## License

MIT
