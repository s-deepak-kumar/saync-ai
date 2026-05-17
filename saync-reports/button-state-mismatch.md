---
title: "Button state doesn't match loading contract"
severity: critical
filePath: src/App.tsx
firstSeen: 2026-05-16T19:45:00.000Z
occurrences: 12
status: open
reproducibility: Always
affectedViewports: ["desktop", "mobile"]
---

The "Increment" button fails to show loading state during async operations, violating the declared contract that requires visual feedback during state transitions.

## Expected

Button should display loading spinner and be disabled during async increment operation, as specified in the `SayncButton` contract.

## Observed

Button remains in default state with no visual feedback. Users can click multiple times, causing duplicate requests.

## How to reproduce

1. Click the "Increment" button
2. Observe button state during the 1-second delay
3. Notice lack of loading indicator
4. Attempt to click again (should be prevented but isn't)

## Root cause

The `App.tsx` component doesn't pass the `loading` prop to the `SayncButton` component. The async operation updates state but doesn't trigger the loading UI contract.

```tsx
// Current implementation (broken)
function App() {
  const [count, setCount] = useState(0);
  
  const handleIncrement = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCount(count + 1);
  };
  
  return <SayncButton onClick={handleIncrement}>Increment</SayncButton>;
}
```

## Suggested fix

Add loading state management and pass it to the button component:

```tsx
// Fixed implementation
function App() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const handleIncrement = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCount(count + 1);
    setLoading(false);
  };
  
  return <SayncButton onClick={handleIncrement} loading={loading}>Increment</SayncButton>;
}
```

This ensures the button contract is fulfilled and users get proper feedback during async operations.