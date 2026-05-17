import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface Issue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  filePath: string;
  firstSeen: string;
  occurrences: number;
  status: "open" | "resolved" | "snoozed";
  reproducibility: string;
  affectedViewports: string[];
  expectedBehavior: string;
  observedBehavior: string;
  reproductionSteps: string[];
  rootCause: string;
  suggestedFix: string;
  codeSnippet?: string;
  fixedCodeSnippet?: string;
}

export interface TestRun {
  id: string;
  title: string;
  timestamp: string;
  duration: string;
  viewports: string[];
  passCount: number;
  failCount: number;
  totalContracts: number;
}

export interface ProjectStats {
  openIssues: number;
  totalContracts: number;
  passRate: number;
  lastRunDuration: string;
}

const REPORTS_DIR = path.join(process.cwd(), "../../saync-reports");

export function getReportsDirectory(): string {
  // Try to find saync-reports in the workspace root
  const workspaceRoot = path.join(process.cwd(), "../..");
  const reportsPath = path.join(workspaceRoot, "saync-reports");
  
  if (fs.existsSync(reportsPath)) {
    return reportsPath;
  }
  
  // Fallback to current directory
  return path.join(process.cwd(), "saync-reports");
}

export function getAllIssues(): Issue[] {
  const reportsDir = getReportsDirectory();
  
  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  const files = fs.readdirSync(reportsDir).filter((file) => file.endsWith(".md"));

  return files.map((file) => {
    const filePath = path.join(reportsDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    // Parse the markdown content to extract sections
    const sections = parseMarkdownSections(content);

    return {
      id: file.replace(".md", ""),
      severity: data.severity || "medium",
      title: data.title || "Untitled Issue",
      description: sections.description || data.description || "",
      filePath: data.filePath || file,
      firstSeen: data.firstSeen || new Date().toISOString(),
      occurrences: data.occurrences || 1,
      status: data.status || "open",
      reproducibility: data.reproducibility || "Always",
      affectedViewports: data.affectedViewports || ["desktop"],
      expectedBehavior: sections.expected || data.expectedBehavior || "",
      observedBehavior: sections.observed || data.observedBehavior || "",
      reproductionSteps: sections.steps || data.reproductionSteps || [],
      rootCause: sections.rootCause || data.rootCause || "",
      suggestedFix: sections.suggestedFix || data.suggestedFix || "",
      codeSnippet: sections.codeSnippet,
      fixedCodeSnippet: sections.fixedCodeSnippet,
    };
  });
}

export function getIssueById(id: string): Issue | null {
  const issues = getAllIssues();
  return issues.find((issue) => issue.id === id) || null;
}

export function getRecentIssues(limit: number = 6): Issue[] {
  const issues = getAllIssues();
  return issues
    .sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
    .slice(0, limit);
}

export function getProjectStats(): ProjectStats {
  const issues = getAllIssues();
  const openIssues = issues.filter((issue) => issue.status === "open").length;

  // Mock data for now - in a real implementation, this would come from saync-results.json
  return {
    openIssues,
    totalContracts: 24,
    passRate: 87.5,
    lastRunDuration: "2m 34s",
  };
}

export function getRecentRuns(limit: number = 5): TestRun[] {
  // Mock data for now - in a real implementation, this would come from saync-results.json
  return [
    {
      id: "run-1",
      title: "Full test suite",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      duration: "2m 34s",
      viewports: ["desktop", "mobile"],
      passCount: 21,
      failCount: 3,
      totalContracts: 24,
    },
    {
      id: "run-2",
      title: "Checkout flow",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      duration: "1m 12s",
      viewports: ["desktop"],
      passCount: 8,
      failCount: 1,
      totalContracts: 9,
    },
  ].slice(0, limit);
}

function parseMarkdownSections(content: string): {
  description?: string;
  expected?: string;
  observed?: string;
  steps?: string[];
  rootCause?: string;
  suggestedFix?: string;
  codeSnippet?: string;
  fixedCodeSnippet?: string;
} {
  const sections: any = {};

  // Extract description (first paragraph)
  const descMatch = content.match(/^(.+?)(?=\n##|\n$)/s);
  if (descMatch) {
    sections.description = descMatch[1].trim();
  }

  // Extract expected vs observed
  const expectedMatch = content.match(/##\s*Expected[:\s]+(.+?)(?=\n##|\n$)/is);
  if (expectedMatch) {
    sections.expected = expectedMatch[1].trim();
  }

  const observedMatch = content.match(/##\s*Observed[:\s]+(.+?)(?=\n##|\n$)/is);
  if (observedMatch) {
    sections.observed = observedMatch[1].trim();
  }

  // Extract reproduction steps
  const stepsMatch = content.match(/##\s*(?:How to reproduce|Steps)[:\s]+(.+?)(?=\n##|\n$)/is);
  if (stepsMatch) {
    const stepsText = stepsMatch[1].trim();
    sections.steps = stepsText
      .split(/\n\d+\./)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Extract root cause
  const rootCauseMatch = content.match(/##\s*Root cause[:\s]+(.+?)(?=\n##|\n$)/is);
  if (rootCauseMatch) {
    sections.rootCause = rootCauseMatch[1].trim();
  }

  // Extract suggested fix
  const fixMatch = content.match(/##\s*Suggested fix[:\s]+(.+?)(?=\n##|\n$)/is);
  if (fixMatch) {
    sections.suggestedFix = fixMatch[1].trim();
  }

  // Extract code snippets
  const codeBlocks = content.match(/```[\s\S]*?```/g);
  if (codeBlocks && codeBlocks.length > 0) {
    sections.codeSnippet = codeBlocks[0];
    if (codeBlocks.length > 1) {
      sections.fixedCodeSnippet = codeBlocks[1];
    }
  }

  return sections;
}

// Made with Bob
