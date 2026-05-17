/**
 * Prompt templates for Saync's three report kinds. Each builder returns
 * a { systemPrompt, userPrompt } pair plus a soft maxTokens hint. We
 * keep the prompts tight because WatsonX's default Granite 3.3 8B has
 * an ~8K context and a smaller useful output window than the frontier
 * models.
 */

import type { IssueDetail, RunDetail, ProductionViolation } from '@/lib/api';

const SYSTEM = `You are a senior frontend engineer reviewing failed UI contracts produced by Saync — a local-first QA tool that wraps React components with behavioral assertions. Your reports are short, concrete, and biased toward actionable fixes.

Write in markdown using these sections in order:

## Root cause
1–2 short paragraphs. State the most likely cause. If multiple, name them in priority order.

## Suggested fix
A concrete code-level change. If a small diff helps, show it in a fenced TypeScript or TSX block. No prose dumps.

## Related checks
A bulleted list of 2–4 other contracts that often break for the same reason — give the contract pattern (component.event), not full code.

Rules:
- Never invent stack frames, files, or function names you weren't given.
- Never recommend disabling the contract.
- Keep the whole output under 400 words.`;

export function issuePrompt(issue: IssueDetail) {
  const latest = issue.occurrences[0];
  const userPrompt = [
    `Contract:   ${issue.contractName}`,
    `Component:  ${issue.componentName}`,
    `Severity:   ${issue.severity}`,
    `Occurrences: ${issue.occurrenceCount}`,
    `First seen: ${issue.firstSeenAt}`,
    `Last seen:  ${issue.lastSeenAt}`,
    `Error message: ${issue.errorMessage}`,
    latest?.resultExpectedValue ? `Expected:   ${latest.resultExpectedValue}` : '',
    latest?.resultObservedValue ? `Observed:   ${latest.resultObservedValue}` : '',
    latest?.resultFilePath ? `Source:     ${latest.resultFilePath}${latest.resultLineNumber ? `:${latest.resultLineNumber}` : ''}` : '',
    latest?.resultStackTrace ? `Stack trace (truncated):\n${latest.resultStackTrace.slice(0, 800)}` : '',
  ].filter(Boolean).join('\n');

  return {
    systemPrompt: SYSTEM,
    userPrompt: `Generate a Saync issue report for the following failed contract.\n\n${userPrompt}`,
    maxTokens: 700,
  };
}

export function runPrompt(run: RunDetail) {
  const passed = run.results.filter((r) => r.status === 'pass').length;
  const failed = run.results.filter((r) => r.status === 'fail').length;
  const failedFlows = run.flows.filter((f) => f.status === 'failed').length;
  const totalFlows = run.flows.length;

  // Surface the first 8 failing contracts so the LLM can group them by
  // theme. Anything beyond is summarized as "and N more" — keeps the
  // prompt bounded.
  const failingContracts = run.results
    .filter((r) => r.status === 'fail')
    .slice(0, 8)
    .map((r) => `- ${r.componentName} · ${r.contractName}: ${r.errorMessage ?? '(no message)'}`)
    .join('\n');
  const moreFailures = Math.max(0, failed - 8);

  const flowSummaries = run.flows.length > 0
    ? run.flows
        .map((f) => {
          const failedStep = f.steps.find((s) => s.status === 'failed');
          return failedStep
            ? `- ${f.name}: FAILED at step ${failedStep.stepIndex + 1} — ${failedStep.errorMessage ?? failedStep.kind}`
            : `- ${f.name}: passed (${f.steps.length} steps)`;
        })
        .join('\n')
    : '(no flows defined)';

  const userPrompt = [
    `Run id:        ${run.id}`,
    `Status:        ${run.status}`,
    `Environment:   ${run.environment}`,
    run.gitBranch ? `Git:           ${run.gitBranch}${run.gitCommit ? '@' + run.gitCommit.slice(0, 7) : ''}` : '',
    `Contracts:     ${run.totalContracts} (${passed} passed / ${failed} failed)`,
    `Flows:         ${totalFlows - failedFlows}/${totalFlows} passed`,
    '',
    `Failing contracts${moreFailures > 0 ? ` (showing 8 of ${failed})` : ''}:`,
    failingContracts || '(none)',
    moreFailures > 0 ? `…and ${moreFailures} more.` : '',
    '',
    'Flows:',
    flowSummaries,
  ].filter(Boolean).join('\n');

  return {
    systemPrompt: SYSTEM,
    userPrompt: `Generate a Saync run report. Group failures by likely shared cause (e.g. "all add-to-cart variants share the same POST mismatch") rather than listing each contract individually.\n\n${userPrompt}`,
    maxTokens: 900,
  };
}

export interface ViolationClusterPayload {
  contractName: string;
  componentName: string;
  errorMessage: string;
  occurrences: number;
  uniqueSessions: number;
  uniqueUrls: number;
  topUrls: { url: string; count: number }[];
  firstSeen: string;
  lastSeen: string;
  sampleViewports: { width: number; height: number; count: number }[];
  sampleUserAgents: string[];
}

export function violationClusterPrompt(c: ViolationClusterPayload) {
  const userPrompt = [
    `Contract:        ${c.contractName}`,
    `Component:       ${c.componentName}`,
    `Error message:   ${c.errorMessage}`,
    `Occurrences:     ${c.occurrences}`,
    `Unique sessions: ${c.uniqueSessions}`,
    `Unique URLs:     ${c.uniqueUrls}`,
    `First seen:      ${c.firstSeen}`,
    `Last seen:       ${c.lastSeen}`,
    `Top URLs:        ${c.topUrls.map((u) => `${u.url} (${u.count})`).join(', ')}`,
    `Viewports:       ${c.sampleViewports.map((v) => `${v.width}×${v.height} ×${v.count}`).join(', ')}`,
    c.sampleUserAgents.length > 0
      ? `User agents:     ${c.sampleUserAgents.slice(0, 3).join(' | ')}`
      : '',
  ].filter(Boolean).join('\n');

  return {
    systemPrompt: SYSTEM,
    userPrompt: `Generate a Saync production violation report. Real users have been hitting this contract failure — explain what's likely happening on their end and what to fix first. Pay attention to whether viewports / URLs suggest a device or page-specific bug.\n\n${userPrompt}`,
    maxTokens: 800,
  };
}
