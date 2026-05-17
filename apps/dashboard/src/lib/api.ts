/**
 * Thin REST client for the Saync local API.
 *
 * In the single-tenant local model every endpoint is unscoped — there is
 * no project ID in any path. Reads are unauthenticated; writes come from
 * the agent inside the same process, not from the dashboard.
 */

export const BACKEND_URL =
  typeof window === 'undefined'
    ? (process.env.SAYNC_INTERNAL_URL ?? 'http://localhost:3777')
    : '';

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type RunStatus = 'running' | 'pending' | 'completed' | 'failed';

export interface Stats {
  openIssues: number;
  totalContracts: number;
  passRate: number;
  lastRunDuration: string;
}

export interface Run {
  id: string;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  totalContracts: number;
  passedContracts: number;
  failedContracts: number;
  environment: string | null;
  viewport: string | null;
  gitBranch: string | null;
  gitCommit: string | null;
}

export interface Issue {
  id: string;
  contractName: string;
  componentName: string;
  status: 'open' | 'resolved';
  severity: Severity;
  errorMessage: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  filePath?: string | null;
}

export interface ContractResult {
  id: string;
  runId: string;
  contractName: string;
  componentName: string;
  status: 'pass' | 'fail';
  startedAt: string;
  completedAt: string;
  errorMessage: string | null;
  expectedValue: string | null;
  observedValue: string | null;
  filePath: string | null;
  lineNumber: number | null;
  stackTrace: string | null;
}

export interface IssueOccurrence {
  id: string;
  runId: string;
  resultId: string;
  occurredAt: string;
  runStatus: RunStatus | null;
  runStartedAt: string | null;
  runEnvironment: string | null;
  runGitBranch: string | null;
  runGitCommit: string | null;
  resultFilePath: string | null;
  resultLineNumber: number | null;
  resultStackTrace: string | null;
  resultExpectedValue: string | null;
  resultObservedValue: string | null;
  resultErrorMessage: string | null;
}

export interface IssueDetail extends Issue {
  occurrences: IssueOccurrence[];
}

export type FlowStatus = 'passed' | 'failed';
export type FlowStepStatus = 'passed' | 'failed' | 'skipped';
export type FlowStepKind = 'interact' | 'fill' | 'select' | 'expect' | 'wait';

export interface FlowStepResult {
  id: string;
  flowId: string;
  stepIndex: number;
  kind: FlowStepKind;
  status: FlowStepStatus;
  errorMessage: string | null;
  screenshot: string | null;
  createdAt: string;
}

export interface Flow {
  id: string;
  runId: string;
  name: string;
  status: FlowStatus;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export interface FlowWithSteps extends Flow {
  steps: FlowStepResult[];
}

/** One row per unique flow name, latest run first, with history totals. */
export interface FlowSummary extends Flow {
  totalRuns: number;
  passedRuns: number;
}

export interface RunDetail extends Run {
  results: ContractResult[];
  flows: FlowWithSteps[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export function issueSlug(contractName: string): string {
  return contractName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/\./g, '-')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export const api = {
  stats: () => get<Stats>('/api/stats'),

  recentRuns: (limit = 10) => get<Run[]>(`/api/runs?limit=${limit}`),

  runDetail: (runId: string) => get<RunDetail>(`/api/runs/${runId}`),

  runFlows: (runId: string) => get<FlowWithSteps[]>(`/api/runs/${runId}/flows`),

  flow: (flowId: string) => get<FlowWithSteps>(`/api/flows/${flowId}`),

  flowSummaries: () => get<FlowSummary[]>('/api/flows'),

  issues: (opts: { status?: 'open' | 'resolved'; severity?: Severity } = {}) => {
    const params = new URLSearchParams();
    if (opts.status) params.set('status', opts.status);
    if (opts.severity) params.set('severity', opts.severity);
    const qs = params.toString();
    return get<Issue[]>(`/api/issues${qs ? `?${qs}` : ''}`);
  },

  issueDetail: (issueId: string) => get<IssueDetail>(`/api/issues/${issueId}`),
};
