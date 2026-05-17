'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { RunDetail, FlowWithSteps, ContractResult, RunStatus } from '@/lib/api';
import { useEventStream } from '@/lib/useEventStream';
import { formatDuration } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

interface Props {
  initialRun: RunDetail;
}

/**
 * Client wrapper that hydrates from the SSE stream:
 *   - if the run is `running` / `pending` when the page loads, subscribe
 *     to /api/runs/:id/stream and append every `result` event to the table
 *   - if it's already `completed`/`failed`, the stream replays the same
 *     rows we already have, but no real-time appends will fire — works
 *     either way
 *
 * The status badge, stat tiles, flows section, and contracts table all
 * live here so each can update in real time.
 */
export default function LiveRunDetail({ initialRun }: Props) {
  // Only open the SSE stream if the run might still be in flight. Once it
  // ends the server closes the stream anyway, but skipping the connect on
  // already-terminal runs avoids a useless EventSource handshake.
  const isLive =
    initialRun.status === 'running' || initialRun.status === 'pending';
  const stream = useEventStream(isLive ? initialRun.id : null);

  // Merge: server-provided results + anything new from the stream. Dedup
  // by id (the hook is already idempotent on its side, but doing it here
  // too is cheap and protects against ordering quirks).
  const results = useMemo<ContractResult[]>(() => {
    if (!isLive) return initialRun.results;
    const seen = new Set(initialRun.results.map((r) => r.id));
    const extras = stream.results.filter((r) => !seen.has(r.id));
    return [...initialRun.results, ...extras];
  }, [initialRun.results, isLive, stream.results]);

  // Live status takes precedence over the snapshot status the server
  // rendered with — the SSE 'complete' event flips this when the run ends.
  const status: RunStatus = stream.status ?? (initialRun.status as RunStatus);
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const total = stream.progress?.total ?? initialRun.totalContracts;
  const failedFlows = initialRun.flows.filter((f) => f.status === 'failed').length;
  const reconnecting = isLive && status === 'running' && !stream.connected;

  return (
    <>
      {/* Status row — sits where the breadcrumb-adjacent metadata lived */}
      <div className="flex items-center gap-3 mb-2">
        <StatusBadge status={status as any} />
        {isLive && status === 'running' && (
          <LivePill connected={stream.connected} />
        )}
        {reconnecting && (
          <span className="text-[11px] text-muted font-mono">reconnecting…</span>
        )}
      </div>

      <section className="grid grid-cols-4 gap-3 mb-6">
        <StatTile label="Contracts" value={total} />
        <StatTile label="Passed" value={passed} accent="#059669" />
        <StatTile
          label="Failed"
          value={failed}
          accent={failed > 0 ? '#DC2626' : undefined}
        />
        <StatTile
          label="Flows"
          value={`${initialRun.flows.length - failedFlows}/${initialRun.flows.length || 0}`}
          accent={
            failedFlows > 0
              ? '#DC2626'
              : initialRun.flows.length > 0
                ? '#059669'
                : undefined
          }
        />
      </section>

      {initialRun.flows.length > 0 && (
        <section className="bg-card border border-border rounded overflow-hidden mb-5">
          <header className="px-4 py-2.5 border-b border-border bg-zebra">
            <h2 className="text-[12px] font-medium text-ink">
              Flows · {initialRun.flows.length}
            </h2>
          </header>
          <ul className="divide-y divide-border">
            {initialRun.flows.map((flow) => (
              <FlowRow key={flow.id} flow={flow} />
            ))}
          </ul>
        </section>
      )}

      <section className="bg-card border border-border rounded overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-zebra">
          <h2 className="text-[12px] font-medium text-ink">
            Contracts · {results.length}
            {isLive && status === 'running' && total > 0 && (
              <span className="ml-2 font-mono text-[10px] text-muted">
                {results.length}/{total}
              </span>
            )}
          </h2>
          {isLive && status === 'running' && total > 0 && (
            <ProgressBar passed={passed} failed={failed} total={total} />
          )}
        </header>
        <div className="grid grid-cols-[80px_minmax(0,1fr)_140px_120px] gap-3 px-4 py-2 border-b border-border text-[10px] uppercase tracking-wider text-label font-medium">
          <div>Status</div>
          <div>Contract</div>
          <div>Component</div>
          <div className="text-right">Duration</div>
        </div>
        <ul className="divide-y divide-border">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-[12px] text-muted">
              {isLive
                ? 'Waiting for the agent to start sending results…'
                : 'No contracts ran in this run.'}
            </li>
          ) : (
            results.map((r) => <ContractRow key={r.id} result={r} />)
          )}
        </ul>
      </section>
    </>
  );
}

/* ──────────────────────────────────────────────────────────── */

function LivePill({ connected }: { connected: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-[0.1em] border"
      style={{
        backgroundColor: connected ? '#FEF2F2' : '#F8F9FA',
        color: connected ? '#B91C1C' : '#64748B',
        borderColor: connected ? '#FECACA' : '#E2E8F0',
      }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${connected ? 'animate-pulse-dot' : ''}`}
        style={{ backgroundColor: connected ? '#DC2626' : '#94A3B8' }}
      />
      Live
    </span>
  );
}

function ProgressBar({
  passed,
  failed,
  total,
}: { passed: number; failed: number; total: number }) {
  const passedPct = (passed / total) * 100;
  const failedPct = (failed / total) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="w-[120px] h-1.5 bg-border rounded overflow-hidden flex">
        <div
          className="h-full bg-statusPass transition-[width] duration-300 ease-out"
          style={{ width: `${passedPct}%` }}
        />
        <div
          className="h-full bg-statusFail transition-[width] duration-300 ease-out"
          style={{ width: `${failedPct}%` }}
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="bg-card border border-border rounded px-4 py-3">
      <div className="text-[10px] text-muted uppercase tracking-wider font-medium mb-2">
        {label}
      </div>
      <div
        className="font-fraunces text-[28px] leading-none tracking-tighter tabular-nums transition-colors duration-200"
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
      <div>
        <StatusBadge status={flow.status} />
      </div>
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
    new Date(result.completedAt).getTime() -
    new Date(result.startedAt).getTime();
  return (
    <li className="grid grid-cols-[80px_minmax(0,1fr)_140px_120px] gap-3 px-4 py-2 hover:bg-zebra transition-colors items-center animate-in-row">
      <StatusBadge status={passed ? 'passed' : 'failed'} />
      <div className="min-w-0">
        <div className="font-medium text-[12px] text-ink truncate">
          {result.contractName}
        </div>
        {result.errorMessage && (
          <div className="text-[11px] text-[#991B1B] truncate">
            {result.errorMessage}
          </div>
        )}
      </div>
      <div className="font-mono text-[11px] text-muted truncate">
        {result.componentName}
      </div>
      <div className="font-mono text-[11px] text-muted tabular-nums text-right">
        {formatDuration(durMs)}
      </div>
    </li>
  );
}
