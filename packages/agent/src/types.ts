/**
 * Agent-specific types for verification and reporting
 */

/**
 * Verification result for a single expectation
 */
export interface VerificationResult {
  expectationId: string;
  passed: boolean;
  errors: VerificationError[];
  duration: number;
  timestamp: string;
  screenshot?: string;
}

/**
 * Verification error details
 */
export interface VerificationError {
  type: 'api-call' | 'response-shape' | 'timeout' | 'selector-not-found' | 'unexpected-error';
  message: string;
  expected?: unknown;
  actual?: unknown;
  stack?: string;
}

/**
 * Network request capture
 */
export interface CapturedRequest {
  method: string;
  url: string;
  status: number;
  duration: number;
  requestBody?: unknown;
  responseBody?: unknown;
  headers: Record<string, string>;
}

/**
 * Complete verification report
 */
export interface VerificationReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
  results: VerificationResult[];
  timestamp: string;
  url: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  url: string;
  headless?: boolean;
  timeout?: number;
  outputFile?: string;
  screenshotOnFailure?: boolean;
}

// Made with Bob
