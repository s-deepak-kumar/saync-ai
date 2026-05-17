/**
 * Main runner for Saync agent
 */

import { Verifier } from './verifier.js';
import { writeReport, printReport, printProgress, printError, printSuccess } from './reporter.js';
import { BackendClient } from './lib/backend-client.js';
import { writeMarkdownReport } from './markdown-reporter.js';
import type { AgentConfig, VerificationReport } from './types.js';
import type { Expectation } from '@saync/core';

/**
 * Extended agent config with backend options
 */
export interface ExtendedAgentConfig extends AgentConfig {
  backendClient?: BackendClient;
  projectId?: string;
  environment?: string;
  gitBranch?: string;
  gitCommit?: string;
}

/**
 * Run the Saync verification agent
 */
export async function runAgent(config: ExtendedAgentConfig): Promise<VerificationReport> {
  const verifier = new Verifier(config);
  const backendClient = config.backendClient;
  let runId: string | null = null;

  try {
    printProgress('Initializing browser...');
    await verifier.initialize();

    printProgress(`Navigating to ${config.url}...`);
    
    printProgress('Reading expectations from page...');
    const expectations = await verifier.readExpectations();

    if (expectations.length === 0) {
      printProgress('No expectations found on the page.');
      const emptyReport: VerificationReport = {
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          duration: 0,
        },
        results: [],
        timestamp: new Date().toISOString(),
        url: config.url,
      };
      return emptyReport;
    }

    printProgress(`Found ${expectations.length} expectation(s). Starting verification...`);

    // Create run in backend
    if (backendClient) {
      runId = await backendClient.createRun({
        projectId: config.projectId || 'default',
        environment: config.environment || 'local',
        viewport: '1920x1080',
        gitBranch: config.gitBranch,
        gitCommit: config.gitCommit,
        totalContracts: expectations.length,
      });

      if (runId) {
        printSuccess(`Backend run created: ${runId}`);
      }
    }

    const startTime = Date.now();
    const results = [];

    for (let i = 0; i < expectations.length; i++) {
      const expectation = expectations[i];
      printProgress(`[${i + 1}/${expectations.length}] Verifying: ${expectation.id}...`);
      
      const resultStartTime = Date.now();
      const result = await verifier.verifyExpectation(expectation);
      results.push(result);

      // Post result to backend immediately (live streaming)
      if (backendClient && runId) {
        await postResultToBackend(backendClient, runId, expectation, result, resultStartTime);
      }

      // Write markdown report for failures
      if (!result.passed) {
        await writeMarkdownReport(result, expectation);
        printProgress(`  → Markdown report written for ${expectation.id}`);
      }
    }

    const duration = Date.now() - startTime;

    const report: VerificationReport = {
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        duration,
      },
      results,
      timestamp: new Date().toISOString(),
      url: config.url,
    };

    // Complete the run in backend
    if (backendClient && runId) {
      const status = report.summary.failed > 0 ? 'failed' : 'completed';
      await backendClient.completeRun(runId, status);
      printSuccess(`Backend run marked as ${status}`);
    }

    // Flush offline queue
    if (backendClient) {
      await backendClient.flushOfflineQueue();
    }

    // Write report to file
    if (config.outputFile) {
      await writeReport(report, config.outputFile);
      printSuccess(`Report written to ${config.outputFile}`);
    }

    // Print to terminal
    printReport(report);

    return report;
  } catch (error) {
    // Mark run as failed in backend
    if (backendClient && runId) {
      await backendClient.completeRun(runId, 'failed');
      await backendClient.flushOfflineQueue();
    }

    printError('Agent execution failed', error as Error);
    throw error;
  } finally {
    printProgress('Cleaning up...');
    await verifier.cleanup();
  }
}

/**
 * Post a verification result to the backend
 */
async function postResultToBackend(
  client: BackendClient,
  runId: string,
  expectation: Expectation,
  result: any,
  startTime: number
): Promise<void> {
  const completedAt = new Date().toISOString();
  const startedAt = new Date(startTime).toISOString();

  // Extract component name from expectation ID (e.g., "SayncButton.loading" -> "SayncButton")
  const componentName = expectation.id.split('.')[0] || 'Unknown';

  const payload: any = {
    contractName: expectation.id,
    componentName,
    status: result.passed ? 'pass' : 'fail',
    startedAt,
    completedAt,
  };

  // Add error details for failures
  if (!result.passed && result.errors.length > 0) {
    const firstError = result.errors[0];
    payload.errorMessage = firstError.message;
    
    if (firstError.expected !== undefined) {
      payload.expectedValue = String(firstError.expected);
    }
    
    if (firstError.actual !== undefined) {
      payload.observedValue = String(firstError.actual);
    }

    if (firstError.stack) {
      payload.stackTrace = firstError.stack;
    }
  }

  await client.postResult(runId, payload);
}

// Made with Bob
