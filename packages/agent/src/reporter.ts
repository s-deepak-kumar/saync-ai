/**
 * Reporting utilities for verification results
 */

import { writeFile } from 'fs/promises';
import chalk from 'chalk';
import type { VerificationReport, VerificationResult } from './types.js';

/**
 * Format and write verification report to file
 */
export async function writeReport(
  report: VerificationReport,
  outputFile: string
): Promise<void> {
  const json = JSON.stringify(report, null, 2);
  await writeFile(outputFile, json, 'utf-8');
}

/**
 * Format verification report for terminal output
 */
export function formatTerminalReport(report: VerificationReport): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('                    SAYNC REPORT                       '));
  lines.push(chalk.bold('═══════════════════════════════════════════════════════'));
  lines.push('');

  // Summary
  const { summary } = report;
  const passRate = summary.total > 0 
    ? ((summary.passed / summary.total) * 100).toFixed(1)
    : '0.0';

  lines.push(chalk.bold('Summary:'));
  lines.push(`  URL:      ${chalk.cyan(report.url)}`);
  lines.push(`  Total:    ${summary.total}`);
  lines.push(`  Passed:   ${chalk.green(summary.passed)}`);
  lines.push(`  Failed:   ${summary.failed > 0 ? chalk.red(summary.failed) : summary.failed}`);
  lines.push(`  Pass Rate: ${summary.failed === 0 ? chalk.green(passRate + '%') : chalk.yellow(passRate + '%')}`);
  lines.push(`  Duration: ${summary.duration}ms`);
  lines.push('');

  // Results
  if (report.results.length > 0) {
    lines.push(chalk.bold('Results:'));
    lines.push('');

    for (const result of report.results) {
      lines.push(formatResult(result));
    }
  }

  // Footer
  lines.push(chalk.bold('═══════════════════════════════════════════════════════'));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format a single verification result
 */
function formatResult(result: VerificationResult): string {
  const lines: string[] = [];
  const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
  const status = result.passed ? chalk.green('PASSED') : chalk.red('FAILED');

  lines.push(`${icon} ${status} ${chalk.gray(`[${result.expectationId}]`)} ${chalk.gray(`(${result.duration}ms)`)}`);

  if (!result.passed && result.errors.length > 0) {
    for (const error of result.errors) {
      lines.push('');
      lines.push(`  ${chalk.red('Error:')} ${error.message}`);
      
      if (error.expected !== undefined) {
        lines.push(`  ${chalk.gray('Expected:')} ${formatValue(error.expected)}`);
      }
      
      if (error.actual !== undefined) {
        lines.push(`  ${chalk.gray('Actual:')}   ${formatValue(error.actual)}`);
      }

      if (error.type === 'api-call') {
        lines.push(`  ${chalk.gray('Type:')}     API Call Verification`);
      } else if (error.type === 'response-shape') {
        lines.push(`  ${chalk.gray('Type:')}     Response Shape Validation`);
      } else if (error.type === 'timeout') {
        lines.push(`  ${chalk.gray('Type:')}     Timeout`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return chalk.yellow(`"${value}"`);
  }
  if (typeof value === 'number') {
    return chalk.cyan(String(value));
  }
  if (typeof value === 'boolean') {
    return chalk.magenta(String(value));
  }
  if (value === null) {
    return chalk.gray('null');
  }
  if (value === undefined) {
    return chalk.gray('undefined');
  }
  if (typeof value === 'object') {
    return chalk.gray(JSON.stringify(value, null, 2));
  }
  return String(value);
}

/**
 * Print report to console
 */
export function printReport(report: VerificationReport): void {
  console.log(formatTerminalReport(report));
}

/**
 * Print a simple progress message
 */
export function printProgress(message: string): void {
  console.log(chalk.gray(`[Saync] ${message}`));
}

/**
 * Print an error message
 */
export function printError(message: string, error?: Error): void {
  console.error(chalk.red(`[Saync Error] ${message}`));
  if (error) {
    console.error(chalk.gray(error.stack || error.message));
  }
}

/**
 * Print a success message
 */
export function printSuccess(message: string): void {
  console.log(chalk.green(`[Saync] ${message}`));
}

// Made with Bob
