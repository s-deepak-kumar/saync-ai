/**
 * HTTP client that the Saync agent uses to POST run + result + flow +
 * violation data to the local Saync server. Single-tenant: no project
 * IDs, no API keys. The server runs on the same machine (or container)
 * as the agent.
 */

interface BackendClientOptions {
  baseUrl: string;
  timeout?: number;
}

interface CreateRunPayload {
  environment: 'local' | 'dev' | 'prod' | 'ci';
  viewport: string;
  gitBranch?: string;
  gitCommit?: string;
  totalContracts: number;
}

interface PostResultPayload {
  contractName: string;
  componentName: string;
  status: 'pass' | 'fail';
  startedAt: string;
  completedAt: string;
  errorMessage?: string;
  expectedValue?: string;
  observedValue?: string;
  filePath?: string;
  lineNumber?: number;
  stackTrace?: string;
}

interface PostViolationsPayload {
  violations: Array<{
    contractName: string;
    componentName: string;
    errorMessage: string;
    expectedValue?: string;
    observedValue?: string;
    sessionId: string;
    userAgent: string;
    viewportWidth: number;
    viewportHeight: number;
    url: string;
    timestamp: string;
  }>;
}

export interface PostFlowPayload {
  name: string;
  status: 'passed' | 'failed';
  durationMs: number;
  startedAt: string;
  completedAt: string;
  steps: Array<{
    stepIndex: number;
    kind: 'interact' | 'fill' | 'select' | 'expect' | 'wait';
    status: 'passed' | 'failed' | 'skipped';
    errorMessage?: string;
    screenshot?: string;
  }>;
}

interface QueuedRequest {
  method: string;
  url: string;
  body: unknown;
  timestamp: number;
}

export class BackendClient {
  private baseUrl: string;
  private timeout: number;
  private offlineQueue: QueuedRequest[] = [];
  private isNoOp: boolean;

  constructor(options: BackendClientOptions) {
    this.baseUrl = options.baseUrl;
    this.timeout = options.timeout ?? 5000;
    this.isNoOp = false;
  }

  static createNoOp(): BackendClient {
    const client = new BackendClient({ baseUrl: 'http://localhost:3777' });
    client.isNoOp = true;
    return client;
  }

  async createRun(payload: CreateRunPayload): Promise<string | null> {
    if (this.isNoOp) return null;
    const response = await this.request<{ runId: string }>('POST', '/api/runs', payload);
    return response?.runId ?? null;
  }

  async postResult(runId: string, payload: PostResultPayload): Promise<void> {
    if (this.isNoOp) return;
    await this.request('POST', `/api/runs/${runId}/results`, payload);
  }

  async completeRun(runId: string, status: 'completed' | 'failed'): Promise<void> {
    if (this.isNoOp) return;
    await this.request('POST', `/api/runs/${runId}/complete`, { status });
  }

  async postViolations(payload: PostViolationsPayload): Promise<void> {
    if (this.isNoOp) return;
    // Server accepts either a single violation or an array — we always send array.
    await this.request('POST', '/api/violations', payload.violations);
  }

  async postFlow(runId: string, payload: PostFlowPayload): Promise<void> {
    if (this.isNoOp) return;
    await this.request('POST', `/api/runs/${runId}/flows`, payload);
  }

  async flushOfflineQueue(): Promise<void> {
    if (this.isNoOp || this.offlineQueue.length === 0) return;
    console.log(`[Saync] Flushing ${this.offlineQueue.length} queued request(s)...`);
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    for (const req of queue) {
      try {
        await this.makeRequest(req.method, req.url, req.body);
      } catch {
        this.offlineQueue.push(req);
      }
    }
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;
    try {
      return await this.makeRequest<T>(method, url, body);
    } catch {
      console.warn(`[Saync] Backend unreachable, queuing request: ${method} ${path}`);
      this.offlineQueue.push({ method, url, body, timestamp: Date.now() });
      return null;
    }
  }

  private async makeRequest<T = unknown>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 200)}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error');
    }
  }
}
