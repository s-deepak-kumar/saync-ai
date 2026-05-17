'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Optional name for the bounded region — surfaces in the recorded event. */
  name?: string;
  /** Render this when an error is caught. Falls back to a tiny inline message. */
  fallback?: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * <Saync.ErrorBoundary>
 *
 * Standard React class-component error boundary, plus a side effect:
 * caught errors are pushed into window.__SAYNC__.events so the agent
 * (and prod-mode reporter) can surface "this part of the tree crashed
 * during the flow".
 *
 * Use it around regions where you want to assert "no unhandled errors":
 *
 *   <Saync.ErrorBoundary name="checkout-flow">
 *     <Checkout />
 *   </Saync.ErrorBoundary>
 *
 * Has to be a class component — React's error-boundary API isn't
 * available as a hook.
 */
export class SayncErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (typeof window === 'undefined') return;
    const g = window.__SAYNC__;
    if (!g) return; // No Provider mounted → silently skip; React still logs the error.
    g.events.push({
      name: 'react-error',
      data: {
        boundary: this.props.name ?? null,
        message: error.message,
        stack: error.stack ?? null,
        componentStack: info.componentStack ?? null,
      },
      timestamp: Date.now(),
    });
  }

  render() {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') return fallback(error);
      if (fallback !== undefined) return fallback;
      return (
        <div role="alert" style={{ padding: 16, color: '#991B1B', fontFamily: 'system-ui' }}>
          Something went wrong{this.props.name ? ` in ${this.props.name}` : ''}.
        </div>
      );
    }
    return this.props.children;
  }
}
