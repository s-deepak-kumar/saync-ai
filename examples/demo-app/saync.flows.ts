/**
 * Multi-step user-journey flows for the Saync Shop demo.
 *
 * The agent picks this up automatically when run from the demo-app
 * directory. Each flow is driven end-to-end via Playwright; failures
 * halt the flow and mark subsequent steps as `skipped`.
 *
 * Step `name`s here are the same `name` props on the SDK components
 * in `src/App.tsx` — e.g. `name="add-1"` on the Add-to-Cart button
 * for product 1.
 */
import { defineFlow } from '@saync/core';

export const flows = [
  /**
   * Happy path: open the catalog, add a product to cart, open the
   * drawer. Should pass cleanly — the cart-count badge updates and
   * the drawer renders.
   */
  defineFlow({
    name: 'add-to-cart',
    description: 'Add a product to the cart and verify the drawer opens.',
    steps: [
      { interact: 'add-1' },
      { interact: 'open-cart' },
      { expect: { text: 'Your cart' } },
    ],
  }),

  /**
   * Full checkout journey. Expected to FAIL at "place-order" — the
   * demo's planted bug returns 500 from /api/orders, so the success
   * page never appears. A real-bug demonstration.
   */
  defineFlow({
    name: 'checkout',
    description: 'Add → cart → checkout form → place order → success.',
    steps: [
      { interact: 'add-1' },
      { interact: 'open-cart' },
      { interact: 'go-to-checkout' },
      { fill: 'email', with: 'agent+test@saync.dev' },
      { select: 'shipping-method', value: 'standard' },
      { interact: 'place-order' },
      // This is the assertion that catches the planted bug — success
      // region never renders because /api/orders returned 500.
      { expect: { appears: '[data-saync-name="success-region"]' } },
    ],
  }),
];
