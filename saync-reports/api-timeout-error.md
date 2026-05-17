---
title: "API request timeout not handled gracefully"
severity: high
filePath: src/api/client.ts
firstSeen: 2026-05-16T18:30:00.000Z
occurrences: 5
status: open
reproducibility: Intermittent
affectedViewports: ["desktop", "mobile"]
---

API requests fail silently when they timeout, leaving the UI in a loading state indefinitely. The error handling contract requires graceful degradation with user feedback.

## Expected

When an API request times out after 5 seconds, the UI should display an error message and allow retry. Loading state should clear.

## Observed

Request hangs indefinitely. No error message shown. User must refresh the page to recover.

## How to reproduce

1. Simulate slow network (Chrome DevTools → Network → Slow 3G)
2. Click "Fetch Data" button
3. Wait more than 5 seconds
4. Observe UI remains in loading state
5. No error message appears

## Root cause

The fetch implementation doesn't include a timeout mechanism. The Promise never rejects on timeout, so error boundaries aren't triggered.

```typescript
// Current implementation (broken)
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}
```

## Suggested fix

Implement timeout with AbortController and proper error handling:

```typescript
// Fixed implementation
async function fetchData(timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch('/api/data', { 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}
```

This ensures timeouts are caught and surfaced to the user properly.