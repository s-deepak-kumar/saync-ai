#!/usr/bin/env node

/**
 * CLI for Saync agent
 */

import { runAgent } from './runner.js';
import { printError, printProgress, printSuccess } from './reporter.js';
import { BackendClient } from './lib/backend-client.js';
import { execSync, spawn } from 'child_process';

interface CliArgs {
  url?: string;
  headless?: boolean;
  timeout?: number;
  output?: string;
  screenshot?: boolean;
  noBackend?: boolean;
  projectId?: string;
  environment?: string;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case '--url':
      case '-u':
        args.url = argv[++i];
        break;
      case '--headless':
        args.headless = argv[++i] === 'true';
        break;
      case '--timeout':
      case '-t':
        args.timeout = parseInt(argv[++i], 10);
        break;
      case '--output':
      case '-o':
        args.output = argv[++i];
        break;
      case '--screenshot':
        args.screenshot = argv[++i] === 'true';
        break;
      case '--no-backend':
        args.noBackend = true;
        break;
      case '--project-id':
        args.projectId = argv[++i];
        break;
      case '--environment':
      case '--env':
        args.environment = argv[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-') && !args.url) {
          args.url = arg;
        }
        break;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Saync Agent - Automated expectation verification

Usage:
  saync-agent [options] <url>

Options:
  -u, --url <url>           URL of the application to test (required)
  --headless <true|false>   Run browser in headless mode (default: true)
  -t, --timeout <ms>        Timeout in milliseconds (default: 30000)
  -o, --output <file>       Output file for report (default: saync-failures.json)
  --screenshot <true|false> Take screenshots on failure (default: true)
  --no-backend              Skip backend integration (markdown only)
  --project-id <id>         Project ID for backend (default: auto-detect)
  --environment <env>       Environment name (default: local)
  -h, --help                Show this help message

Environment Variables:
  SAYNC_NO_BACKEND=1        Skip backend integration
  SAYNC_PORT=4000           Backend port (default: 4000)
  SAYNC_API_KEY=<key>       API key for backend (default: dev-key)

Examples:
  saync-agent http://localhost:3000
  saync-agent --url http://localhost:3000 --headless false
  saync-agent http://localhost:3000 --no-backend
  saync-agent http://localhost:3000 --project-id my-app --environment staging
  `);
}

/**
 * Get git branch name
 */
function getGitBranch(): string | undefined {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Get git commit hash
 */
function getGitCommit(): string | undefined {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
}

/**
 * Get project ID from package.json
 */
function getProjectId(): string {
  try {
    const pkg = JSON.parse(
      execSync('cat package.json', { encoding: 'utf-8' })
    );
    return pkg.name || 'default';
  } catch {
    return 'default';
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (!args.url) {
    printError('URL is required. Use --help for usage information.');
    process.exit(1);
  }

  // Check if backend should be disabled
  const noBackend = args.noBackend || process.env.SAYNC_NO_BACKEND === '1';

  let backendProcess: any = null;
  let backendClient: BackendClient | undefined;

  try {
    // Start backend if not disabled
    if (!noBackend) {
      printProgress('Starting Saync backend...');
      const port = parseInt(process.env.SAYNC_PORT || '4000', 10);
      const backendUrl = `http://localhost:${port}`;
      
      // Check if backend is already running
      let backendRunning = false;
      try {
        const response = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          backendRunning = true;
          printSuccess(`Backend already running at ${backendUrl}`);
        }
      } catch {
        // Backend not running, start it
      }

      if (!backendRunning) {
        // Start backend with Bun in background
        const backendPath = new URL('../../../backend/src/index.ts', import.meta.url).pathname;
        backendProcess = spawn('bun', ['run', backendPath], {
          env: { ...process.env, SAYNC_PORT: String(port) },
          stdio: 'ignore',
          detached: true,
        });
        
        backendProcess.unref();
        
        // Wait for backend to be ready
        printProgress('Waiting for backend to start...');
        let retries = 20;
        while (retries > 0) {
          try {
            const response = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(500) });
            if (response.ok) {
              printSuccess(`Backend ready at ${backendUrl}`);
              break;
            }
          } catch {
            // Not ready yet
          }
          await new Promise(resolve => setTimeout(resolve, 500));
          retries--;
        }
        
        if (retries === 0) {
          throw new Error('Backend failed to start');
        }
      }

      // Create backend client
      const apiKey = process.env.SAYNC_API_KEY || 'dev-key';
      backendClient = new BackendClient({
        baseUrl: backendUrl,
        apiKey,
      });
    } else {
      printProgress('Backend integration disabled (--no-backend)');
      backendClient = BackendClient.createNoOp();
    }

    // Get project metadata
    const projectId = args.projectId || getProjectId();
    const environment = args.environment || process.env.NODE_ENV || 'local';
    const gitBranch = getGitBranch();
    const gitCommit = getGitCommit();

    printProgress(`Project: ${projectId}`);
    printProgress(`Environment: ${environment}`);
    if (gitBranch) printProgress(`Git branch: ${gitBranch}`);
    if (gitCommit) printProgress(`Git commit: ${gitCommit?.substring(0, 7)}`);

    // Run agent
    const report = await runAgent({
      url: args.url,
      headless: args.headless ?? true,
      timeout: args.timeout ?? 30000,
      outputFile: args.output ?? 'saync-failures.json',
      screenshotOnFailure: args.screenshot ?? true,
      backendClient,
      projectId,
      environment,
      gitBranch,
      gitCommit,
    });

    // Exit with error code if any tests failed
    if (report.summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    printError('Fatal error', error as Error);
    process.exit(1);
  } finally {
    // Stop backend if we started it
    if (backendProcess && !noBackend) {
      printProgress('Stopping backend...');
      backendProcess.kill();
    }
  }
}

main();

// Made with Bob
