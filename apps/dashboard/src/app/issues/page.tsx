import Link from 'next/link';
import {
  api,
  issueSlug,
  type Severity,
  type Issue,
} from '@/lib/api';
import { formatRelative } from '@/lib/format';
import { SEVERITY_TOKEN, sortBySeverity } from '@/lib/severity';
import SeverityPill from '@/components/SeverityPill';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { status?: string; severity?: string };
}

const STATUS_OPTIONS = ['all', 'open', 'resolved'] as const;
const SEVERITY_OPTIONS: ('all' | Severity)[] = ['all', 'critical', 'high', 'medium', 'low'];

export default async function IssuesPage({ searchParams }: PageProps) {
  const statusFilter = (searchParams.status ?? 'all') as 'all' | 'open' | 'resolved';
  const severityFilter = (searchParams.severity ?? 'all') as 'all' | Severity;

  const all = await api.issues().catch(() => [] as Issue[]);
  const filtered = all.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
    return true;
  });
  const sorted = sortBySeverity(filtered);

  // Pre-compute counts per chip so the filter row shows live totals.
  const countByStatus = (s: string) => all.filter((i) => s === 'all' || i.status === s).length;
  const countBySeverity = (sv: string) => all.filter((i) => sv === 'all' || i.severity === sv).length;

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">
          {sorted.length === all.length
            ? `${all.length} issue${all.length === 1 ? '' : 's'}`
            : `${sorted.length} of ${all.length}`}
        </div>
        <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink">
          Issues
        </h1>
      </header>

      {/* Filter chips — URL-backed for sharable links */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-wider text-label mr-1">Status</span>
        {STATUS_OPTIONS.map((s) => (
          <ChipLink
            key={s}
            href={chipHref('status', s, severityFilter)}
            active={statusFilter === s}
            label={s}
            count={countByStatus(s)}
          />
        ))}
        <span className="text-[10px] uppercase tracking-wider text-label ml-3 mr-1">Severity</span>
        {SEVERITY_OPTIONS.map((sv) => (
          <ChipLink
            key={sv}
            href={chipHref('severity', sv, statusFilter, true)}
            active={severityFilter === sv}
            label={sv}
            count={countBySeverity(sv)}
            severityKey={sv !== 'all' ? sv : undefined}
          />
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="grid grid-cols-[4px_minmax(0,1fr)_140px_120px_120px_80px_100px] gap-3 px-4 py-2 border-b border-border bg-zebra text-[10px] uppercase tracking-wider text-label font-medium">
          <div /> {/* severity strip column */}
          <div>Issue</div>
          <div>Component</div>
          <div>First seen</div>
          <div>Last seen</div>
          <div className="text-right">Count</div>
          <div className="text-right">Severity</div>
        </div>

        {sorted.length === 0 ? (
          all.length === 0 ? (
            <div className="px-6 py-10">
              <div className="max-w-[520px] mx-auto text-center">
                <p className="text-[14px] font-medium text-ink mb-1.5">
                  No issues yet
                </p>
                <p className="text-[12.5px] text-muted leading-relaxed mb-4">
                  Issues are the deduplicated cluster of failed contracts.
                  Once the agent runs and finds a contract that doesn&apos;t
                  match reality, the failure shows up here grouped by root
                  cause.
                </p>
                <div className="flex items-center justify-center gap-3 text-[12px]">
                  <Link href="/runs" className="text-terracotta font-medium hover:underline">
                    See your runs →
                  </Link>
                  <span className="text-rule">·</span>
                  <Link href="/setup" className="text-ink hover:underline">
                    Install instructions
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] font-medium text-ink mb-1">
                No issues match these filters
              </p>
              <p className="text-[12px] text-muted">
                Loosen the filter chips above, or{' '}
                <Link href="/issues" className="text-terracotta hover:underline">
                  clear all filters
                </Link>
                .
              </p>
            </div>
          )
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((issue) => (
              <li
                key={issue.id}
                className="grid grid-cols-[4px_minmax(0,1fr)_140px_120px_120px_80px_100px] gap-3 px-4 py-2.5 hover:bg-zebra transition-colors group"
              >
                {/* Severity left-edge strip — replaces the 4px filler column */}
                <div
                  className="-mx-4 w-1 h-full"
                  style={{ backgroundColor: SEVERITY_TOKEN[issue.severity].strip }}
                />
                <div className="min-w-0">
                  <Link
                    href={`/issues/${issueSlug(issue.contractName)}`}
                    className="block"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-ink group-hover:text-terracotta truncate">
                        {issue.componentName} · {tailContract(issue)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted truncate mt-0.5">
                      {issue.errorMessage}
                    </div>
                  </Link>
                </div>
                <div className="font-mono text-[11px] text-muted truncate self-center">
                  {issue.componentName}
                </div>
                <div className="font-mono text-[11px] text-muted self-center">
                  {formatRelative(issue.firstSeenAt)}
                </div>
                <div className="font-mono text-[11px] text-muted self-center">
                  {formatRelative(issue.lastSeenAt)}
                </div>
                <div className="font-mono text-[11px] text-ink text-right tabular-nums self-center">
                  {issue.occurrenceCount}×
                </div>
                <div className="text-right self-center">
                  <SeverityPill severity={issue.severity} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */

function tailContract(issue: Issue): string {
  return issue.contractName.startsWith(issue.componentName + '.')
    ? issue.contractName.slice(issue.componentName.length + 1)
    : issue.contractName;
}

function chipHref(
  param: 'status' | 'severity',
  value: string,
  otherFilter: string,
  paramIsSeverity = false,
): string {
  const sp = new URLSearchParams();
  if (paramIsSeverity) {
    if (otherFilter !== 'all') sp.set('status', otherFilter);
    if (value !== 'all') sp.set('severity', value);
  } else {
    if (value !== 'all') sp.set('status', value);
    if (otherFilter !== 'all') sp.set('severity', otherFilter);
  }
  const qs = sp.toString();
  return `/issues${qs ? '?' + qs : ''}`;
}

function ChipLink({
  href, active, label, count, severityKey,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  severityKey?: Severity;
}) {
  const accent = severityKey ? SEVERITY_TOKEN[severityKey].strip : undefined;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
        active
          ? 'bg-ink text-white'
          : 'bg-white border border-border text-ink hover:bg-rowHover'
      }`}
    >
      {accent && (
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
      )}
      <span className="capitalize">{label}</span>
      <span className={`font-mono text-[10px] tabular-nums ${active ? 'text-white/70' : 'text-muted'}`}>
        {count}
      </span>
    </Link>
  );
}
