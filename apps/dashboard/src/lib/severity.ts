import type { Severity } from './api';

/**
 * Centralized severity color + label mapping. Used by every row,
 * pill, dot, edge-strip in the dashboard. If a designer wants to
 * rebalance the palette, this is the only file to touch.
 */
export const SEVERITY_TOKEN: Record<Severity, {
  /** Foreground text color. */
  fg: string;
  /** Filled-background tint (for pills). */
  bg: string;
  /** 6px left-edge strip color (same as fg by convention). */
  strip: string;
  /** Display label (ALL-CAPS handled by CSS). */
  label: string;
  /** Sort rank — lower = more severe. */
  rank: number;
}> = {
  critical: { fg: '#DC2626', bg: '#FEE2E2', strip: '#DC2626', label: 'critical', rank: 0 },
  high:     { fg: '#C2410C', bg: '#FFEDD5', strip: '#C2410C', label: 'high',     rank: 1 },
  medium:   { fg: '#92400E', bg: '#FEF3C7', strip: '#92400E', label: 'medium',   rank: 2 },
  low:      { fg: '#059669', bg: '#DCFCE7', strip: '#059669', label: 'low',      rank: 3 },
};

export function sortBySeverity<T extends { severity: Severity }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_TOKEN[a.severity].rank - SEVERITY_TOKEN[b.severity].rank);
}
