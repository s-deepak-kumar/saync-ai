/**
 * Core expectation registry
 * Manages the global window.__SAYNC_EXPECTATIONS__ map
 */

import type { Expectation, SayncMode, SayncConfig } from './types.js';

/**
 * Get the current Saync mode from environment or window
 */
export function getSayncMode(): SayncMode {
  // Check window first (for runtime configuration)
  if (typeof window !== 'undefined' && window.__SAYNC_MODE__) {
    return window.__SAYNC_MODE__;
  }

  // Check environment variable
  const envMode = typeof process !== 'undefined' 
    ? process.env.SAYNC_MODE 
    : undefined;

  if (envMode === 'off' || envMode === 'log' || envMode === 'report') {
    return envMode;
  }

  // Default to 'log' in development, 'off' in production
  const isDev = typeof process !== 'undefined' 
    ? process.env.NODE_ENV !== 'production'
    : true;

  return isDev ? 'log' : 'off';
}

/**
 * Initialize the global expectations registry
 */
export function initRegistry(config?: Partial<SayncConfig>): void {
  if (typeof window === 'undefined') {
    return; // SSR - skip initialization
  }

  const mode = config?.mode ?? getSayncMode();

  // If mode is 'off', don't initialize
  if (mode === 'off') {
    return;
  }

  // Initialize the expectations map if it doesn't exist
  if (!window.__SAYNC_EXPECTATIONS__) {
    window.__SAYNC_EXPECTATIONS__ = new Map<string, Expectation>();
  }

  // Set the mode
  window.__SAYNC_MODE__ = mode;
}

/**
 * Register an expectation
 */
export function registerExpectation(expectation: Expectation): void {
  if (typeof window === 'undefined') {
    return; // SSR - skip registration
  }

  const mode = getSayncMode();
  if (mode === 'off') {
    return; // Don't register if disabled
  }

  // Ensure registry is initialized
  if (!window.__SAYNC_EXPECTATIONS__) {
    initRegistry();
  }

  window.__SAYNC_EXPECTATIONS__!.set(expectation.id, expectation);

  // In log mode, also log to console
  if (mode === 'log') {
    console.log('[Saync] Registered expectation:', expectation);
  }
}

/**
 * Unregister an expectation
 */
export function unregisterExpectation(id: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const mode = getSayncMode();
  if (mode === 'off') {
    return;
  }

  window.__SAYNC_EXPECTATIONS__?.delete(id);

  if (mode === 'log') {
    console.log('[Saync] Unregistered expectation:', id);
  }
}

/**
 * Get all registered expectations
 */
export function getExpectations(): Map<string, Expectation> {
  if (typeof window === 'undefined') {
    return new Map();
  }

  return window.__SAYNC_EXPECTATIONS__ ?? new Map();
}

/**
 * Clear all expectations (useful for testing)
 */
export function clearExpectations(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.__SAYNC_EXPECTATIONS__?.clear();
}

/**
 * Generate a unique ID for an expectation
 */
export function generateExpectationId(prefix: string = 'saync'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Made with Bob
