/**
 * Production-mode reporter for <Saync.Provider mode="report">.
 *
 * What it does:
 *   1. Wraps window.fetch — records every call's method/url/status/duration
 *      into a small in-memory ring buffer.
 *   2. Listens to document-level click + submit + change. On each event,
 *      finds the nearest [data-saync-id] ancestor, looks up its registered
 *      expectation, and (after a 500ms grace window for any caused fetch
 *      to complete) checks the expectation's apiCall contract against
 *      the recent fetches.
 *   3. Violations get pushed into a queue. Every 5 seconds the queue is
 *      POSTed to the local Saync server at /api/violations. Single-tenant
 *      local install — no auth header.
 *   4. On page hide (visibilitychange / pagehide), flushes whatever's
 *      left via fetch(..., { keepalive: true }) so the request survives
 *      the unload.
 *
 * What it does NOT do:
 *   - User tracking. The sessionId is a random UUID per page load; nothing
 *     gets correlated to user identity by the SDK.
 *   - Network call interception (only observation). Original fetch behavior
 *     is preserved — we just record what happened around it.
 *   - Static contract verification. Things like Input.validation.pattern
 *     are agent-time concerns; in prod we can only observe the runtime
 *     fetch traffic users actually cause.
 */

import type {
  ApiCallExpectation,
  Expectation,
  ButtonExpectation,
  FormExpectation,
  InputExpectation,
  SelectExpectation,
  CheckboxExpectation,
  RadioGroupExpectation,
  SliderExpectation,
  FileInputExpectation,
  DatePickerExpectation,
  PaginationExpectation,
} from '@saync/core';

interface FetchRecord {
  method: string;
  pathname: string;
  status: number;
  durationMs: number;
  timestamp: number;
}

interface PendingViolation {
  contractName: string;
  componentName: string;
  errorMessage: string;
  expectedValue?: string;
  observedValue?: string;
  sessionId: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  url: string;
  timestamp: string;
}

interface ReporterConfig {
  backendUrl: string;
}

const RING_SIZE = 200;
const GRACE_MS = 500;
const FLUSH_INTERVAL_MS = 5_000;

// All reporter state lives in module scope. There's at most one
// <Saync.Provider mode="report"> per page (the Provider warns on
// duplicates), so module-level singletons are correct.
let started = false;
let cfg: ReporterConfig | null = null;
let sessionId = '';
let originalFetch: typeof fetch | null = null;
let recentFetches: FetchRecord[] = [];
let pendingViolations: PendingViolation[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let clickListener: ((e: Event) => void) | null = null;
let submitListener: ((e: Event) => void) | null = null;
let changeListener: ((e: Event) => void) | null = null;
let visibilityListener: ((e: Event) => void) | null = null;

export function startReporter(config: ReporterConfig): void {
  if (started) return;
  if (typeof window === 'undefined') return;
  started = true;
  cfg = config;
  sessionId = makeSessionId();

  wrapFetch();
  installDomListeners();
  installLifecycleListeners();
  flushTimer = setInterval(flushQueue, FLUSH_INTERVAL_MS);
}

export function stopReporter(): void {
  if (!started) return;
  if (originalFetch) window.fetch = originalFetch;
  originalFetch = null;
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
  if (clickListener) document.removeEventListener('click', clickListener, true);
  if (submitListener) document.removeEventListener('submit', submitListener, true);
  if (changeListener) document.removeEventListener('change', changeListener, true);
  if (visibilityListener) document.removeEventListener('visibilitychange', visibilityListener);
  clickListener = submitListener = changeListener = visibilityListener = null;
  recentFetches = [];
  pendingViolations = [];
  started = false;
  cfg = null;
}

/* ──────────────────────────────────────────────────────────── */

function wrapFetch(): void {
  originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const rawUrl =
      typeof input === 'string' ? input
      : input instanceof URL ? input.toString()
      : input.url;
    const method = (init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET') ?? 'GET').toUpperCase();
    try {
      const response = await originalFetch!(input, init);
      recordFetch({
        method,
        pathname: toPath(rawUrl),
        status: response.status,
        durationMs: Math.round(performance.now() - start),
        timestamp: Date.now(),
      });
      return response;
    } catch (err) {
      recordFetch({
        method,
        pathname: toPath(rawUrl),
        status: 0,
        durationMs: Math.round(performance.now() - start),
        timestamp: Date.now(),
      });
      throw err;
    }
  };
}

function recordFetch(r: FetchRecord): void {
  recentFetches.push(r);
  if (recentFetches.length > RING_SIZE) recentFetches.shift();
}

function toPath(rawUrl: string): string {
  try {
    return new URL(rawUrl, window.location.origin).pathname;
  } catch {
    return rawUrl;
  }
}

/* ──────────────────────────────────────────────────────────── */

function installDomListeners(): void {
  // Capture phase so we see the event before app code stops propagation.
  clickListener = (e: Event) => onInteraction(e, 'click');
  submitListener = (e: Event) => onInteraction(e, 'submit');
  changeListener = (e: Event) => onInteraction(e, 'change');
  document.addEventListener('click', clickListener, true);
  document.addEventListener('submit', submitListener, true);
  document.addEventListener('change', changeListener, true);
}

function onInteraction(e: Event, kind: 'click' | 'submit' | 'change'): void {
  const target = e.target;
  if (!(target instanceof Element)) return;
  const sayncEl = target.closest('[data-saync-id]');
  if (!sayncEl) return;
  const id = sayncEl.getAttribute('data-saync-id');
  if (!id) return;
  const registry = window.__SAYNC_EXPECTATIONS__;
  if (!registry) return;
  const exp = registry.get(id);
  if (!exp) return;

  const apiCall = extractApiCall(exp, kind);
  if (!apiCall) return;

  const startedAt = Date.now();
  // Defer the contract check — the page needs time to actually make the
  // call. 500ms is a pragmatic budget; most user-facing API calls finish
  // in well under that.
  setTimeout(() => evaluateContract(exp, apiCall, startedAt), GRACE_MS);
}

/**
 * Given an expectation + the kind of DOM event that fired, return the
 * specific ApiCallExpectation the prod reporter should check. Returns
 * null for contract types that don't carry an apiCall for this event.
 */
function extractApiCall(
  exp: Expectation,
  kind: 'click' | 'submit' | 'change',
): ApiCallExpectation | null {
  switch (exp.type) {
    case 'button-click':
      return kind === 'click' ? (exp as ButtonExpectation).onClick.apiCall ?? null : null;
    case 'form':
      return kind === 'submit' ? (exp as FormExpectation).contract.onSubmit?.apiCall ?? null : null;
    case 'input':
    case 'textarea': {
      const c = (exp as InputExpectation).contract;
      if (kind === 'change') return c.onChange?.apiCall ?? null;
      return null;
    }
    case 'select':
      return kind === 'change' ? (exp as SelectExpectation).contract.onChange?.apiCall ?? null : null;
    case 'checkbox':
    case 'switch':
      return kind === 'change' ? (exp as CheckboxExpectation).contract.onChange?.apiCall ?? null : null;
    case 'radio-group':
      return kind === 'change' ? (exp as RadioGroupExpectation).contract.onChange?.apiCall ?? null : null;
    case 'slider':
      return kind === 'change' ? (exp as SliderExpectation).contract.onChange?.apiCall ?? null : null;
    case 'file-input':
      return kind === 'change' ? (exp as FileInputExpectation).contract.upload?.apiCall ?? null : null;
    case 'date-picker':
      return kind === 'change' ? (exp as DatePickerExpectation).contract.onChange?.apiCall ?? null : null;
    case 'pagination':
      return kind === 'click' ? (exp as PaginationExpectation).contract.onChange?.apiCall ?? null : null;
    default:
      return null;
  }
}

function evaluateContract(
  exp: Expectation,
  apiCall: ApiCallExpectation,
  startedAt: number,
): void {
  const match = findMatchingFetch(apiCall, startedAt);
  if (!match) {
    queueViolation(exp, {
      errorMessage: `Expected API call ${apiCall.method} ${apiCall.url} did not fire`,
      expectedValue: `${apiCall.method} ${apiCall.url}`,
    });
    return;
  }
  if (apiCall.expectedStatus !== undefined && match.status !== apiCall.expectedStatus) {
    queueViolation(exp, {
      errorMessage: 'API status mismatch',
      expectedValue: String(apiCall.expectedStatus),
      observedValue: String(match.status),
    });
    return;
  }
  if (apiCall.maxDuration !== undefined && match.durationMs > apiCall.maxDuration) {
    queueViolation(exp, {
      errorMessage: 'API call exceeded maxDuration',
      expectedValue: `<= ${apiCall.maxDuration}ms`,
      observedValue: `${match.durationMs}ms`,
    });
  }
}

function findMatchingFetch(
  apiCall: ApiCallExpectation,
  sinceTimestamp: number,
): FetchRecord | null {
  const expectedPath =
    typeof apiCall.url === 'string'
      ? toPath(apiCall.url)
      : null;
  for (const r of recentFetches) {
    if (r.timestamp < sinceTimestamp - GRACE_MS) continue;
    if (r.method !== apiCall.method) continue;
    if (expectedPath !== null) {
      if (r.pathname !== expectedPath) continue;
    } else if (apiCall.url instanceof RegExp) {
      if (!apiCall.url.test(r.pathname)) continue;
    }
    return r;
  }
  return null;
}

/* ──────────────────────────────────────────────────────────── */

function queueViolation(
  exp: Expectation,
  detail: { errorMessage: string; expectedValue?: string; observedValue?: string },
): void {
  if (!cfg) return;
  pendingViolations.push({
    contractName: exp.name,
    componentName: exp.componentName ?? exp.name,
    errorMessage: detail.errorMessage,
    expectedValue: detail.expectedValue,
    observedValue: detail.observedValue,
    sessionId,
    userAgent: navigator.userAgent,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  });
}

function flushQueue(): void {
  if (!cfg || pendingViolations.length === 0) return;
  const batch = pendingViolations.splice(0, pendingViolations.length);
  // The server's /api/violations accepts either a single object or an
  // array — we always send an array.
  const body = JSON.stringify(batch);

  // Use the original (unwrapped) fetch so this network call doesn't
  // recurse through our own observation layer.
  const f = originalFetch ?? fetch;
  f(`${cfg.backendUrl}/api/violations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {
    // On failure, put the batch back at the front of the queue. Drop
    // anything older than 10 minutes to avoid unbounded growth if the
    // backend is down for a long time.
    const tenMinAgo = Date.now() - 10 * 60_000;
    pendingViolations = [
      ...batch.filter((v) => new Date(v.timestamp).getTime() > tenMinAgo),
      ...pendingViolations,
    ];
  });
}

function installLifecycleListeners(): void {
  // visibilitychange (tab hidden) and pagehide (real navigation) — last
  // chance to flush. Use sendBeacon since fetch() may be aborted.
  visibilityListener = () => {
    if (document.visibilityState !== 'hidden') return;
    if (!cfg || pendingViolations.length === 0) return;
    const blob = new Blob([JSON.stringify(pendingViolations)], {
      type: 'application/json',
    });
    if (sendKeepaliveFetch(blob)) pendingViolations = [];
  };
  document.addEventListener('visibilitychange', visibilityListener);
}

/**
 * fetch(..., { keepalive: true }) — survives page unload. Used instead
 * of navigator.sendBeacon so a future hardened deployment can layer on
 * custom headers without rewriting the flush path.
 */
function sendKeepaliveFetch(blob: Blob): boolean {
  if (!cfg) return false;
  try {
    const f = originalFetch ?? fetch;
    f(`${cfg.backendUrl}/api/violations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: blob,
      keepalive: true,
    });
    return true;
  } catch {
    return false;
  }
}

function makeSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  // Fallback for very old envs.
  return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
