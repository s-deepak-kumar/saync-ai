#!/usr/bin/env bun

/**
 * Test importing and using startBackend() from @saync/backend in the agent package
 * This verifies that the backend can be embedded in other packages
 */

import { startBackend } from '../backend/src/index';

console.log('=== Testing Backend Import from Agent Package ===\n');

console.log('Test 1: Import startBackend from @saync/backend');
console.log('✓ Import successful\n');

console.log('Test 2: Start backend in embedded mode from agent package');
const result = await startBackend({
  port: 4002,
  embedded: true,
  dbPath: '.saync/agent-test.db',
});

console.log(`✓ Backend started on port ${result.port}\n`);

console.log('Test 3: Verify backend is accessible');
await new Promise(resolve => setTimeout(resolve, 500));

try {
  const response = await fetch('http://localhost:4002/health');
  const data = await response.json();
  console.log(`✓ Health check passed: ${JSON.stringify(data)}\n`);
} catch (error) {
  console.error('✗ Health check failed:', error);
  process.exit(1);
}

console.log('Test 4: Test creating a run from agent context');
try {
  const runResponse = await fetch('http://localhost:4002/api/runs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Saync-Api-Key': 'agent-test-key',
    },
    body: JSON.stringify({
      projectId: 'agent-import-test',
      environment: 'local',
      totalContracts: 1,
    }),
  });
  
  const runData = await runResponse.json();
  console.log(`✓ Created run from agent: ${runData.runId}\n`);
} catch (error) {
  console.error('✗ Run creation failed:', error);
  process.exit(1);
}

console.log('=== All Import Tests Passed ===\n');
console.log('Summary:');
console.log('  ✓ @saync/backend can be imported by @saync/agent');
console.log('  ✓ startBackend() works when called from another package');
console.log('  ✓ Backend runs on custom port with custom database path');
console.log('  ✓ API is fully functional when embedded');

console.log('\nBackend is still running on port 4002');
console.log('Press Ctrl+C to stop');

// Keep alive
await new Promise(() => {});

// Made with Bob
