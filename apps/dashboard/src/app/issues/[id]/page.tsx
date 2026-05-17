import Link from "next/link";
import { notFound } from "next/navigation";
import SeverityPill from "@/components/SeverityPill";
import CodeBlock from "@/components/CodeBlock";
import { getIssueById } from "@/lib/reports";

interface PageProps {
  params: {
    id: string;
  };
}

export default function IssueDetailPage({ params }: PageProps) {
  const issue = getIssueById(params.id);

  if (!issue) {
    notFound();
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-6">
        <Link href="/" className="hover:text-ink">Projects</Link>
        <span className="mx-2">/</span>
        <Link href="/" className="hover:text-ink">Demo App</Link>
        <span className="mx-2">/</span>
        <Link href="/issues" className="hover:text-ink">Issues</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{issue.title}</span>
      </div>

      {/* Main Content - Single Column, Editorial Style */}
      <article className="max-w-[880px] mx-auto">
        {/* Severity Badge */}
        <div className="mb-4">
          <SeverityPill severity={issue.severity} />
        </div>

        {/* Issue Title - Big Fraunces */}
        <h1 className="font-fraunces text-[44px] font-medium leading-tight tracking-tighter mb-6">
          {issue.title}
        </h1>

        {/* Meta Row */}
        <div className="flex items-center gap-6 text-sm mb-6 pb-6 border-b border-border">
          <div>
            <span className="text-muted">First seen:</span>{" "}
            <span className="font-medium">{formatDate(issue.firstSeen)}</span>
          </div>
          <div>
            <span className="text-muted">Occurrences:</span>{" "}
            <span className="font-medium font-mono">{issue.occurrences}x</span>
          </div>
          <div>
            <span className="text-muted">Status:</span>{" "}
            <span className="font-medium capitalize">{issue.status}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-12">
          <button className="bg-ink text-white px-5 py-2.5 rounded-lg font-medium hover:bg-ink/90 transition-colors">
            Apply Fix
          </button>
          <button className="bg-card border border-border text-ink px-5 py-2.5 rounded-lg font-medium hover:bg-background transition-colors">
            Open in IDE
          </button>
          <button className="bg-card border border-border text-ink px-5 py-2.5 rounded-lg font-medium hover:bg-background transition-colors">
            Mark Resolved
          </button>
          <button className="bg-card border border-border text-muted px-5 py-2.5 rounded-lg font-medium hover:bg-background transition-colors">
            Snooze
          </button>
        </div>

        {/* Lead Paragraph - Magazine Style */}
        <div className="mb-12 border-l-4 border-terracotta pl-6">
          <p className="font-fraunces italic text-[22px] leading-relaxed text-ink">
            {issue.description}
          </p>
        </div>

        {/* What We Expected vs What We Got */}
        <section className="mb-12">
          <h2 className="font-fraunces text-2xl font-medium mb-6">
            What we expected, what we got
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="text-xs uppercase tracking-wider text-label mb-2">
                Expected Behavior
              </div>
              <div className="font-mono text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
                {issue.expectedBehavior}
              </div>
            </div>
            <div className="p-6">
              <div className="text-xs uppercase tracking-wider text-label mb-2">
                Observed Behavior
              </div>
              <div className="font-mono text-sm text-red-700 bg-red-50 px-3 py-2 rounded">
                {issue.observedBehavior}
              </div>
            </div>
          </div>
        </section>

        {/* How to Reproduce */}
        <section className="mb-12">
          <h2 className="font-fraunces text-2xl font-medium mb-6">
            How to reproduce
          </h2>
          <div className="space-y-4">
            {issue.reproductionSteps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-terracotta/10 border border-terracotta/20 flex items-center justify-center">
                  <span className="font-fraunces text-lg font-medium text-terracotta">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-ink leading-relaxed">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Info Cells */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-label mb-2">
              First Detected
            </div>
            <div className="font-mono text-sm">{formatDate(issue.firstSeen)}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-label mb-2">
              Reproducibility
            </div>
            <div className="font-mono text-sm">{issue.reproducibility}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs uppercase tracking-wider text-label mb-2">
              Affected Viewports
            </div>
            <div className="flex gap-2 mt-2">
              {issue.affectedViewports.map((viewport) => (
                <span
                  key={viewport}
                  className="text-xs bg-background px-2 py-1 rounded font-medium"
                >
                  {viewport}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Root Cause */}
        <section className="mb-12">
          <h2 className="font-fraunces text-2xl font-medium mb-6">Root cause</h2>
          
          {/* Analyzed by Bob pill */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terracotta/10 border border-terracotta/20">
              <span className="w-2 h-2 rounded-full bg-terracotta" />
              <span className="text-xs uppercase tracking-wider font-medium text-terracotta">
                Analyzed by Bob
              </span>
            </span>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <p className="text-ink leading-relaxed mb-6">{issue.rootCause}</p>
          </div>

          {/* Code Block with Problematic Code */}
          {issue.codeSnippet && (
            <CodeBlock
              code={extractCodeFromMarkdown(issue.codeSnippet)}
              language="typescript"
              highlightLines={[5, 6, 7]}
            />
          )}
        </section>

        {/* Pull Quote */}
        <div className="my-12 py-8 border-t border-b border-border">
          <blockquote className="font-fraunces italic text-[26px] leading-relaxed text-center text-ink">
            "The async operation updates state but doesn't trigger the loading UI contract."
          </blockquote>
        </div>

        {/* Suggested Fix */}
        <section className="mb-12">
          <h2 className="font-fraunces text-2xl font-medium mb-6">Suggested fix</h2>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <p className="text-ink leading-relaxed">{issue.suggestedFix}</p>
          </div>

          {/* Code Block with Fixed Code */}
          {issue.fixedCodeSnippet && (
            <CodeBlock
              code={extractCodeFromMarkdown(issue.fixedCodeSnippet)}
              language="typescript"
              variant="success"
            />
          )}
        </section>

        {/* Bottom Actions */}
        <div className="flex gap-3 pt-8 border-t border-border">
          <button className="bg-ink text-white px-5 py-2.5 rounded-lg font-medium hover:bg-ink/90 transition-colors">
            Apply fix in IDE
          </button>
          <button className="bg-card border border-border text-ink px-5 py-2.5 rounded-lg font-medium hover:bg-background transition-colors">
            Copy fix
          </button>
          <button className="bg-card border border-border text-muted px-5 py-2.5 rounded-lg font-medium hover:bg-background transition-colors">
            Suggest different fix
          </button>
        </div>
      </article>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractCodeFromMarkdown(markdown: string): string {
  // Remove markdown code fence markers
  return markdown.replace(/```[\w]*\n?/g, "").trim();
}

// Made with Bob
