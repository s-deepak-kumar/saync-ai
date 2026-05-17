'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type DisclosureContract,
  type PopoverExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncPopoverProps {
  name?: string;
  /** Element rendered as the click target — opens the popover. */
  trigger: React.ReactNode;
  expects?: DisclosureContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Popover> — small uncontrolled disclosure tied to its trigger.
 * No backdrop, no focus trap. Closes on outside click and Escape by
 * default (the agent asserts these via the contract).
 *
 * For a controlled disclosure with a backdrop, use <Saync.Modal>;
 * for hover behavior, use <Saync.Tooltip>.
 */
export function SayncPopover({
  name,
  trigger,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncPopoverProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('popover'));
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Popover');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: PopoverExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'popover',
      selector: `[data-saync-id="${expectationId}"]`,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

  // Close on outside click + Escape — standard popover behaviors that
  // the contract can assert as `closesOnOutsideClick` / `closesOnEscape`.
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div
      ref={wrapRef}
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type="popover"
      className={className}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
      >
        {trigger}
      </button>
      {isOpen && (
        <div
          role="dialog"
          aria-label={resolvedName}
          data-saync-popover-panel={expectationId}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'white',
            border: '1px solid #E2E8F0',
            padding: 12,
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
            zIndex: 100,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
SayncPopover.displayName = 'SayncPopover';
