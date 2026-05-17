import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatAbsolute, formatDuration, shortId } from '@/lib/format';
import LiveRunDetail from './LiveRunDetail';
import AiReport from '@/components/AiReport';

export const dynamic = 'force-dynamic';

interface PageProps { params: { runId: string } }

/**
 * Run-detail server shell. The breadcrumb, run metadata, and Generate-
 * report button are static so we render them here. Everything that
 * needs to update as the agent streams in (status badge, stat tiles,
 * flows table, contracts table) lives in <LiveRunDetail/>.
 */
export default async function RunDetailPage({ params }: PageProps) {
  const run = await api.runDetail(params.runId).catch(() => null);
  if (!run) notFound();

  const durationMs =
    run.completedAt && run.startedAt
      ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      : null;

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <nav className="flex items-center gap-1 text-[12px] text-muted mb-4">
        <Link href="/" className="hover:text-ink transition-colors">Dashboard</Link>
        <ChevronRight size={12} />
        <Link href="/runs" className="hover:text-ink transition-colors">Runs</Link>
        <ChevronRight size={12} />
        <span className="text-ink font-mono">{shortId(run.id)}</span>
      </nav>

      <header className="flex items-baseline justify-between mb-5 pb-5 border-b border-border">
        <div>
          {run.gitBranch && (
            <code className="font-mono text-[12px] text-muted block mb-2">
              {run.gitBranch}
              {run.gitCommit ? <span>@{run.gitCommit.slice(0, 7)}</span> : ''}
            </code>
          )}
          <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink mb-1">
            Run
          </h1>
          <div className="font-mono text-[11px] text-muted">
            {formatAbsolute(run.startedAt)}
            {durationMs !== null && <> · {formatDuration(durationMs)}</>}
            {' · env '}{run.environment}
          </div>
        </div>

      </header>

      <LiveRunDetail initialRun={run} />

      <div className="mt-6">
        <AiReport
          body={{ kind: 'run', runId: run.id }}
          downloadName={`run-${shortId(run.id)}-report`}
        />
      </div>
    </div>
  );
}
