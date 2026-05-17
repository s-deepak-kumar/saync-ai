'use client';

import { createContext, useContext } from 'react';
import {
  registerExpectation,
  unregisterExpectation,
  type Expectation,
  type SayncMode,
} from '@saync/core';

/**
 * A manually-tracked event — for things that don't have a natural DOM
 * trigger (WebSocket message arrived, polling tick, state-machine
 * transition, etc.). Captured into window.__SAYNC__.events so the
 * agent / production reporter can see them alongside contract results.
 */
export interface SayncEvent {
  name: string;
  data?: unknown;
  timestamp: number;
}

export interface SayncContextValue {
  /** Operational mode: 'off' disables all SDK activity; 'log' registers + logs locally
   *  (dev workflow); 'report' also batches and sends events to the backend (production). */
  mode: SayncMode;
  /** Register a contract with the global registry. The Button / Form / Input
   *  components call this on mount, unregister on unmount. */
  register: (expectation: Expectation) => void;
  unregister: (id: string) => void;
  /** Record a manual event (sockets, polling, etc.). Pushed into window.__SAYNC__.events. */
  track: (name: string, data?: unknown) => void;
}

/**
 * Default context value for components rendered outside a <Saync.Provider>.
 * Still writes to the global registry so SDK components stay usable in apps
 * that never set up the Provider.
 */
const fallbackContext: SayncContextValue = {
  mode: 'log',
  register: registerExpectation,
  unregister: unregisterExpectation,
  track: (name, data) => {
    if (typeof window === 'undefined') return;
    const g = (window as any).__SAYNC__;
    if (g?.events) {
      g.events.push({ name, data, timestamp: Date.now() });
    }
  },
};

export const SayncContext = createContext<SayncContextValue>(fallbackContext);

/**
 * Access the Saync runtime from any component inside <Saync.Provider>.
 * Outside a Provider it returns a degraded but functional context that
 * still writes to the global registry — see `fallbackContext` above.
 */
export function useSaync(): SayncContextValue {
  return useContext(SayncContext);
}
