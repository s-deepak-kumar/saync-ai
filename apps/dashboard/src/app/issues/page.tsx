import Link from "next/link";
import SeverityPill from "@/components/SeverityPill";
import { getAllIssues } from "@/lib/reports";

export default function IssuesListPage() {
  const allIssues = getAllIssues();
  const openIssues = allIssues.filter((issue) => issue.status === "open");
  const resolvedIssues = allIssues.filter((issue) => issue.status === "resolved");

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">Projects</Link>
        <span className="mx-2">/</span>
        <Link href="/" className="hover:text-ink">Demo App</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Issues</span>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-fraunces text-5xl font-medium tracking-tighter mb-2">
          Issues
        </h1>
        <p className="text-muted">
          All detected issues across your application
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button className="px-4 py-2 font-medium border-b-2 border-ink -mb-px">
          All
          <span className="ml-2 text-xs bg-background px-2 py-0.5 rounded-full">
            {allIssues.length}
          </span>
        </button>
        <button className="px-4 py-2 font-medium text-muted hover:text-ink border-b-2 border-transparent -mb-px">
          Functional
          <span className="ml-2 text-xs bg-background px-2 py-0.5 rounded-full">
            {allIssues.filter((i) => i.severity === "critical" || i.severity === "high").length}
          </span>
        </button>
        <button className="px-4 py-2 font-medium text-muted hover:text-ink border-b-2 border-transparent -mb-px">
          API
          <span className="ml-2 text-xs bg-background px-2 py-0.5 rounded-full">
            1
          </span>
        </button>
        <button className="px-4 py-2 font-medium text-muted hover:text-ink border-b-2 border-transparent -mb-px">
          Layout
          <span className="ml-2 text-xs bg-background px-2 py-0.5 rounded-full">
            0
          </span>
        </button>
        <button className="px-4 py-2 font-medium text-muted hover:text-ink border-b-2 border-transparent -mb-px">
          Failing
          <span className="ml-2 text-xs bg-background px-2 py-0.5 rounded-full text-red-600">
            {openIssues.length}
          </span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search issues..."
          className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-terracotta/20"
        />
        <button className="px-4 py-2 border border-border rounded-lg hover:bg-background transition-colors">
          Filter
        </button>
      </div>

      {/* Issues Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Severity
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Issue
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Occurrences
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                File
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                First Seen
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Status
              </th>
              <th className="text-right text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allIssues.map((issue) => (
              <tr key={issue.id} className="hover:bg-background/50 transition-colors">
                <td className="px-6 py-4">
                  <SeverityPill severity={issue.severity} />
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium max-w-md">{issue.title}</div>
                  <div className="text-xs text-muted mt-1 line-clamp-1">
                    {issue.description}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-sm">{issue.occurrences}x</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-mono text-muted bg-background px-2 py-1 rounded">
                    {issue.filePath}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted">
                    {formatRelativeTime(new Date(issue.firstSeen))}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      issue.status === "open"
                        ? "bg-red-100 text-red-800"
                        : issue.status === "resolved"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {issue.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/issues/${issue.id}`}
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

      {allIssues.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="font-fraunces text-xl font-medium mb-2">No issues found</h3>
          <p className="text-muted">All contracts are passing. Great work!</p>
        </div>
      )}
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
