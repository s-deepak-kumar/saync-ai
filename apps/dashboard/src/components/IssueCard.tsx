import Link from "next/link";
import SeverityPill from "./SeverityPill";
import type { Issue } from "@/lib/reports";

interface IssueCardProps {
  issue: Issue;
}

export default function IssueCard({ issue }: IssueCardProps) {
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="block bg-card border border-border rounded-lg p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <SeverityPill severity={issue.severity} />
        <span className="text-xs text-muted font-mono">{issue.occurrences}x</span>
      </div>

      <h3 className="font-fraunces text-lg font-medium mb-2 leading-tight">
        {issue.title}
      </h3>

      <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2">
        {issue.description}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted bg-background px-2 py-1 rounded">
          {issue.filePath}
        </span>
        <span className="text-xs text-terracotta font-medium">View →</span>
      </div>
    </Link>
  );
}

// Made with Bob
