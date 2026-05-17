import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, ExternalLink } from 'lucide-react';
import { api, type IssueDetail, type IssueOccurrence } from '@/lib/api';
import { formatRelative, formatAbsolute, shortId } from '@/lib/format';
import { SEVERITY_TOKEN } from '@/lib/severity';
import SeverityPill from '@/components/SeverityPill';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { issueId: string };
}

async function loadIssue(id: string): Promise<IssueDetail | null> {
  try {
    return await api.issueDetail(id);
  } catch {
    return null;
  }
}

function titleFor(issue: IssueDetail): { component: string; tail: string } {
  const tail = issue.contractName.startsWith(issue.componentName + '.')
    ? issue.contractName.slice(issue.componentName.length + 1)
    : issue.contractName;
  return { component: issue.componentName, tail };
}

export default async function IssueDetailPage({ params }: PageProps) {
  const issue = await loadIssue(params.issueId);
  if (!issue) notFound();

  const { component, tail } = titleFor(issue);
  const latest = issue.occurrences[0] ?? null;
  const file = latest?.resultFilePath ?? null;
  const line = latest?.resultLineNumber ?? null;
  const stack = latest?.resultStackTrace ?? null;
  const expected = latest?.resultExpectedValue ?? null;
  const observed = latest?.resultObservedValue ?? null;
  const sev = SEVERITY_TOKEN[issue.severity];

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <nav className="flex items-center gap-1 text-[12px] text-muted mb-4">
        <Link href="/" className="hover:text-ink transition-colors">Dashboard</Link>
        <ChevronRight size={12} />
        <Link href="/issues" className="hover:text-ink transition-colors">Issues</Link>
        <ChevronRight size={12} />
        <span className="text-ink truncate">{component} · {tail}</span>
      </nav>

      <header
        className="bg-card border-l-4 border border-border rounded p-5 mb-5"
        style={{ borderLeftColor: sev.strip }}
      >
        <div className="flex items-center gap-3 mb-3">
          <SeverityPill severity={issue.severity} />
          <StatusBadge status={issue.status === 'resolved' ? 'completed' : 'failed'} />
          <span className="font-mono text-[11px] text-muted tabular-nums">
            {issue.occurrenceCount}× seen
          </span>
          <span className="font-mono text-[11px] text-muted ml-auto">
            {shortId(issue.id)}
          </span>
        </div>
        <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink mb-2">
          {component} <span className="text-muted">·</span> <span className="font-mono">{tail}</span>
        </h1>
        <div className="font-mono text-[11px] text-muted flex flex-wrap gap-x-4 gap-y-0.5">
          <span><span className="text-label">first</span> {formatRelative(issue.firstSeenAt)}</span>
          <span><span className="text-label">last</span> {formatRelative(issue.lastSeenAt)}</span>
        </div>
      </header>

      <div className="grid grid-cols-[2fr_1.5fr] gap-5 mb-5">
        <div className="space-y-4">
          <section className="bg-card border border-border rounded p-5">
            <div className="text-[10px] uppercase tracking-wider text-label font-medium mb-2">
              Error
            </div>
            <p className="font-mono text-[13px] text-[#991B1B] leading-relaxed">
              {issue.errorMessage}
            </p>
          </section>

          {(expected || observed) && (
            <ExpectedObserved expected={expected} observed={observed} fallbackError={issue.errorMessage} />
          )}

          {stack && (
            <section className="bg-card border border-border rounded overflow-hidden">
              <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-zebra">
                <div className="text-[10px] uppercase tracking-wider text-label font-medium">
                  Stack trace
                </div>
                <div className="font-mono text-[10px] text-label">
                  {stack.split('\n').length} frames
                </div>
              </header>
              <pre className="p-4 text-[11px] font-mono leading-relaxed text-ink overflow-x-auto">
{stack}
              </pre>
            </section>
          )}

          <section className="bg-card border border-dashed border-border rounded p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[10px] uppercase tracking-wider text-label font-medium">
                AI analysis
              </div>
              <span className="text-[10px] text-label">·</span>
              <span className="text-[10px] text-label">BYOK LLM</span>
            </div>
            <p className="text-[12px] text-muted leading-relaxed">
              Configure an LLM provider in your <code className="font-mono text-[11px]">.env</code> (WATSONX_*, OPENAI_API_KEY, or ANTHROPIC_API_KEY) to generate a root-cause + suggested-fix analysis here.
            </p>
          </section>
        </div>

        <div className="space-y-4">
          {file && (
            <section className="bg-card border border-border rounded p-5">
              <div className="text-[10px] uppercase tracking-wider text-label font-medium mb-2">
                Source
              </div>
              <div className="font-mono text-[12px] text-ink break-all">
                {file}
                {line != null && <span className="text-muted">:{line}</span>}
              </div>
            </section>
          )}

          <section className="bg-card border border-border rounded overflow-hidden">
            <header className="px-4 py-2 border-b border-border bg-zebra">
              <div className="text-[10px] uppercase tracking-wider text-label font-medium">
                Timeline · {issue.occurrenceCount} occurrence{issue.occurrenceCount === 1 ? '' : 's'}
              </div>
            </header>
            <Timeline occurrences={issue.occurrences} />
          </section>
        </div>
      </div>
    </div>
  );
}

function ExpectedObserved({
  expected, observed, fallbackError,
}: { expected: string | null; observed: string | null; fallbackError: string }) {
  if (!expected || !observed) {
    const match = fallbackError.match(/expected\s+(.+?),?\s+(?:observed|got|received)\s+(.+?)[.!]?$/i);
    if (match) {
      expected = match[1].trim();
      observed = match[2].trim();
    }
  }
  if (!expected || !observed) return null;

  return (
    <section className="bg-card border border-border rounded overflow-hidden">
      <header className="px-4 py-2 border-b border-border bg-zebra">
        <div className="text-[10px] uppercase tracking-wider text-label font-medium">
          Expected vs observed
        </div>
      </header>
      <div className="divide-y divide-border">
        <DiffRow label="Expected" value={expected} bg="#F0FDF4" fg="#166534" dot="#059669" />
        <DiffRow label="Observed" value={observed} bg="#FEF2F2" fg="#991B1B" dot="#DC2626" />
      </div>
    </section>
  );
}

function DiffRow({ label, value, bg, fg, dot }: {
  label: string; value: string; bg: string; fg: string; dot: string;
}) {
  return (
    <div className="grid grid-cols-[100px_1fr] items-center px-4 py-3 gap-3">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />
        <span className="text-[10px] uppercase tracking-wider text-label font-medium">
          {label}
        </span>
      </div>
      <code
        className="font-mono text-[12px] leading-relaxed px-3 py-2 rounded"
        style={{ backgroundColor: bg, color: fg }}
      >
        {value}
      </code>
    </div>
  );
}

function Timeline({ occurrences }: { occurrences: IssueOccurrence[] }) {
  if (occurrences.length === 0) {
    return <div className="p-4 text-center text-[12px] text-muted">No occurrences recorded.</div>;
  }
  return (
    <ul className="divide-y divide-border">
      {occurrences.map((occ, i) => (
        <li key={occ.id} className="px-4 py-2.5 hover:bg-zebra transition-colors">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: i === 0 ? '#D4502A' : '#CBD5E1' }}
            />
            <span className="text-[12px] text-ink font-medium">
              {formatRelative(occ.occurredAt)}
            </span>
            <span className="font-mono text-[10px] text-muted ml-auto">
              {formatAbsolute(occ.occurredAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted pl-3.5">
            {occ.runGitBranch && (
              <code className="font-mono">
                {occ.runGitBranch}
                {occ.runGitCommit ? `@${occ.runGitCommit.slice(0, 7)}` : ''}
              </code>
            )}
            {occ.runEnvironment && <span className="font-mono">{occ.runEnvironment}</span>}
            <Link
              href={`/runs/${occ.runId}`}
              className="text-terracotta hover:underline flex items-center gap-0.5 ml-auto"
            >
              run <ExternalLink size={10} />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
