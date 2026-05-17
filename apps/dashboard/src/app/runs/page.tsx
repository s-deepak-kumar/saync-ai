import Link from 'next/link';
import { api, type Run } from '@/lib/api';
import { formatRelative, formatDuration } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function RunsPage() {
  const runs = await api.recentRuns(50).catch(() => [] as Run[]);

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-5">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">
          {runs.length} run{runs.length === 1 ? '' : 's'}
        </div>
        <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink">
          Runs
        </h1>
      </header>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="grid grid-cols-[60px_minmax(0,1fr)_120px_140px_120px_100px_60px] gap-3 px-4 py-2 border-b border-border bg-zebra text-[10px] uppercase tracking-wider text-label font-medium">
          <div>Run</div>
          <div>Branch · Commit</div>
          <div>Status</div>
          <div>Results</div>
          <div>Started</div>
          <div className="text-right">Duration</div>
          <div className="text-right">View</div>
        </div>

        {runs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] font-medium text-ink mb-1">No runs yet</p>
            <p className="text-[12px] text-muted">
              Run the agent against your app to see results here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {runs.map((run, i) => {
              const durationMs =
                run.completedAt && run.startedAt
                  ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
                  : null;
              return (
                <li
                  key={run.id}
                  className="grid grid-cols-[60px_minmax(0,1fr)_120px_140px_120px_100px_60px] gap-3 px-4 py-2.5 hover:bg-zebra transition-colors items-center"
                >
                  <div className="font-fraunces text-[15px] text-ink">
                    #{runs.length - i}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-ink truncate">
                      {run.gitBranch ?? '—'}
                      {run.gitCommit ? (
                        <span className="text-muted">@{run.gitCommit.slice(0, 7)}</span>
                      ) : ''}
                    </div>
                    <div className="font-mono text-[10px] text-muted">
                      env {run.environment ?? '—'} · viewport {run.viewport ?? '—'}
                    </div>
                  </div>
                  <div><StatusBadge status={run.status as any} /></div>
                  <div className="font-mono text-[12px] tabular-nums">
                    <span className="text-statusPass">{run.passedContracts}p</span>
                    <span className="text-muted"> · </span>
                    <span
                      className={run.failedContracts > 0 ? 'text-statusFail' : 'text-muted'}
                    >
                      {run.failedContracts}f
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-muted">
                    {formatRelative(run.startedAt)}
                  </div>
                  <div className="font-mono text-[11px] text-muted tabular-nums text-right">
                    {formatDuration(durationMs)}
                  </div>
                  <div className="text-right">
                    <Link
                      href={`/runs/${run.id}`}
                      className="text-[11px] text-terracotta hover:underline"
                    >
                      open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
