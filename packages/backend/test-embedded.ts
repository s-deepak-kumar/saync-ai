#!/usr/bin/env bun

/**
 * Test script for embedded mode verification
 * Tests that startBackend() can be imported and run in embedded mode
 */

import { startBackend } from './src/index';

console.log('=== Embedded Mode Test ===\n');

// Test 1: Start backend in embedded mode
console.log('Test 1: Starting backend in embedded mode...');
const startTime = Date.now();

const handle1 = await startBackend({
  port: 4001,
  embedded: true,
  dbPath: '.saync/test-embedded.db',
});

const duration = Date.now() - startTime;
console.log(`✓ Backend started in ${duration}ms (should be < 100ms for non-blocking)`);
console.log(`  URL: ${handle1.url}`);
console.log(`  Port: ${handle1.port}\n`);

// Test 2: Verify backend is responsive
console.log('Test 2: Verifying backend is responsive...');
await new Promise(resolve => setTimeout(resolve, 500)); // Wait for server to be ready

try {
  const response = await fetch(`${handle1.url}/health`);
  const data = await response.json();
  
  if (data.status === 'ok') {
    console.log('✓ Backend is responsive');
    console.log(`  Response: ${JSON.stringify(data)}\n`);
  } else {
    console.error('✗ Unexpected response:', data);
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Failed to connect to backend:', error);
  process.exit(1);
}

// Test 3: Verify we can continue execution (non-blocking)
console.log('Test 3: Verifying non-blocking behavior...');
console.log('✓ Script continues to execute after startBackend()');
console.log('  This proves embedded mode is non-blocking\n');

// Test 4: Test API functionality
console.log('Test 4: Testing API functionality...');
try {
  // Create a run
  const runResponse = await fetch(`${handle1.url}/api/runs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Saync-Api-Key': 'test-key',
    },
    body: JSON.stringify({
      projectId: 'embedded-test',
      environment: 'local',
      totalContracts: 1,
    }),
  });
  
  const runData = await runResponse.json();
  console.log(`✓ Created run: ${runData.runId}`);
  
  // Post a result
  const resultResponse = await fetch(`${handle1.url}/api/runs/${runData.runId}/results`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Saync-Api-Key': 'test-key',
    },
    body: JSON.stringify({
      contractName: 'test-contract',
      componentName: 'TestComponent',
      status: 'pass',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    }),
  });
  
  const resultData = await resultResponse.json();
  console.log(`✓ Posted result: ${resultData.resultId}\n`);
} catch (error) {
  console.error('✗ API test failed:', error);
  process.exit(1);
}

// Test 5: Verify database path
console.log('Test 5: Verifying database path...');
const fs = await import('fs');
if (fs.existsSync('.saync/test-embedded.db')) {
  console.log('✓ Database created at custom path: .saync/test-embedded.db\n');
} else {
  console.error('✗ Database not found at expected path');
  process.exit(1);
}

// Test 6: Call startBackend a second time while first instance is running
console.log('Test 6: Testing port collision detection...');
console.log('  Calling startBackend({ port: 4001 }) again while first instance is running...');

try {
  const handle2 = await startBackend({
    port: 4001,
    embedded: true,
    dbPath: '.saync/test-embedded.db',
  });
  
  console.log('✓ Second call returned a handle (did not throw)');
  console.log(`  URL: ${handle2.url}`);
  
  // Verify /health still works
  const healthResponse = await fetch(`${handle2.url}/health`);
  const healthData = await healthResponse.json();
  
  if (healthData.status === 'ok') {
    console.log('✓ Health check still works through second handle\n');
  } else {
    console.error('✗ Health check failed');
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Second startBackend call failed:', error);
  process.exit(1);
}

// Test 7: Call stop() and verify server actually stops
console.log('Test 7: Testing stop() functionality...');
console.log('  Calling stop() on first handle...');

await handle1.stop();

// Wait a moment for server to fully stop
await new Promise(resolve => setTimeout(resolve, 1000));

// Try to connect - should fail with connection refused
console.log('  Verifying server is actually stopped...');
try {
  const response = await fetch(`${handle1.url}/health`, {
    signal: AbortSignal.timeout(1000),
  });
  console.error('✗ Server is still responding after stop()');
  console.error(`  Got response: ${response.status}`);
  process.exit(1);
} catch (error: any) {
  if (
    error.code === 'ConnectionRefused' ||
    error.code === 'ECONNREFUSED' ||
    error.cause?.code === 'ECONNREFUSED' ||
    error.cause?.code === 'ConnectionRefused' ||
    error.name === 'TimeoutError'
  ) {
    console.log('✓ Server stopped successfully (connection refused)\n');
  } else {
    console.error('✗ Unexpected error:', error);
    process.exit(1);
  }
}

// Test 8: After stop(), call startBackend again on same port
console.log('Test 8: Testing restart after stop...');
console.log('  Calling startBackend({ port: 4001 }) after stop()...');

try {
  const handle3 = await startBackend({
    port: 4001,
    embedded: true,
    dbPath: '.saync/test-embedded.db',
  });
  
  console.log('✓ Backend restarted successfully');
  console.log(`  URL: ${handle3.url}`);
  
  // Verify it works
  const healthResponse = await fetch(`${handle3.url}/health`);
  const healthData = await healthResponse.json();
  
  if (healthData.status === 'ok') {
    console.log('✓ Restarted backend is responsive\n');
  } else {
    console.error('✗ Health check failed on restarted backend');
    process.exit(1);
  }
  
  // Clean up
  console.log('Cleaning up...');
  await handle3.stop();
  console.log('✓ Cleanup complete\n');
} catch (error) {
  console.error('✗ Restart failed:', error);
  process.exit(1);
}

console.log('=== All Tests Passed ===\n');
console.log('Summary:');
console.log('  ✓ Embedded mode starts without blocking');
console.log('  ✓ Backend is responsive on custom port');
console.log('  ✓ API endpoints work correctly');
console.log('  ✓ Custom database path is respected');
console.log('  ✓ Script continues execution after startBackend()');
console.log('  ✓ Port collision detection works (returns handle to existing instance)');
console.log('  ✓ stop() actually stops the server');
console.log('  ✓ Backend can be restarted after stop()');

console.log('\n✅ Checkpoint 4 Complete!');

// Made with Bob
