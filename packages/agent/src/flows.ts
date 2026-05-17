/**
 * Flow discovery + execution.
 *
 * The user writes their flows as TypeScript in `saync.flows.ts` at the
 * repo root (or at `--flows <path>`). The agent runs as compiled JS in
 * Node — it can't `import` a `.ts` file natively, so we use jiti as a
 * sub-100ms runtime TS loader. No build step for the user.
 *
 * Once loaded, each flow is driven step-by-step by `runFlow()`. Steps
 * map onto Playwright actions; failures halt the flow and mark
 * remaining steps as `skipped`.
 */

import { resolve, isAbsolute } from 'node:path';
import { existsSync } from 'node:fs';
import { createJiti } from 'jiti';
import type { Page, Locator } from 'playwright';
import type {
  FlowDefinition,
  FlowStep,
  FlowResult,
  FlowStepResult,
  FlowStepStatus,
  FlowStepKind,
} from '@saync/core';

const DEFAULT_FLOWS_FILE = 'saync.flows.ts';
const STEP_TIMEOUT_MS = 10_000;

/**
 * Discover and load the user's flows. Looks for `saync.flows.ts` (or a
 * caller-provided path) relative to the current working directory.
 * Returns `null` if no file exists — flows are opt-in.
 */
export async function loadFlows(opts: {
  cwd?: string;
  path?: string;
} = {}): Promise<FlowDefinition[] | null> {
  const cwd = opts.cwd ?? process.cwd();
  const relPath = opts.path ?? process.env.SAYNC_FLOWS_FILE ?? DEFAULT_FLOWS_FILE;
  const absPath = isAbsolute(relPath) ? relPath : resolve(cwd, relPath);

  if (!existsSync(absPath)) return null;

  // Crucial: resolve modules from the USER's project, not the agent's.
  // jiti's first arg is the base for module resolution; pointing it at
  // the user's package root lets imports like `@saync/core` find the
  // user's installed copy via their own `node_modules`.
  const userProjectRoot = `${cwd}/`;
  const jiti = createJiti(userProjectRoot, {
    interopDefault: true,
    moduleCache: false, // re-read on every agent invocation
  });

  let mod: { flows?: FlowDefinition[]; default?: FlowDefinition[] };
  try {
    mod = (await jiti.import(absPath)) as typeof mod;
  } catch (err) {
    throw new Error(
      `Failed to load flows from ${absPath}: ${err instanceof Error ? err.message : err}`,
    );
  }

  // Accept either `export const flows = [...]` (preferred) or
  // `export default [...]`. Reject anything else with a clear error.
  const found = mod.flows ?? mod.default;
  if (!found) {
    throw new Error(
      `${absPath} must export either \`flows\` or a default array of FlowDefinition[]`,
    );
  }
  if (!Array.isArray(found)) {
    throw new Error(`${absPath}: exported flows must be an array`);
  }
  return found;
}

/**
 * Drive one flow against the page. Resets browser state (cookies,
 * localStorage) before starting so subsequent flows don't bleed into
 * each other.
 */
export async function runFlow(
  page: Page,
  flow: FlowDefinition,
  startUrl: string,
): Promise<FlowResult> {
  const startedAt = Date.now();
  const stepResults: FlowStepResult[] = [];

  // Fresh slate between flows. clearCookies wipes the context; localStorage
  // / sessionStorage clear on the next navigation.
  await page.context().clearCookies().catch(() => {});
  await page.evaluate(() => {
    try { localStorage.clear(); } catch { /* origin-blocked */ }
    try { sessionStorage.clear(); } catch { /* origin-blocked */ }
  }).catch(() => {});
  await page.goto(startUrl, { waitUntil: 'networkidle', timeout: STEP_TIMEOUT_MS });

  let halted = false;
  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];
    const kind = kindOf(step);

    if (halted) {
      stepResults.push({ stepIndex: i, kind, status: 'skipped' });
      continue;
    }

    const result = await driveStep(page, step, i, kind);
    stepResults.push(result);
    if (result.status === 'failed') halted = true;
  }

  const status = halted ? 'failed' : 'passed';
  return {
    name: flow.name,
    status,
    durationMs: Date.now() - startedAt,
    steps: stepResults,
  };
}

/* ──────────────────────────────────────────────────────────── */

function kindOf(step: FlowStep): FlowStepKind {
  if ('interact' in step) return 'interact';
  if ('fill' in step) return 'fill';
  if ('select' in step) return 'select';
  if ('expect' in step) return 'expect';
  return 'wait';
}

async function driveStep(
  page: Page,
  step: FlowStep,
  index: number,
  kind: FlowStepKind,
): Promise<FlowStepResult> {
  try {
    if ('interact' in step) {
      const el = await findByName(page, step.interact);
      await el.click({ timeout: STEP_TIMEOUT_MS });
      await page.waitForTimeout(200); // let any state settle
      return passed(index, kind);
    }

    if ('fill' in step) {
      const el = await findByName(page, step.fill);
      await el.fill(step.with, { timeout: STEP_TIMEOUT_MS });
      return passed(index, kind);
    }

    if ('select' in step) {
      const el = await findByName(page, step.select);
      await el.selectOption(step.value, { timeout: STEP_TIMEOUT_MS });
      return passed(index, kind);
    }

    if ('wait' in step) {
      await page.waitForTimeout(step.wait);
      return passed(index, kind);
    }

    // expect:
    const { url, appears, text } = step.expect;
    if (url !== undefined) {
      const current = page.url();
      const matched = url.endsWith('*')
        ? current.includes(url.slice(0, -1))
        : current.includes(url);
      if (!matched) {
        return failed(index, kind, `Expected URL to include "${url}", got "${current}"`, page);
      }
    }
    if (appears) {
      const target = page.locator(appears).first();
      const visible = await target.isVisible({ timeout: STEP_TIMEOUT_MS }).catch(() => false);
      if (!visible) {
        return failed(index, kind, `Expected element to be visible: ${appears}`, page);
      }
    }
    if (text) {
      const body = await page.locator('body').innerText().catch(() => '');
      if (!body.includes(text)) {
        return failed(index, kind, `Expected page text to include "${text}"`, page);
      }
    }
    return passed(index, kind);
  } catch (err) {
    return failed(
      index,
      kind,
      err instanceof Error ? err.message : String(err),
      page,
    );
  }
}

/**
 * Locate an element by its `data-saync-name`. Returns the first match.
 * If nothing matches, throws — the caller catches and turns it into a
 * failed step.
 */
async function findByName(page: Page, name: string): Promise<Locator> {
  const loc = page.locator(`[data-saync-name="${cssEscape(name)}"]`).first();
  const count = await loc.count();
  if (count === 0) {
    throw new Error(`No element found with data-saync-name="${name}"`);
  }
  return loc;
}

/** Minimal CSS attribute-value escaper — covers what flow names need. */
function cssEscape(s: string): string {
  return s.replace(/["\\]/g, '\\$&');
}

function passed(stepIndex: number, kind: FlowStepKind): FlowStepResult {
  return { stepIndex, kind, status: 'passed' };
}

async function failed(
  stepIndex: number,
  kind: FlowStepKind,
  errorMessage: string,
  page: Page,
): Promise<FlowStepResult> {
  let screenshot: string | undefined;
  try {
    const buf = await page.screenshot({ type: 'png' });
    screenshot = buf.toString('base64');
  } catch { /* page might be closed; skip screenshot */ }
  return { stepIndex, kind, status: 'failed' as FlowStepStatus, errorMessage, screenshot };
}
