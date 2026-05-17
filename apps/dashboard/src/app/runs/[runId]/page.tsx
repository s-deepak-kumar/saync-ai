import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, FileText } from 'lucide-react';
import { api, type FlowWithSteps, type ContractResult } from '@/lib/api';
import { formatRelative, formatAbsolute, formatDuration, shortId } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

interface PageProps { params: { runId: string } }

export default async function RunDetailPage({ params }: PageProps) {
  const run = await api.runDetail(params.runId).catch(() => null);
  if (!run) notFound();

  const passedResults = run.results.filter((r) => r.status === 'pass').length;
  const failedResults = run.results.filter((r) => r.status === 'fail').length;
  const durationMs =
    run.completedAt && run.startedAt
      ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
      : null;
  const failedFlows = run.flows.filter((f) => f.status === 'failed').length;

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-[12px] text-muted mb-4">
        <Link href="/" className="hover:text-ink transition-colors">Dashboard</Link>
        <ChevronRight size={12} />
        <Link href="/runs" className="hover:text-ink transition-colors">Runs</Link>
        <ChevronRight size={12} />
        <span className="text-ink font-mono">{shortId(run.id)}</span>
      </nav>

      {/* Header */}
      <header className="flex items-baseline justify-between mb-5 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={run.status as any} />
            {run.gitBranch && (
              <code className="font-mono text-[12px] text-muted">
                {run.gitBranch}
                {run.gitCommit ? <span>@{run.gitCommit.slice(0, 7)}</span> : ''}
              </code>
            )}
          </div>
          <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink mb-1">
            Run
          </h1>
          <div className="font-mono text-[11px] text-muted">
            {formatAbsolute(run.startedAt)} · {formatDuration(durationMs)} · env {run.environment}
          </div>
        </div>

        <button
          type="button"
          disabled
          title="Configure an LLM in your .env (WATSONX_*, OPENAI_API_KEY, or ANTHROPIC_API_KEY) to enable AI report generation"
          className="px-3 py-1.5 text-[12px] font-medium text-muted bg-white border border-border rounded cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <FileText size={13} />
          Generate report
        </button>
      </header>

      {/* Stat strip */}
      <section className="grid grid-cols-4 gap-3 mb-6">
        <StatTile label="Contracts" value={run.totalContracts} />
        <StatTile label="Passed" value={passedResults} accent="#059669" />
        <StatTile label="Failed" value={failedResults} accent={failedResults > 0 ? '#DC2626' : undefined} />
        <StatTile
          label="Flows"
          value={`${run.flows.length - failedFlows}/${run.flows.length || 0}`}
          accent={failedFlows > 0 ? '#DC2626' : run.flows.length > 0 ? '#059669' : undefined}
        />
      </section>

      {/* Flows section first if any */}
      {run.flows.length > 0 && (
        <section className="bg-card border border-border rounded overflow-hidden mb-5">
          <header className="px-4 py-2.5 border-b border-border bg-zebra">
            <h2 className="text-[12px] font-medium text-ink">
              Flows · {run.flows.length}
            </h2>
          </header>
          <ul className="divide-y divide-border">
            {run.flows.map((flow) => (
              <FlowRow key={flow.id} flow={flow} />
            ))}
          </ul>
        </section>
      )}

      {/* Contract results table */}
      <section className="bg-card border border-border rounded overflow-hidden">
        <header className="px-4 py-2.5 border-b border-border bg-zebra">
          <h2 className="text-[12px] font-medium text-ink">
            Contracts · {run.results.length}
          </h2>
        </header>
        <div className="grid grid-cols-[80px_minmax(0,1fr)_140px_120px] gap-3 px-4 py-2 border-b border-border text-[10px] uppercase tracking-wider text-label font-medium">
          <div>Status</div>
          <div>Contract</div>
          <div>Component</div>
          <div className="text-right">Duration</div>
        </div>
        <ul className="divide-y divide-border">
          {run.results.map((r) => (
            <ContractRow key={r.id} result={r} />
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */

function StatTile({ label, value, accent }: {
  label: string; value: number | string; accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded px-4 py-3">
      <div className="text-[10px] text-muted uppercase tracking-wider font-medium mb-2">{label}</div>
      <div
        className="font-fraunces text-[28px] leading-none tracking-tighter"
        style={{ color: accent ?? '#0F172A' }}
      >
        {value}
      </div>
    </div>
  );
}

function FlowRow({ flow }: { flow: FlowWithSteps }) {
  const passed = flow.steps.filter((s) => s.status === 'passed').length;
  const failedStep = flow.steps.find((s) => s.status === 'failed');
  return (
    <li className="grid grid-cols-[140px_minmax(0,1fr)_100px_80px_60px] gap-3 px-4 py-2.5 hover:bg-zebra items-center transition-colors">
      <div className="font-mono text-[12px] text-ink truncate">{flow.name}</div>
      <div className="text-[11px] text-muted truncate">
        {failedStep
          ? `Failed at step ${failedStep.stepIndex + 1}: ${failedStep.errorMessage ?? failedStep.kind}`
          : `${flow.steps.length} steps passed`}
      </div>
      <div><StatusBadge status={flow.status} /></div>
      <div className="font-mono text-[11px] text-muted tabular-nums text-right">
        {passed}/{flow.steps.length}
      </div>
      <div className="text-right">
        <Link
          href={`/flows/${flow.name}`}
          className="text-[11px] text-terracotta hover:underline"
        >
          view
        </Link>
      </div>
    </li>
  );
}

function ContractRow({ result }: { result: ContractResult }) {
  const passed = result.status === 'pass';
  const durMs =
    new Date(result.completedAt).getTime() - new Date(result.startedAt).getTime();
  return (
    <li className="grid grid-cols-[80px_minmax(0,1fr)_140px_120px] gap-3 px-4 py-2 hover:bg-zebra transition-colors items-center">
      <StatusBadge status={passed ? 'passed' : 'failed'} />
      <div className="min-w-0">
        <div className="font-medium text-[12px] text-ink truncate">{result.contractName}</div>
        {result.errorMessage && (
          <div className="text-[11px] text-[#991B1B] truncate">{result.errorMessage}</div>
        )}
      </div>
      <div className="font-mono text-[11px] text-muted truncate">{result.componentName}</div>
      <div className="font-mono text-[11px] text-muted tabular-nums text-right">
        {formatDuration(durMs)}
      </div>
    </li>
  );
}
