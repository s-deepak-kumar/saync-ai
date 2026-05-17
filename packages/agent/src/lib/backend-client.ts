/**
 * Backend client for posting verification results to Saync backend
 */

interface BackendClientOptions {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
}

interface CreateRunPayload {
  projectId: string;
  environment: string;
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
  projectId: string;
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

interface QueuedRequest {
  method: string;
  url: string;
  body: unknown;
  timestamp: number;
}

export class BackendClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private offlineQueue: QueuedRequest[] = [];
  private isNoOp: boolean;

  constructor(options: BackendClientOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 5000;
    this.isNoOp = false;
  }

  /**
   * Create a no-op client that doesn't make any requests
   */
  static createNoOp(): BackendClient {
    const client = new BackendClient({
      baseUrl: 'http://localhost:4000',
      apiKey: 'noop',
    });
    client.isNoOp = true;
    return client;
  }

  /**
   * Create a new test run
   */
  async createRun(payload: CreateRunPayload): Promise<string | null> {
    if (this.isNoOp) return null;

    const response = await this.request<{ runId: string }>('POST', '/api/runs', payload);
    return response?.runId ?? null;
  }

  /**
   * Post a contract verification result
   */
  async postResult(runId: string, payload: PostResultPayload): Promise<void> {
    if (this.isNoOp) return;

    await this.request('POST', `/api/runs/${runId}/results`, payload);
  }

  /**
   * Mark a run as complete
   */
  async completeRun(runId: string, status: 'completed' | 'failed'): Promise<void> {
    if (this.isNoOp) return;

    await this.request('POST', `/api/runs/${runId}/complete`, { status });
  }

  /**
   * Post production violations
   */
  async postViolations(payload: PostViolationsPayload): Promise<void> {
    if (this.isNoOp) return;

    await this.request('POST', '/api/violations', payload);
  }

  /**
   * Flush the offline queue by retrying all queued requests
   */
  async flushOfflineQueue(): Promise<void> {
    if (this.isNoOp || this.offlineQueue.length === 0) return;

    console.log(`[Saync] Flushing ${this.offlineQueue.length} queued request(s)...`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const req of queue) {
      try {
        await this.makeRequest(req.method, req.url, req.body);
        console.log(`[Saync] ✓ Flushed: ${req.method} ${req.url}`);
      } catch (error) {
        console.warn(`[Saync] ✗ Failed to flush: ${req.method} ${req.url}`, error);
        // Re-queue if still failing
        this.offlineQueue.push(req);
      }
    }

    if (this.offlineQueue.length > 0) {
      console.warn(`[Saync] ${this.offlineQueue.length} request(s) still queued after flush`);
    }
  }

  /**
   * Make a request to the backend
   */
  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T | null> {
    const url = `${this.baseUrl}${path}`;

    try {
      return await this.makeRequest<T>(method, url, body);
    } catch (error) {
      // Queue the request for later retry
      console.warn(`[Saync] Backend unreachable, queuing request: ${method} ${path}`);
      this.offlineQueue.push({
        method,
        url,
        body,
        timestamp: Date.now(),
      });
      return null;
    }
  }

  /**
   * Actually make the HTTP request
   */
  private async makeRequest<T = unknown>(
    method: string,
    url: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Saync-Api-Key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
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

// Made with Bob
