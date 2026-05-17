import Link from 'next/link';
import { Terminal } from 'lucide-react';
import { api, type Run, type RunStatus } from '@/lib/api';
import { formatRelative, formatDuration } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

type Filter = 'all' | 'running' | 'completed' | 'failed';
const FILTERS: Filter[] = ['all', 'running', 'completed', 'failed'];

interface PageProps {
  searchParams: { status?: string };
}

export default async function RunsPage({ searchParams }: PageProps) {
  const filter = (FILTERS.find((f) => f === searchParams.status) ?? 'all') as Filter;

  // Fetch wide so chip counts are accurate; filter in JS.
  const all = await api.recentRuns(100).catch(() => [] as Run[]);
  const filtered = filter === 'all' ? all : all.filter((r) => r.status === filter);

  const countByStatus = (s: Filter) =>
    s === 'all' ? all.length : all.filter((r) => r.status === s).length;

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="mb-4">
        <div className="text-[11px] text-muted uppercase tracking-wider mb-1">
          {filtered.length === all.length
            ? `${all.length} run${all.length === 1 ? '' : 's'}`
            : `${filtered.length} of ${all.length}`}
        </div>
        <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink">
          Runs
        </h1>
      </header>

      {all.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-label mr-1">Status</span>
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === 'all' ? '/runs' : `/runs?status=${f}`}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                filter === f
                  ? 'bg-ink text-white'
                  : 'bg-white border border-border text-ink hover:bg-rowHover'
              }`}
            >
              {f === 'running' && (
                <span className="w-1.5 h-1.5 rounded-full bg-statusRunning animate-pulse-dot" />
              )}
              <span className="capitalize">{f}</span>
              <span
                className={`font-mono text-[10px] tabular-nums ${
                  filter === f ? 'text-white/70' : 'text-muted'
                }`}
              >
                {countByStatus(f)}
              </span>
            </Link>
          ))}
        </div>
      )}

      {all.length === 0 ? (
        <EmptyRuns />
      ) : (
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

          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-[13px] font-medium text-ink mb-1">
                No runs match this filter
              </p>
              <p className="text-[12px] text-muted">
                Try{' '}
                <Link href="/runs" className="text-terracotta hover:underline">
                  showing all runs
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((run, i) => {
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
                      #{filtered.length - i}
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
                    <div><StatusBadge status={run.status as RunStatus} /></div>
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
      )}
    </div>
  );
}

function EmptyRuns() {
  return (
    <div className="bg-card border border-border rounded p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-9 h-9 rounded-full bg-zebra border border-border flex items-center justify-center text-terracotta">
          <Terminal size={16} />
        </div>
        <div>
          <h2 className="text-[14px] font-medium text-ink mb-1">No runs yet</h2>
          <p className="text-[12.5px] text-muted leading-relaxed max-w-[520px]">
            Runs are produced by the Saync agent driving your app. Start your
            dev server, then trigger one of the commands below.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-12">
        <div className="bg-zebra border border-border rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-label font-mono mb-1.5">
            Local mode (watcher re-runs on save)
          </div>
          <code className="font-mono text-[12px] text-ink">npm run saync</code>
        </div>
        <div className="bg-zebra border border-border rounded p-3">
          <div className="text-[10px] uppercase tracking-wider text-label font-mono mb-1.5">
            One-shot (CI / build hook)
          </div>
          <code className="font-mono text-[12px] text-ink">npm run saync:run</code>
        </div>
      </div>

      <div className="mt-5 ml-12 flex flex-wrap items-center gap-3 text-[12px]">
        <Link href="/setup" className="text-terracotta font-medium hover:underline">
          Install instructions →
        </Link>
        <span className="text-rule">·</span>
        <a
          href="/saync-llm.md"
          download="saync-llm.md"
          className="text-ink hover:underline"
        >
          Download LLM context
        </a>
      </div>
    </div>
  );
}
