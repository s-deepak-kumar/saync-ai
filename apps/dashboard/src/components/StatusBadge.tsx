type Status = 'passed' | 'failed' | 'running' | 'pending' | 'completed' | 'skipped';

const STATUS_TOKEN: Record<Status, { bg: string; fg: string; label: string; pulse?: boolean }> = {
  passed:    { bg: '#DCFCE7', fg: '#059669', label: 'pass' },
  completed: { bg: '#DCFCE7', fg: '#059669', label: 'pass' },
  failed:    { bg: '#FEE2E2', fg: '#DC2626', label: 'fail' },
  running:   { bg: '#FFEDD5', fg: '#D4502A', label: 'running', pulse: true },
  pending:   { bg: '#F1F5F9', fg: '#64748B', label: 'pending' },
  skipped:   { bg: '#F1F5F9', fg: '#94A3B8', label: 'skipped' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

/**
 * Compact status indicator used by run rows, flow rows, step entries.
 * Live `running` state gets a pulsing dot — picks up the eye.
 */
export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const tok = STATUS_TOKEN[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${className}`}
      style={{ backgroundColor: tok.bg, color: tok.fg }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${tok.pulse ? 'animate-pulse-dot' : ''}`}
        style={{ backgroundColor: tok.fg }}
      />
      {tok.label}
    </span>
  );
}
