import Link from "next/link";
import IssueCard from "@/components/IssueCard";
import { getProjectStats, getRecentRuns, getRecentIssues } from "@/lib/reports";

export default function HomePage() {
  const stats = getProjectStats();
  const recentRuns = getRecentRuns();
  const recentIssues = getRecentIssues();

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-4">
        <span>Projects</span>
        <span className="mx-2">/</span>
        <span className="text-ink">Demo App</span>
      </div>

      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-fraunces text-5xl font-medium tracking-tighter mb-2">
            Demo App
          </h1>
          <p className="text-muted">
            <span className="font-mono text-sm">http://localhost:5173</span>
            <span className="mx-3">•</span>
            <span className="text-sm">Last run {formatRelativeTime(new Date(Date.now() - 1000 * 60 * 30))}</span>
          </p>
        </div>
        <button className="bg-ink text-white px-6 py-2.5 rounded-lg font-medium hover:bg-ink/90 transition-colors">
          Run Saync
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Open Issues</div>
          <div className="font-fraunces text-5xl font-medium tracking-tighter">
            {stats.openIssues}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Total Contracts</div>
          <div className="font-fraunces text-5xl font-medium tracking-tighter">
            {stats.totalContracts}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Pass Rate</div>
          <div className="font-fraunces text-5xl font-medium tracking-tighter">
            {stats.passRate}%
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Last Run</div>
          <div className="font-fraunces text-5xl font-medium tracking-tighter">
            {stats.lastRunDuration}
          </div>
        </div>
      </div>

      {/* Recent Runs */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-fraunces text-2xl font-medium">Recent runs</h2>
          <Link href="/runs" className="text-sm text-terracotta font-medium hover:underline">
            View all →
          </Link>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                  Run
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                  Viewports
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                  Results
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                  Duration
                </th>
                <th className="text-right text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentRuns.map((run) => (
                <tr key={run.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium">{run.title}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {formatRelativeTime(new Date(run.timestamp))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {run.viewports.map((viewport) => (
                        <span
                          key={viewport}
                          className="text-xs bg-background px-2 py-1 rounded font-medium"
                        >
                          {viewport}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm">
                      <span className="text-green-600">{run.passCount} passed</span>
                      <span className="mx-2 text-muted">•</span>
                      <span className="text-red-600">{run.failCount} failed</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-muted">{run.duration}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/runs/${run.id}`}
                      className="text-sm text-terracotta font-medium hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Open Issues */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-fraunces text-2xl font-medium">Open issues</h2>
          <Link href="/issues" className="text-sm text-terracotta font-medium hover:underline">
            View all →
          </Link>
        </div>

        {recentIssues.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="font-fraunces text-xl font-medium mb-2">No open issues</h3>
            <p className="text-muted">All contracts are passing. Great work!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {recentIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// Made with Bob
