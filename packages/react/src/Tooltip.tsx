'use client';

import React, { useEffect, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type TooltipContract,
  type TooltipExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncTooltipProps {
  name?: string;
  /** The text/content shown inside the tooltip bubble. */
  content: React.ReactNode;
  expects?: TooltipContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  /** The element the tooltip describes. Tooltip listens to hover/focus
   *  on this child element. */
  children: React.ReactNode;
}

/**
 * <Saync.Tooltip> — wraps a child element, shows a bubble on hover
 * or keyboard focus. Closes on mouse leave / blur. The contract can
 * assert: shows on hover, contains specific text, hides on blur.
 *
 * Distinct from Popover (which is click-driven, larger, modal-ish).
 * Use Tooltip for brief descriptive text only.
 */
export function SayncTooltip({
  name,
  content,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncTooltipProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('tooltip'));
  const [visible, setVisible] = useState(false);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Tooltip');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: TooltipExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'tooltip',
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
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type="tooltip"
      className={className}
      style={{ position: 'relative', display: 'inline-block', ...style }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          data-saync-tooltip-content={expectationId}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: 'white',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: 'nowrap',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
SayncTooltip.displayName = 'SayncTooltip';
