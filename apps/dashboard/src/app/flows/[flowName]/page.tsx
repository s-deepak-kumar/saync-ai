import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  MousePointerClick,
  Type,
  ListChecks,
  Eye,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { api, type FlowWithSteps, type FlowStepResult, type FlowStepKind } from '@/lib/api';
import { formatRelative, formatAbsolute, formatDuration, shortId } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

interface PageProps { params: { flowName: string } }

const KIND_ICON: Record<FlowStepKind, LucideIcon> = {
  interact: MousePointerClick,
  fill:     Type,
  select:   ListChecks,
  expect:   Eye,
  wait:     Clock,
};

const KIND_LABEL: Record<FlowStepKind, string> = {
  interact: 'Click',
  fill:     'Fill',
  select:   'Select',
  expect:   'Expect',
  wait:     'Wait',
};

export default async function FlowDetailPage({ params }: PageProps) {
  const flowName = decodeURIComponent(params.flowName);
  const allFlows = await api.flowSummaries().catch(() => []);
  const latest = allFlows.find((f) => f.name === flowName);
  if (!latest) notFound();

  const flow = await api.flow(latest.id).catch(() => null);
  if (!flow) notFound();

  const passed = flow.steps.filter((s) => s.status === 'passed').length;
  const failed = flow.steps.find((s) => s.status === 'failed');

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <nav className="flex items-center gap-1 text-[12px] text-muted mb-4">
        <Link href="/" className="hover:text-ink transition-colors">Dashboard</Link>
        <ChevronRight size={12} />
        <Link href="/flows" className="hover:text-ink transition-colors">Flows</Link>
        <ChevronRight size={12} />
        <span className="text-ink font-mono">{flowName}</span>
      </nav>

      {/* Header */}
      <header className="flex items-baseline justify-between mb-5 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={flow.status} />
            <span className="font-mono text-[11px] text-muted">
              {passed}/{flow.steps.length} steps passed
            </span>
            <span className="font-mono text-[11px] text-muted">
              · {formatDuration(flow.durationMs)}
            </span>
          </div>
          <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink mb-1">
            {flowName}
          </h1>
          <div className="font-mono text-[11px] text-muted">
            Last run {formatRelative(flow.startedAt)} · {formatAbsolute(flow.startedAt)}
          </div>
        </div>
        <Link
          href={`/runs/${flow.runId}`}
          className="text-[12px] text-terracotta hover:underline font-medium"
        >
          View run #{shortId(flow.runId)} →
        </Link>
      </header>

      {/* Step timeline */}
      <section className="bg-card border border-border rounded overflow-hidden">
        <header className="px-4 py-2.5 border-b border-border bg-zebra">
          <h2 className="text-[12px] font-medium text-ink">Step timeline</h2>
        </header>
        <ol className="divide-y divide-border">
          {flow.steps.map((step, i) => (
            <StepRow key={step.id} step={step} index={i} isLast={i === flow.steps.length - 1} />
          ))}
        </ol>
      </section>

      {failed?.screenshot && (
        <section className="mt-5 bg-card border border-border rounded overflow-hidden">
          <header className="px-4 py-2.5 border-b border-border bg-zebra">
            <h2 className="text-[12px] font-medium text-ink">
              Screenshot at failure (step {failed.stepIndex + 1})
            </h2>
          </header>
          <div className="p-4">
            <img
              src={`data:image/png;base64,${failed.screenshot}`}
              alt={`Flow failure at step ${failed.stepIndex + 1}`}
              className="rounded border border-border max-w-full"
            />
          </div>
        </section>
      )}
    </div>
  );
}

function StepRow({ step, index, isLast }: {
  step: FlowStepResult; index: number; isLast: boolean;
}) {
  const Icon = KIND_ICON[step.kind];
  const accent =
    step.status === 'passed' ? '#059669'
    : step.status === 'failed' ? '#DC2626'
    : '#94A3B8';
  return (
    <li className="grid grid-cols-[40px_28px_minmax(0,1fr)_120px] gap-3 px-4 py-3 items-center relative">
      <div className="relative flex justify-center">
        <span
          className="w-3 h-3 rounded-full border-2 bg-white z-10"
          style={{ borderColor: accent }}
        />
        {!isLast && (
          <span
            className="absolute left-1/2 -translate-x-1/2 top-1/2 w-0.5 h-[200%]"
            style={{ backgroundColor: '#E2E8F0' }}
          />
        )}
      </div>
      <div className="flex justify-center text-muted">
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <div className="font-medium text-[12px] text-ink">
          {KIND_LABEL[step.kind]}{' '}
          <span className="text-muted font-mono text-[11px]">step {index + 1}</span>
        </div>
        {step.errorMessage && (
          <div className="text-[11px] text-[#991B1B] truncate mt-0.5">{step.errorMessage}</div>
        )}
      </div>
      <div className="text-right">
        <StatusBadge status={step.status} />
      </div>
    </li>
  );
}
