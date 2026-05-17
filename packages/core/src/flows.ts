/**
 * Multi-step user-journey flows.
 *
 * A "flow" is an ordered sequence of interactions that the agent drives
 * end-to-end, so Saync can verify "login → dashboard → settings → save"
 * as a single coherent journey rather than 4 disconnected contract
 * checks.
 *
 * Flows live in a `saync.flows.ts` file at the consumer's repo root
 * (or wherever `--flows` points). The agent discovers it at runtime
 * via jiti (so users write TypeScript without compiling first).
 */

/**
 * A single step within a flow. Each variant carries exactly the
 * information the agent needs to drive it.
 *
 * Step matching: the `name` fields here are matched against the
 * `data-saync-name` attribute the SDK emits on every wrapped element.
 * That's a stable, developer-chosen identifier — unlike the random
 * `data-saync-id`, which changes between renders.
 */
export type FlowStep =
  /** Click the element with this data-saync-name. */
  | { interact: string }
  /** Find the input/textarea and fill it with the given value. */
  | { fill: string; with: string }
  /** Find the select and choose the given option value. */
  | { select: string; value: string }
  /** Assert page state after preceding steps. At least one of url /
   *  appears / text must be present. */
  | {
      expect: {
        /** Substring match against the current page URL.
         *  Trailing "*" treats it as a prefix match: "/dashboard*". */
        url?: string;
        /** CSS selector that must be visible. */
        appears?: string;
        /** Substring that must be present anywhere in the document body. */
        text?: string;
      };
    }
  /** Pause for N milliseconds. Useful for animations / debounce windows
   *  the flow needs to wait through. */
  | { wait: number };

export interface FlowDefinition {
  /** Human-readable id ("checkout", "login", "onboarding"). Shows up
   *  on the dashboard as the flow's title. */
  name: string;
  /** Optional one-line description rendered next to the name. */
  description?: string;
  /** Ordered list of steps. The agent halts the flow on the first
   *  failing step; subsequent steps are marked `skipped`. */
  steps: FlowStep[];
}

/**
 * Identity helper for type inference. Wrap each flow with this in your
 * `saync.flows.ts`:
 *
 * ```ts
 * import { defineFlow } from '@saync/core';
 *
 * export const flows = [
 *   defineFlow({
 *     name: 'checkout',
 *     steps: [
 *       { interact: 'add-to-cart' },
 *       { interact: 'go-to-checkout' },
 *       { fill: 'email', with: 'a@b.co' },
 *       { interact: 'place-order' },
 *       { expect: { url: '/success' } },
 *     ],
 *   }),
 * ];
 * ```
 */
export function defineFlow(def: FlowDefinition): FlowDefinition {
  return def;
}

/* ──────────────────────────────────────────────────────────── */
/*  Result shapes — produced by the agent, consumed by backend  */
/* ──────────────────────────────────────────────────────────── */

export type FlowStepStatus = 'passed' | 'failed' | 'skipped';
export type FlowStatus = 'passed' | 'failed';

export type FlowStepKind = 'interact' | 'fill' | 'select' | 'expect' | 'wait';

export interface FlowStepResult {
  /** 0-based index of the step within the flow's `steps` array. */
  stepIndex: number;
  /** Which variant of FlowStep this was (so the dashboard can render
   *  the right icon/label). */
  kind: FlowStepKind;
  status: FlowStepStatus;
  /** Set on failed steps — what went wrong in plain English. */
  errorMessage?: string;
  /** Optional base64-encoded screenshot of the page when the step failed. */
  screenshot?: string;
}

export interface FlowResult {
  /** Matches FlowDefinition.name. */
  name: string;
  status: FlowStatus;
  /** Total wall-clock duration of the whole flow, in ms. */
  durationMs: number;
  steps: FlowStepResult[];
}
