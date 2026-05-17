# @saync/agent

Playwright-based verification agent for [Saync](https://github.com/s-deepak-kumar/saync-ai). Drives every contract + flow declared by the SDK and POSTs results to the local Saync server.

Most users don't install this directly — `saync start` and `saync run` (from [`saync-web`](https://www.npmjs.com/package/saync-web)) call it on your behalf. Pull it in directly if you want to wire the agent into a custom CI step.

```bash
npx saync-agent http://localhost:3000
```

MIT licensed.
