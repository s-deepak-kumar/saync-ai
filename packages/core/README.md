# @saync/core

Framework-agnostic core for [Saync](https://github.com/s-deepak-kumar/saync-ai) — contract types, the expectation registry, and the `defineFlow` helper.

Most users install [`saync-web`](https://www.npmjs.com/package/saync-web) and get this as a transitive dependency; you'll only depend on it directly if you're writing a non-React SDK integration.

```ts
import { defineFlow } from '@saync/core';

export default [
  defineFlow({
    name: 'checkout',
    steps: [
      { kind: 'interact', target: 'add-to-cart' },
      { kind: 'expect',   target: 'cart-count', text: '1' },
    ],
  }),
];
```

MIT licensed.
