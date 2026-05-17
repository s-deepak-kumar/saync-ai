# @saync/react

React SDK for [Saync](https://github.com/s-deepak-kumar/saync-ai). Wrap your interactive elements and declare what they should do — the agent verifies, the dashboard reports.

Most users install [`saync-web`](https://www.npmjs.com/package/saync-web) and import the components via `saync-web/react`. This package is the source of truth and a valid direct dependency too.

```tsx
import { SayncButton } from '@saync/react';

export function AddToCartButton({ onClick }) {
  return (
    <SayncButton
      onClick={onClick}
      expect={{
        onClick: {
          apiCall: {
            method: 'POST',
            url: '/api/cart',
            expectedStatus: 200,
            maxDuration: 500,
          },
        },
      }}
    >
      Add to cart
    </SayncButton>
  );
}
```

Ships 30+ wrapped primitives (Button, Input, Form, Image, Link, Select, Checkbox, RadioGroup, Slider, …). See the [docs](https://github.com/s-deepak-kumar/saync-ai#readme) for the full list.

MIT licensed.
