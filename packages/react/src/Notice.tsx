'use client';

import React, { useEffect, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type NoticeContract,
  type ToastExpectation,
  type AlertExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

type Severity = NonNullable<NoticeContract['severity']>;

const SEVERITY_ROLE: Record<Severity, 'alert' | 'status'> = {
  error: 'alert',
  warn: 'alert',
  info: 'status',
  success: 'status',
};

export interface SayncToastProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  severity?: Severity;
  /** Optional close handler — if provided, a close button renders and
   *  the contract's `dismissible` can be verified. */
  onDismiss?: () => void;
  /** ms after which the toast auto-dismisses. The verifier reads this
   *  attr off the DOM; you're responsible for actually calling onDismiss
   *  via a setTimeout in app code. */
  dismissesAfterMs?: number;
  expects?: NoticeContract;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Toast> — transient notification, typically auto-dismisses.
 * Renders <div role="alert"|"status"> depending on severity. The agent
 * verifies role, text, dismissibility, declared dismiss timer.
 *
 * Toasts are usually rendered conditionally — this component doesn't
 * manage that visibility itself (e.g. via portals). Wrap conditional
 * rendering in app code.
 */
export const SayncToast = React.forwardRef<HTMLDivElement, SayncToastProps>(
  ({ name, severity = 'info', onDismiss, dismissesAfterMs, expects, sourceFile, sourceLine, children, ...divProps }, ref) => {
    return (
      <NoticeRender
        forwardedRef={ref}
        kind="toast"
        name={name}
        severity={severity}
        onDismiss={onDismiss}
        dismissesAfterMs={dismissesAfterMs}
        expects={expects}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        divProps={divProps}
        warnLabel="Toast"
      >
        {children}
      </NoticeRender>
    );
  },
);
SayncToast.displayName = 'SayncToast';

export interface SayncAlertProps extends SayncToastProps {}

/**
 * <Saync.Alert> — persistent inline notification (different from Toast,
 * which is transient and usually positioned via portal). Same contract
 * shape; the verifier dispatches via the `alert` type discriminator.
 */
export const SayncAlert = React.forwardRef<HTMLDivElement, SayncAlertProps>(
  ({ name, severity = 'info', onDismiss, dismissesAfterMs, expects, sourceFile, sourceLine, children, ...divProps }, ref) => {
    return (
      <NoticeRender
        forwardedRef={ref}
        kind="alert"
        name={name}
        severity={severity}
        onDismiss={onDismiss}
        dismissesAfterMs={dismissesAfterMs}
        expects={expects}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        divProps={divProps}
        warnLabel="Alert"
      >
        {children}
      </NoticeRender>
    );
  },
);
SayncAlert.displayName = 'SayncAlert';

/* ──────────────────────────────────────────────────────────── */

interface NoticeRenderProps {
  forwardedRef: React.ForwardedRef<HTMLDivElement>;
  kind: 'toast' | 'alert';
  name?: string;
  severity: Severity;
  onDismiss?: () => void;
  dismissesAfterMs?: number;
  expects?: NoticeContract;
  sourceFile?: string;
  sourceLine?: number;
  divProps: React.HTMLAttributes<HTMLDivElement>;
  warnLabel: string;
  children: React.ReactNode;
}

// Shared body. Differs from sibling only in the registered `type`
// (toast vs alert) and which warn label appears on missing-name warn.
function NoticeRender({
  forwardedRef,
  kind,
  name,
  severity,
  onDismiss,
  dismissesAfterMs,
  expects,
  sourceFile,
  sourceLine,
  divProps,
  warnLabel,
  children,
}: NoticeRenderProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId(kind));

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName(warnLabel);
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const base = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      selector: `[data-saync-id="${expectationId}"]`,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    const expectation: ToastExpectation | AlertExpectation =
      kind === 'toast'
        ? { ...base, type: 'toast' }
        : { ...base, type: 'alert' };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, kind, sourceFile, sourceLine]);

  return (
    <div
      ref={forwardedRef}
      role={SEVERITY_ROLE[severity]}
      aria-live={SEVERITY_ROLE[severity] === 'alert' ? 'assertive' : 'polite'}
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type={kind}
      data-saync-severity={severity}
      data-saync-dismisses-after={dismissesAfterMs ?? undefined}
      data-saync-dismissible={onDismiss ? 'true' : 'false'}
      {...divProps}
    >
      {children}
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          data-saync-notice-dismiss={expectationId}
        >
          ×
        </button>
      )}
    </div>
  );
}
