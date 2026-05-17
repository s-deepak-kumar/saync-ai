import Link from 'next/link';
import { Radio, Monitor, Smartphone, Globe } from 'lucide-react';
import { api, type ProductionViolation } from '@/lib/api';
import { formatRelative, formatAbsolute } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Window = '1h' | '24h' | '7d' | 'all';

const WINDOWS: { id: Window; label: string; ms: number | null }[] = [
  { id: '1h',  label: 'Last hour',   ms: 60 * 60_000 },
  { id: '24h', label: 'Last 24h',    ms: 24 * 60 * 60_000 },
  { id: '7d',  label: 'Last 7 days', ms: 7 * 24 * 60 * 60_000 },
  { id: 'all', label: 'All time',    ms: null },
];

interface PageProps {
  searchParams: { window?: string };
}

/**
 * Production violations — clustered Sentry-style.
 *
 * Each row is a unique (contract + component + errorMessage) cluster
 * within the selected time window. We do the grouping in JS rather than
 * with a GROUP BY in SQL because the per-cluster aggregate fields are
 * cheap to derive client-side and the count cap (5000 rows) keeps the
 * payload bounded.
 */
export default async function ViolationsPage({ searchParams }: PageProps) {
  const win = (WINDOWS.find((w) => w.id === searchParams.window) ?? WINDOWS[1]); // default 24h
  const sinceIso =
    win.ms !== null
      ? new Date(Date.now() - win.ms).toISOString()
      : undefined;

  const violations = await api
    .violations({ since: sinceIso, limit: 5000 })
    .catch(() => [] as ProductionViolation[]);

  const clusters = clusterViolations(violations);

  // Per-window total across the entire response — the chips above show
  // counts so the user knows whether the window's empty or whether
  // tightening the range would hide signal.
  const counts: Record<Window, number> = { '1h': 0, '24h': 0, '7d': 0, 'all': 0 };
  const now = Date.now();
  for (const v of violations) {
    const age = now - new Date(v.timestamp).getTime();
    if (age <= 60 * 60_000)            counts['1h']++;
    if (age <= 24 * 60 * 60_000)       counts['24h']++;
    if (age <= 7 * 24 * 60 * 60_000)   counts['7d']++;
    counts['all']++;
  }

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Radio size={11} /> Production
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink">
            Violations
          </h1>
          <span className="text-[12px] text-muted font-mono">
            {clusters.length} cluster{clusters.length === 1 ? '' : 's'} · {violations.length} occurrence{violations.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      {/* Window chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[10px] uppercase tracking-wider text-label mr-1">Window</span>
        {WINDOWS.map((w) => (
          <Link
            key={w.id}
            href={w.id === '24h' ? '/violations' : `/violations?window=${w.id}`}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              win.id === w.id
                ? 'bg-ink text-white'
                : 'bg-white border border-border text-ink hover:bg-rowHover'
            }`}
          >
            {w.label}
            <span className={`font-mono text-[10px] tabular-nums ${win.id === w.id ? 'text-white/70' : 'text-muted'}`}>
              {counts[w.id]}
            </span>
          </Link>
        ))}
      </div>

      {clusters.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[4px_minmax(0,1.6fr)_120px_120px_120px_100px] gap-3 px-4 py-2 border-b border-border bg-zebra text-[10px] uppercase tracking-wider text-label font-medium">
            <div />
            <div>Cluster</div>
            <div>Sessions</div>
            <div>URLs hit</div>
            <div>Last seen</div>
            <div className="text-right">Occurrences</div>
          </div>
          <ul className="divide-y divide-border">
            {clusters.map((c) => (
              <ClusterRow key={c.key} cluster={c} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */

interface Cluster {
  key: string;
  contractName: string;
  componentName: string;
  errorMessage: string;
  occurrences: number;
  uniqueSessions: number;
  uniqueUrls: number;
  topUrls: { url: string; count: number }[];
  firstSeen: string;
  lastSeen: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  viewports: { width: number; count: number }[];
}

function clusterViolations(rows: ProductionViolation[]): Cluster[] {
  const map = new Map<string, ProductionViolation[]>();
  for (const v of rows) {
    const key = `${v.contractName}|${v.componentName}|${v.errorMessage}`;
    const bucket = map.get(key) ?? [];
    bucket.push(v);
    map.set(key, bucket);
  }

  const clusters: Cluster[] = [];
  for (const [key, bucket] of map) {
    const sessions = new Set(bucket.map((v) => v.sessionId));
    const urlCounts = new Map<string, number>();
    const viewportCounts = new Map<number, number>();
    let firstSeen = bucket[0].timestamp;
    let lastSeen = bucket[0].timestamp;
    for (const v of bucket) {
      urlCounts.set(v.url, (urlCounts.get(v.url) ?? 0) + 1);
      viewportCounts.set(v.viewportWidth, (viewportCounts.get(v.viewportWidth) ?? 0) + 1);
      if (v.timestamp < firstSeen) firstSeen = v.timestamp;
      if (v.timestamp > lastSeen)  lastSeen  = v.timestamp;
    }
    const topUrls = [...urlCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([url, count]) => ({ url, count }));
    const viewports = [...viewportCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([width, count]) => ({ width, count }));

    const occurrences = bucket.length;
    const severity: Cluster['severity'] =
      occurrences >= 50 ? 'critical'
      : occurrences >= 10 ? 'high'
      : occurrences >= 3  ? 'medium'
      : 'low';

    clusters.push({
      key,
      contractName: bucket[0].contractName,
      componentName: bucket[0].componentName,
      errorMessage: bucket[0].errorMessage,
      occurrences,
      uniqueSessions: sessions.size,
      uniqueUrls: urlCounts.size,
      topUrls,
      firstSeen,
      lastSeen,
      severity,
      viewports,
    });
  }

  // Newest activity first, then by occurrence count as tiebreaker.
  clusters.sort((a, b) => {
    if (a.lastSeen !== b.lastSeen) return a.lastSeen < b.lastSeen ? 1 : -1;
    return b.occurrences - a.occurrences;
  });

  return clusters;
}

/* ──────────────────────────────────────────────────────────── */

const SEV_COLOR: Record<Cluster['severity'], { strip: string; pill: string; text: string }> = {
  critical: { strip: '#DC2626', pill: '#FEE2E2', text: '#991B1B' },
  high:     { strip: '#C2410C', pill: '#FFEDD5', text: '#9A3412' },
  medium:   { strip: '#92400E', pill: '#FEF3C7', text: '#854D0E' },
  low:      { strip: '#059669', pill: '#DCFCE7', text: '#166534' },
};

function ClusterRow({ cluster }: { cluster: Cluster }) {
  const sev = SEV_COLOR[cluster.severity];
  const tail = cluster.contractName.startsWith(cluster.componentName + '.')
    ? cluster.contractName.slice(cluster.componentName.length + 1)
    : cluster.contractName;

  return (
    <li className="grid grid-cols-[4px_minmax(0,1.6fr)_120px_120px_120px_100px] gap-3 px-4 py-3 hover:bg-zebra transition-colors items-start group">
      <div
        className="-mx-4 w-1 h-full"
        style={{ backgroundColor: sev.strip }}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-[0.1em] font-mono"
            style={{ backgroundColor: sev.pill, color: sev.text }}
          >
            {cluster.severity}
          </span>
          <span className="text-[13px] font-medium text-ink truncate">
            {cluster.componentName} <span className="text-muted">·</span> <span className="font-mono">{tail}</span>
          </span>
        </div>
        <div className="text-[11.5px] text-[#991B1B] font-mono truncate" title={cluster.errorMessage}>
          {cluster.errorMessage}
        </div>
        {cluster.topUrls.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted font-mono">
            <Globe size={10} className="opacity-70" />
            {cluster.topUrls.map((u) => (
              <span key={u.url} className="truncate" title={u.url}>
                {shortPath(u.url)}
                {u.count > 1 && <span className="ml-0.5 opacity-60">×{u.count}</span>}
              </span>
            ))}
            {cluster.uniqueUrls > cluster.topUrls.length && (
              <span className="text-label">+{cluster.uniqueUrls - cluster.topUrls.length} more</span>
            )}
          </div>
        )}
        {cluster.viewports.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted font-mono">
            {cluster.viewports[0].width < 768 ? <Smartphone size={10} className="opacity-70" /> : <Monitor size={10} className="opacity-70" />}
            {cluster.viewports.map((v, i) => (
              <span key={v.width}>
                {v.width}px
                {v.count > 1 && <span className="opacity-60">×{v.count}</span>}
                {i < cluster.viewports.length - 1 ? ',' : ''}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="font-mono text-[12px] text-ink tabular-nums self-center">
        {cluster.uniqueSessions}
      </div>
      <div className="font-mono text-[12px] text-ink tabular-nums self-center">
        {cluster.uniqueUrls}
      </div>
      <div className="self-center">
        <div className="font-mono text-[11px] text-muted">{formatRelative(cluster.lastSeen)}</div>
        <div className="font-mono text-[10px] text-label" title={formatAbsolute(cluster.firstSeen)}>
          first {formatRelative(cluster.firstSeen)}
        </div>
      </div>
      <div className="font-mono text-[14px] text-ink text-right tabular-nums self-center">
        {cluster.occurrences}
        <span className="ml-0.5 text-label text-[10px]">×</span>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="bg-card border border-border rounded px-6 py-10 text-center">
      <p className="text-[14px] font-medium text-ink mb-2">
        No production violations in this window
      </p>
      <p className="text-[12px] text-muted max-w-[560px] mx-auto leading-relaxed mb-5">
        When you build your app with{' '}
        <code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">{`<Saync.Provider mode="report" />`}</code>,
        the SDK observes real users, captures contract violations, and POSTs them to{' '}
        <code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">/api/violations</code>
        {' '}on this Saync instance. Set
        {' '}<code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">backendUrl</code>{' '}
        on the Provider to point at this server's public URL when you deploy.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/setup" className="text-[12px] font-medium text-terracotta hover:underline">
          See install instructions →
        </Link>
        <span className="text-label">·</span>
        <a
          href="/saync-llm.md"
          download="saync-llm.md"
          className="text-[12px] font-medium text-muted hover:text-ink transition-colors"
        >
          Download LLM context
        </a>
      </div>
    </div>
  );
}

function shortPath(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname || '/';
  } catch {
    return rawUrl;
  }
}
