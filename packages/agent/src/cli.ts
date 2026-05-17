#!/usr/bin/env node

/**
 * Standalone CLI for the Saync agent.
 *
 * In the local-first model the agent is normally invoked by the Saync
 * server (which already knows the URL, mode, and DB location). This
 * binary stays for advanced users / CI hooks who want to run the agent
 * directly. It assumes the Saync server is already listening — start
 * it separately with `saync start`.
 */

import { runAgent } from './runner.js';
import { printError, printProgress, printSuccess } from './reporter.js';
import { BackendClient } from './lib/backend-client.js';
import { execSync } from 'child_process';

interface CliArgs {
  url?: string;
  headless?: boolean;
  timeout?: number;
  output?: string;
  screenshot?: boolean;
  noBackend?: boolean;
  environment?: 'local' | 'dev' | 'prod' | 'ci';
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--url':
      case '-u':
        args.url = argv[++i]; break;
      case '--headless':
        args.headless = argv[++i] === 'true'; break;
      case '--timeout':
      case '-t':
        args.timeout = parseInt(argv[++i], 10); break;
      case '--output':
      case '-o':
        args.output = argv[++i]; break;
      case '--screenshot':
        args.screenshot = argv[++i] === 'true'; break;
      case '--no-backend':
        args.noBackend = true; break;
      case '--environment':
      case '--env':
        args.environment = argv[++i] as CliArgs['environment']; break;
      case '--help':
      case '-h':
        printHelp(); process.exit(0); break;
      default:
        if (!arg.startsWith('-') && !args.url) args.url = arg;
        break;
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`
Saync Agent — run all contracts + flows against your app

Usage:
  saync-agent [options] <url>

Options:
  -u, --url <url>           URL of the application to test (required)
  --headless <true|false>   Run browser in headless mode (default: true)
  -t, --timeout <ms>        Timeout in milliseconds (default: 30000)
  -o, --output <file>       Output file for report (default: saync-failures.json)
  --screenshot <true|false> Take screenshots on failure (default: true)
  --no-backend              Don't POST results — emit local report only
  --environment <env>       'local' | 'dev' | 'prod' | 'ci' (default: local)
  -h, --help                Show this help message

Environment variables:
  SAYNC_NO_BACKEND=1            Same as --no-backend
  SAYNC_URL=<url>               Saync server URL (default: http://localhost:3777)

Examples:
  saync-agent http://localhost:3000
  saync-agent --url http://localhost:5173 --headless false
  saync-agent http://localhost:3000 --no-backend
  `);
}

function getGitBranch(): string | undefined {
  try { return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim(); }
  catch { return undefined; }
}

function getGitCommit(): string | undefined {
  try { return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(); }
  catch { return undefined; }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.url) {
    printError('URL is required. Use --help for usage information.');
    process.exit(1);
  }

  const noBackend = args.noBackend || process.env.SAYNC_NO_BACKEND === '1';
  let backendClient: BackendClient;

  try {
    if (!noBackend) {
      const baseUrl = (process.env.SAYNC_URL ?? 'http://localhost:3777').replace(/\/$/, '');
      printProgress(`Saync server: ${baseUrl}`);

      let reachable = false;
      try {
        const response = await fetch(`${baseUrl}/api/system`, { signal: AbortSignal.timeout(2000) });
        reachable = response.ok;
      } catch { /* timeout / not running */ }

      if (!reachable) {
        throw new Error(
          `Saync server at ${baseUrl} is not reachable.\n` +
          `Start it first with:  npm run saync   (or: npx saync start)`,
        );
      }
      printSuccess(`Saync server reachable at ${baseUrl}`);

      backendClient = new BackendClient({ baseUrl });
    } else {
      printProgress('Backend integration disabled (--no-backend)');
      backendClient = BackendClient.createNoOp();
    }

    const environment = args.environment ?? ((process.env.SAYNC_MODE as CliArgs['environment']) || 'local');
    const gitBranch = getGitBranch();
    const gitCommit = getGitCommit();

    printProgress(`Environment: ${environment}`);
    if (gitBranch) printProgress(`Git branch: ${gitBranch}`);
    if (gitCommit) printProgress(`Git commit: ${gitCommit.substring(0, 7)}`);

    const report = await runAgent({
      url: args.url,
      headless: args.headless ?? true,
      timeout: args.timeout ?? 30000,
      outputFile: args.output ?? 'saync-failures.json',
      screenshotOnFailure: args.screenshot ?? true,
      backendClient,
      environment,
      gitBranch,
      gitCommit,
    });

    if (report.summary.failed > 0) process.exit(1);
  } catch (error) {
    printError('Fatal error', error as Error);
    process.exit(1);
  }
}

main();
