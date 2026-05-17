'use client';

import React, { useEffect, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type SpinnerContract,
  type ProgressContract,
  type SkeletonContract,
  type SpinnerExpectation,
  type ProgressExpectation,
  type SkeletonExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

/* ═══════════════════════════════════════════════════════════
   SPINNER
   ═══════════════════════════════════════════════════════════ */

export interface SayncSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  /** Optional a11y label describing what's loading. */
  label?: string;
  expects?: SpinnerContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Spinner> — wraps a <div role="status" aria-label={label}>.
 * The SDK doesn't ship the animation — style it yourself. The contract
 * just asserts the a11y attributes are present.
 */
export const SayncSpinner = React.forwardRef<HTMLDivElement, SayncSpinnerProps>(
  ({ name, label = 'Loading', expects, sourceFile, sourceLine, children, ...divProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('spinner'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Spinner');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: SpinnerExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'spinner',
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

    return (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="spinner"
        {...divProps}
      >
        {children ?? <span className="sr-only">{label}</span>}
      </div>
    );
  },
);
SayncSpinner.displayName = 'SayncSpinner';

/* ═══════════════════════════════════════════════════════════
   PROGRESS
   ═══════════════════════════════════════════════════════════ */

export interface SayncProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'> {
  name?: string;
  /** Current value. Should be between min and max. */
  value: number;
  min?: number;
  max?: number;
  expects?: ProgressContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Progress> — wraps a <div role="progressbar"> with the correct
 * aria-valuenow / valuemin / valuemax attributes. Used for upload
 * progress, batch operations, etc.
 *
 * Doesn't ship a visual — render your own fill bar inside via `children`,
 * or style the data-saync-progress-fill child if you want a default.
 */
export const SayncProgress = React.forwardRef<HTMLDivElement, SayncProgressProps>(
  (
    { name, value, min = 0, max = 100, expects, sourceFile, sourceLine, children, style, ...divProps },
    ref,
  ) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('progress'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Progress');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: ProgressExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'progress',
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={resolvedName}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="progress"
        style={{
          background: '#E2E8F0',
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          ...style,
        }}
        {...divProps}
      >
        {children ?? (
          <div
            data-saync-progress-fill={expectationId}
            style={{
              width: `${pct}%`,
              height: '100%',
              background: '#0F172A',
              transition: 'width 200ms',
            }}
          />
        )}
      </div>
    );
  },
);
SayncProgress.displayName = 'SayncProgress';

/* ═══════════════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════════════ */

export interface SayncSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  /** Width of the skeleton block — CSS value. */
  width?: number | string;
  /** Height of the skeleton block — CSS value. */
  height?: number | string;
  expects?: SkeletonContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Skeleton> — placeholder block while data loads. Decorative,
 * so renders aria-hidden="true". The contract asserts that.
 */
export const SayncSkeleton = React.forwardRef<HTMLDivElement, SayncSkeletonProps>(
  ({ name, width = '100%', height = 16, expects, sourceFile, sourceLine, style, ...divProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('skeleton'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Skeleton');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: SkeletonExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'skeleton',
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

    return (
      <div
        ref={ref}
        aria-hidden="true"
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="skeleton"
        style={{
          width,
          height,
          background: 'linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)',
          backgroundSize: '200% 100%',
          animation: 'saync-skeleton 1.4s linear infinite',
          borderRadius: 4,
          ...style,
        }}
        {...divProps}
      />
    );
  },
);
SayncSkeleton.displayName = 'SayncSkeleton';
