'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  initRegistry,
  registerExpectation,
  unregisterExpectation,
  type SayncMode,
} from '@saync/core';
import { SayncContext, type SayncContextValue, type SayncEvent } from './context.js';
import { startReporter, stopReporter } from './reporter.js';

export interface SayncProviderProps {
  /**
   * URL of the Saync server this SDK reports to (mode="report" only).
   * Defaults to the local-first dev value, http://localhost:3777.
   * In production you'd point this at the host where you've deployed
   * `saync start` alongside your app.
   */
  backendUrl?: string;
  /**
   * Operational mode:
   *   - 'off'    : SDK is completely passive; no global state, no event capture.
   *   - 'log'    : Default for dev. Components register expectations into
   *                window.__SAYNC_EXPECTATIONS__ for the agent to read.
   *   - 'report' : Production observability. Wraps fetch, batches violations,
   *                POSTs to backendUrl every 5s.
   *
   * Defaults to 'log' in dev (NODE_ENV !== 'production'), 'off' otherwise.
   */
  mode?: SayncMode;
  children: ReactNode;
}

interface SayncGlobal {
  tags: Map<string, unknown>;
  events: SayncEvent[];
  mode: SayncMode;
}

declare global {
  interface Window {
    __SAYNC__?: SayncGlobal;
  }
}

/**
 * <Saync.Provider> — root of every Saync-instrumented app.
 *
 *   1. Initializes window.__SAYNC_EXPECTATIONS__ (the registry the
 *      Playwright agent reads from) plus a sibling window.__SAYNC__
 *      that holds runtime metadata + a manual-events array.
 *   2. In 'report' mode, wraps window.fetch to capture API calls and
 *      batches contract violations to a local Saync server. The
 *      `saync start` instance running alongside this app accepts them
 *      at /api/violations (no auth — single-tenant local install).
 *   3. Provides React context so child components register via
 *      `useSaync()` instead of reaching for window globals.
 */
export function SayncProvider({
  backendUrl,
  mode,
  children,
}: SayncProviderProps) {
  const effectiveMode: SayncMode = useMemo(() => {
    if (mode) return mode;
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
      return 'off';
    }
    return 'log';
  }, [mode]);

  const initRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (effectiveMode === 'off') return;
    if (initRef.current) return;

    if (window.__SAYNC__) {
      console.warn('[Saync] Multiple <Saync.Provider> instances detected. Using the first one.');
      return;
    }

    initRegistry({ mode: effectiveMode });

    window.__SAYNC__ = {
      tags: window.__SAYNC_EXPECTATIONS__ ?? new Map(),
      events: [],
      mode: effectiveMode,
    };

    if (effectiveMode === 'report') {
      startReporter({
        backendUrl: backendUrl ?? 'http://localhost:3777',
      });
    }

    initRef.current = true;
    return () => {
      if (effectiveMode === 'report') stopReporter();
      initRef.current = false;
    };
  }, [effectiveMode, backendUrl]);

  const ctx: SayncContextValue = useMemo(
    () => ({
      mode: effectiveMode,
      register: registerExpectation,
      unregister: unregisterExpectation,
      track: (name: string, data?: unknown) => {
        if (typeof window === 'undefined' || effectiveMode === 'off') return;
        const g = window.__SAYNC__;
        if (g) {
          g.events.push({ name, data, timestamp: Date.now() });
        }
      },
    }),
    [effectiveMode],
  );

  return <SayncContext.Provider value={ctx}>{children}</SayncContext.Provider>;
}
