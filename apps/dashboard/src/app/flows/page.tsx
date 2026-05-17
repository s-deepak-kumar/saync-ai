import Link from 'next/link';
import { api, type FlowSummary } from '@/lib/api';
import { formatRelative, formatDuration } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function FlowsPage() {
  const flows = await api.flowSummaries().catch(() => [] as FlowSummary[]);

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">
          {flows.length} flow{flows.length === 1 ? '' : 's'}
        </div>
        <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink">
          Flows
        </h1>
      </header>

      {flows.length === 0 ? (
        <div className="bg-card border border-border rounded px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-ink mb-2">No flows declared</p>
          <p className="text-[12px] text-muted max-w-[480px] mx-auto leading-relaxed mb-4">
            Add a <code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">saync.flows.ts</code> file
            to your repo root, export an array of <code className="font-mono text-[11px] bg-zebra px-1.5 py-0.5 rounded">defineFlow(…)</code> calls,
            and the agent will drive each one end-to-end on the next run.
          </p>
          <Link href="/setup" className="text-[12px] font-medium text-terracotta hover:underline">
            See install instructions →
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.5fr)_100px_120px_120px_140px_60px] gap-3 px-4 py-2 border-b border-border bg-zebra text-[10px] uppercase tracking-wider text-label font-medium">
            <div>Flow</div>
            <div>Latest</div>
            <div>Success rate</div>
            <div>Last duration</div>
            <div>Last run</div>
            <div className="text-right">View</div>
          </div>
          <ul className="divide-y divide-border">
            {flows.map((f) => {
              const rate = f.totalRuns > 0 ? f.passedRuns / f.totalRuns : 0;
              return (
                <li
                  key={f.name}
                  className="grid grid-cols-[minmax(0,1.5fr)_100px_120px_120px_140px_60px] gap-3 px-4 py-2.5 hover:bg-zebra items-center transition-colors"
                >
                  <div className="font-medium text-[13px] text-ink truncate">{f.name}</div>
                  <div><StatusBadge status={f.status} /></div>
                  <div className="font-mono text-[11px] tabular-nums">
                    <span className={rate >= 0.9 ? 'text-statusPass' : rate < 0.5 ? 'text-statusFail' : 'text-muted'}>
                      {Math.round(rate * 100)}%
                    </span>
                    <span className="text-muted"> ({f.passedRuns}/{f.totalRuns})</span>
                  </div>
                  <div className="font-mono text-[11px] text-muted tabular-nums">
                    {formatDuration(f.durationMs)}
                  </div>
                  <div className="font-mono text-[11px] text-muted">
                    {formatRelative(f.startedAt)}
                  </div>
                  <div className="text-right">
                    <Link
                      href={`/flows/${f.name}`}
                      className="text-[11px] text-terracotta hover:underline"
                    >
                      open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
