import Link from 'next/link';
import { ChevronRight, Terminal, Sparkles, Wrench, BookOpen } from 'lucide-react';
import {
  api,
  issueSlug,
  type Stats,
  type Run,
  type Issue,
  type FlowSummary,
} from '@/lib/api';
import { formatRelative, formatDuration, formatPercent } from '@/lib/format';
import { sortBySeverity, SEVERITY_TOKEN } from '@/lib/severity';
import SeverityPill from '@/components/SeverityPill';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

interface PageData {
  stats: Stats | null;
  runs: Run[];
  issues: Issue[];
  flows: FlowSummary[];
  criticalCount: number;
  error: string | null;
}

async function loadPage(): Promise<PageData> {
  try {
    const [stats, runs, openIssues, flows] = await Promise.all([
      api.stats(),
      api.recentRuns(5),
      api.issues({ status: 'open' }),
      api.flowSummaries().catch(() => [] as FlowSummary[]),
    ]);
    const criticalCount = openIssues.filter((i) => i.severity === 'critical').length;
    return {
      stats,
      runs,
      issues: sortBySeverity(openIssues).slice(0, 5),
      flows,
      criticalCount,
      error: null,
    };
  } catch (err) {
    return {
      stats: null, runs: [], issues: [], flows: [],
      criticalCount: 0,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

export default async function DashboardHome() {
  const { stats, runs, issues, flows, criticalCount, error } = await loadPage();
  const lastRun = runs[0];
  // True onboarding state — no data of any kind across any table.
  const isEmpty =
    !error &&
    runs.length === 0 &&
    issues.length === 0 &&
    flows.length === 0 &&
    (stats?.totalContracts ?? 0) === 0;

  return (
    <div className="px-8 py-6 max-w-[1400px]">
      <header className="flex items-baseline justify-between mb-6 pb-5 border-b border-border">
        <div>
          <h1 className="font-fraunces text-[28px] leading-none tracking-tighter text-ink mb-2">
            Dashboard
          </h1>
          <div className="flex items-center gap-3 text-[12px] text-muted">
            {lastRun ? (
              <span>Last run {formatRelative(lastRun.startedAt)}</span>
            ) : (
              <span>No runs yet</span>
            )}
          </div>
        </div>
        <Link
          href="/setup"
          className="px-3 py-1.5 text-[12px] font-medium text-ink bg-white border border-border rounded hover:bg-rowHover transition-colors"
        >
          Install snippet
        </Link>
      </header>

      {error && (
        <div className="mb-6 border border-sevCriticalBg bg-[#FEF2F2] rounded-md px-4 py-3">
          <p className="text-[12px] text-[#991B1B] font-mono">{error}</p>
        </div>
      )}

      {isEmpty && <OnboardingHero />}

      {!isEmpty && (
        <>
      <section className="grid grid-cols-4 gap-3 mb-8">
        <StatTile
          label="Open issues"
          value={stats?.openIssues ?? 0}
          accent={criticalCount > 0 ? SEVERITY_TOKEN.critical.fg : undefined}
          sublabel={criticalCount > 0 ? `${criticalCount} critical` : undefined}
        />
        <StatTile label="Total contracts" value={stats?.totalContracts ?? 0} />
        <StatTile
          label="Pass rate"
          value={stats ? formatPercent(stats.passRate) : '—'}
          accent={stats && stats.passRate >= 0.9 ? '#059669' : stats && stats.passRate < 0.7 ? '#DC2626' : undefined}
        />
        <StatTile label="Last run" value={stats?.lastRunDuration ?? '—'} />
      </section>

      <div className="grid grid-cols-[1.4fr_1fr] gap-6">
        <Card title="Recent runs" href="/runs">
          {runs.length === 0 ? (
            <Empty title="No runs yet" body="Run the agent against your app." />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-label">
                  <th className="text-left font-medium pb-2 pr-2">Run</th>
                  <th className="text-left font-medium pb-2 pr-2">Status</th>
                  <th className="text-left font-medium pb-2 pr-2">Results</th>
                  <th className="text-right font-medium pb-2">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run, i) => (
                  <tr key={run.id} className="hover:bg-zebra transition-colors">
                    <td className="py-2 pr-2">
                      <Link
                        href={`/runs/${run.id}`}
                        className="font-medium text-ink hover:text-terracotta"
                      >
                        #{runs.length - i}
                      </Link>
                      {run.gitBranch && (
                        <span className="ml-2 font-mono text-[11px] text-muted">
                          {run.gitBranch}
                          {run.gitCommit ? `@${run.gitCommit.slice(0, 7)}` : ''}
                        </span>
                      )}
                      <div className="text-[11px] text-muted font-mono">
                        {formatRelative(run.startedAt)}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <StatusBadge status={run.status as any} />
                    </td>
                    <td className="py-2 pr-2 font-mono text-[12px] tabular-nums">
                      <span className="text-statusPass">{run.passedContracts}p</span>
                      {' / '}
                      <span className={run.failedContracts > 0 ? 'text-statusFail' : 'text-muted'}>
                        {run.failedContracts}f
                      </span>
                    </td>
                    <td className="py-2 font-mono text-[12px] text-muted tabular-nums text-right">
                      {formatDuration(
                        run.completedAt && run.startedAt
                          ? new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
                          : null,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Top open issues" href="/issues">
          {issues.length === 0 ? (
            <Empty title="No open issues" body="All contracts are passing." />
          ) : (
            <ul className="divide-y divide-border">
              {issues.map((issue) => (
                <li key={issue.id} className="py-2.5">
                  <Link
                    href={`/issues/${issueSlug(issue.contractName)}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <SeverityPill severity={issue.severity} variant="dot" />
                      <span className="text-[13px] text-ink font-medium truncate group-hover:text-terracotta">
                        {issue.componentName}
                      </span>
                      <span className="font-mono text-[10px] text-muted tabular-nums ml-auto">
                        {issue.occurrenceCount}×
                      </span>
                    </div>
                    <div className="text-[11px] text-muted truncate pl-3">
                      {issue.errorMessage}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {flows.length > 0 && (
        <div className="mt-6">
          <Card title="Flows" href="/flows">
            <table className="w-full text-[13px]">
              <tbody className="divide-y divide-border">
                {flows.map((f) => (
                  <tr key={f.name} className="hover:bg-zebra transition-colors">
                    <td className="py-2 pr-2 font-medium text-ink">{f.name}</td>
                    <td className="py-2 pr-2">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-2 pr-2 font-mono text-[11px] text-muted tabular-nums">
                      {f.passedRuns}/{f.totalRuns} pass
                    </td>
                    <td className="py-2 font-mono text-[11px] text-muted">
                      {formatRelative(f.startedAt)}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/flows/${f.name}`}
                        className="text-[12px] text-terracotta hover:underline"
                      >
                        view
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
}

function OnboardingHero() {
  return (
    <section className="bg-card border border-border rounded-lg p-8">
      <div className="max-w-[640px]">
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-terracotta font-mono mb-3">
          <Sparkles size={11} />
          You're set up — almost
        </div>
        <h2 className="font-fraunces text-[26px] leading-tight tracking-tighter text-ink mb-2">
          Run your first verification.
        </h2>
        <p className="text-[13.5px] text-muted leading-relaxed mb-5 max-w-[560px]">
          Saync is connected to your app, but nothing's been verified yet. Wrap
          a button or a form with the SDK, then trigger a run — the agent will
          drive every declared contract and surface failures right here.
        </p>

        <div className="space-y-4">
          <Step n={1} icon={<Wrench size={13} />} title="Wrap one interactive element">
            <pre className="bg-codeBg text-white/90 rounded px-3 py-2.5 font-mono text-[11.5px] leading-relaxed overflow-x-auto whitespace-pre">
{`import { SayncButton } from 'saync-web/react';

<SayncButton
  name="add-to-cart"
  expects={{ onClick: { apiCall: { method: 'POST', url: '/api/cart', expectedStatus: 200 } } }}
  onClick={addToCart}
>
  Add to cart
</SayncButton>`}
            </pre>
            <p className="mt-1.5 text-[11.5px] text-muted">
              Don't forget to add <code className="font-mono bg-zebra px-1 py-0.5 rounded">&lt;Saync.Provider mode=&quot;log&quot;&gt;</code> at the root of your app.
            </p>
          </Step>

          <Step n={2} icon={<Terminal size={13} />} title="Trigger the agent">
            <pre className="bg-codeBg text-white/90 rounded px-3 py-2.5 font-mono text-[11.5px] leading-relaxed">
{`# in another terminal, from your project root
npm run saync:run`}
            </pre>
            <p className="mt-1.5 text-[11.5px] text-muted">
              Or in local mode (default): just save the file and the watcher re-runs the agent automatically.
            </p>
          </Step>

          <Step n={3} icon={<BookOpen size={13} />} title="Need more context?">
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
              <Link href="/setup" className="text-terracotta font-medium hover:underline">
                Full install instructions →
              </Link>
              <span className="text-rule">·</span>
              <a
                href="/saync-llm.md"
                download="saync-llm.md"
                className="text-ink hover:underline"
              >
                Download the LLM context (.md)
              </a>
              <span className="text-rule">·</span>
              <Link href="/settings" className="text-ink hover:underline">
                Settings
              </Link>
            </div>
          </Step>
        </div>
      </div>
    </section>
  );
}

function Step({
  n, icon, title, children,
}: { n: number; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 items-start">
      <div className="shrink-0 w-7 h-7 rounded-full bg-zebra border border-border flex items-center justify-center text-terracotta">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="font-mono text-[10px] text-label">0{n}</span>
          <h3 className="text-[13px] font-medium text-ink">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatTile({
  label, value, accent, sublabel,
}: { label: string; value: number | string; accent?: string; sublabel?: string }) {
  return (
    <div className="bg-card border border-border rounded px-4 py-3">
      <div className="text-[10px] text-muted uppercase tracking-wider font-medium mb-2">
        {label}
      </div>
      <div
        className="font-fraunces text-[32px] leading-none tracking-tighter"
        style={{ color: accent ?? '#0F172A' }}
      >
        {value}
      </div>
      {sublabel && (
        <div className="text-[11px] mt-1.5 font-medium" style={{ color: accent ?? '#64748B' }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

function Card({
  title, href, children,
}: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <h2 className="text-[13px] font-medium text-ink">{title}</h2>
        {href && (
          <Link href={href} className="text-[11px] text-muted hover:text-ink flex items-center gap-0.5 transition-colors">
            View all <ChevronRight size={11} />
          </Link>
        )}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-6">
      <p className="text-[13px] font-medium text-ink mb-1">{title}</p>
      <p className="text-[12px] text-muted">{body}</p>
    </div>
  );
}
