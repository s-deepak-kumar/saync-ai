'use client';

import React, { useEffect, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type BadgeContract,
  type BadgeExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  name?: string;
  expects?: BadgeContract;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Badge> — small inline indicator. Renders <span role="status">.
 * The contract checks visibility, contained text, or that text parses
 * as a number within bounds (useful for cart-count badges).
 */
export const SayncBadge = React.forwardRef<HTMLSpanElement, SayncBadgeProps>(
  ({ name, expects, sourceFile, sourceLine, children, ...spanProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('badge'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Badge');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: BadgeExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'badge',
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

    return (
      <span
        ref={ref}
        role="status"
        aria-label={resolvedName}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="badge"
        {...spanProps}
      >
        {children}
      </span>
    );
  },
);
SayncBadge.displayName = 'SayncBadge';
