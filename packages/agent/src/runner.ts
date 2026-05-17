/**
 * Main runner for Saync agent
 */

import { Verifier } from './verifier.js';
import { writeReport, printReport, printProgress, printError, printSuccess } from './reporter.js';
import { BackendClient } from './lib/backend-client.js';
import { writeMarkdownReport } from './markdown-reporter.js';
import { loadFlows, runFlow } from './flows.js';
import type { AgentConfig, VerificationReport } from './types.js';
import type { Expectation, FlowResult } from '@saync/core';

/**
 * Extended agent config with backend options
 */
export interface ExtendedAgentConfig extends AgentConfig {
  backendClient?: BackendClient;
  environment?: 'local' | 'dev' | 'prod' | 'ci';
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
    let expectations = await verifier.readExpectations();

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

    // Order: link / nav-link last. The agent clicks them, and even
    // though verifyLink no longer reloads the page, an *actual*
    // navigation away (real href, no preventDefault) would still
    // change the DOM and break later contracts. Sorting them last
    // means every other contract has finished by the time we leave.
    expectations = sortLinksLast(expectations);

    // Create run in backend
    if (backendClient) {
      runId = await backendClient.createRun({
        environment: config.environment ?? 'local',
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

    // Flows — opt-in. After all atomic contracts have been verified
    // against this run, look for saync.flows.ts in CWD and drive each
    // declared flow. Results go to the backend separately from atomic
    // contracts; flows feed the new /api/runs/:id/flows endpoint.
    const flowDefinitions = await loadFlows().catch((err: unknown) => {
      printError('Failed to load saync.flows.ts', err instanceof Error ? err : new Error(String(err)));
      return null;
    });

    const flowResults: FlowResult[] = [];
    if (flowDefinitions && flowDefinitions.length > 0 && verifier.getPage()) {
      printProgress(`Found ${flowDefinitions.length} flow(s). Running...`);
      for (const flow of flowDefinitions) {
        printProgress(`Flow: ${flow.name} (${flow.steps.length} steps)`);
        const flowStartedAt = new Date();
        const result = await runFlow(verifier.getPage()!, flow, config.url);
        const flowCompletedAt = new Date();
        flowResults.push(result);

        if (backendClient && runId) {
          await backendClient.postFlow(runId, {
            name: result.name,
            status: result.status,
            durationMs: result.durationMs,
            startedAt: flowStartedAt.toISOString(),
            completedAt: flowCompletedAt.toISOString(),
            steps: result.steps.map((s: FlowResult['steps'][number]) => ({
              stepIndex: s.stepIndex,
              kind: s.kind,
              status: s.status,
              errorMessage: s.errorMessage,
              screenshot: s.screenshot,
            })),
          });
        }

        const icon = result.status === 'passed' ? '✓' : '✗';
        printProgress(`  ${icon} ${result.name} — ${result.status} (${result.durationMs}ms)`);
      }
    }

    const duration = Date.now() - startTime;
    const flowFailures = flowResults.filter((f) => f.status === 'failed').length;

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

    // Complete the run in backend. Run is "failed" if either atomic
    // contracts or any flow failed — a passing run requires both green.
    if (backendClient && runId) {
      const status =
        report.summary.failed > 0 || flowFailures > 0 ? 'failed' : 'completed';
      await backendClient.completeRun(runId, status);
      printSuccess(
        `Backend run marked as ${status}` +
          (flowResults.length > 0
            ? ` (flows: ${flowResults.length - flowFailures}/${flowResults.length} passed)`
            : ''),
      );
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

  // Prefer the developer-supplied identifiers from the SDK
  // (BaseExpectation.name / componentName, added in SDK Wave 1).
  // Fall back to the random id only when the SDK is older or the dev
  // forgot to pass `name=`.
  const exp = expectation as typeof expectation & {
    name?: string;
    componentName?: string;
    type?: string;
  };
  const baseName = exp.name ?? exp.id;
  const componentName = exp.componentName ?? baseName.split('.')[0] ?? 'Unknown';
  // Each SDK component type has a known "verb" so the dashboard's
  // "component · action" split-on-dot rendering reads naturally.
  const verb = actionVerbFor(exp.type);
  const contractName = exp.name ? `${exp.name}.${verb}` : exp.id;

  const payload: any = {
    contractName,
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

/**
 * Move link / nav-link expectations to the end of the array, preserving
 * the relative order otherwise. Verifying links last avoids the case
 * where a real navigation (a non-preventDefault'd href) wipes the DOM
 * out from under subsequent contract verifications.
 */
function sortLinksLast<T extends { type: string }>(items: T[]): T[] {
  const isLinky = (t: string) => t === 'link' || t === 'nav-link';
  const rest = items.filter((e) => !isLinky(e.type));
  const links = items.filter((e) => isLinky(e.type));
  return [...rest, ...links];
}

/**
 * Maps a contract type to the user-facing verb the dashboard renders
 * (after the `.` in contractName). Keeping this here rather than in
 * core so it stays a presentation concern — the registered contract
 * itself doesn't need to know about display strings.
 */
function actionVerbFor(type?: string): string {
  switch (type) {
    case 'button-click': return 'click';
    case 'input':
    case 'textarea':
    case 'select':
    case 'checkbox':
    case 'switch':
    case 'radio-group':
    case 'slider':
    case 'file-input':
    case 'date-picker':
    case 'pagination':       return 'change';
    case 'form':             return 'submit';
    case 'link':
    case 'nav-link':         return 'click';
    case 'tabs':             return 'switch';
    case 'breadcrumb':       return 'render';
    case 'menu':             return 'open';
    default:                 return 'verify';
  }
}

// Made with Bob
