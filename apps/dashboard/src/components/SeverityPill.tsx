import type { Severity } from '@/lib/api';
import { SEVERITY_TOKEN } from '@/lib/severity';

interface SeverityPillProps {
  severity: Severity;
  variant?: 'pill' | 'dot' | 'strip';
  className?: string;
}

/**
 * Severity indicator with three variants:
 *
 *   pill  — colored pill with text label (default; for headers + filters)
 *   dot   — a small colored circle (inline before a title)
 *   strip — a 4px-wide vertical bar (issue/run row left-edges)
 *
 * Color tokens come from SEVERITY_TOKEN — single source of truth.
 */
export default function SeverityPill({ severity, variant = 'pill', className = '' }: SeverityPillProps) {
  const tok = SEVERITY_TOKEN[severity];

  if (variant === 'dot') {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${className}`}
        style={{ backgroundColor: tok.strip }}
        aria-label={`severity: ${tok.label}`}
      />
    );
  }

  if (variant === 'strip') {
    return (
      <span
        className={`block w-1 h-full ${className}`}
        style={{ backgroundColor: tok.strip }}
        aria-hidden="true"
      />
    );
  }

  // pill (default)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${className}`}
      style={{ backgroundColor: tok.bg, color: tok.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tok.strip }} />
      {tok.label}
    </span>
  );
}
