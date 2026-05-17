'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type LayoutContract,
  type RegionExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  expects?: LayoutContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Region> — non-interactive wrapper that declares layout
 * expectations for whatever it contains. Renders <div>. Use
 * <Saync.Section> for the same thing semantically as <section>.
 *
 * Layout contracts are static — the agent measures the rendered
 * element against `visibleAt` viewports, `notClipped`, `minTapTarget`,
 * etc. Nothing is driven.
 */
export const SayncRegion = React.forwardRef<HTMLDivElement, SayncRegionProps>(
  ({ name, expects, sourceFile, sourceLine, children, ...divProps }, ref) => {
    return (
      <LayoutWrap
        forwardedRef={ref}
        tagName="div"
        name={name}
        expects={expects}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        elementProps={divProps}
        warnLabel="Region"
      >
        {children}
      </LayoutWrap>
    );
  },
);
SayncRegion.displayName = 'SayncRegion';

export interface SayncSectionProps extends React.HTMLAttributes<HTMLElement> {
  name?: string;
  expects?: LayoutContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Section> — same contract shape as <Saync.Region>, renders
 * <section> for semantic structure. The expectation is registered
 * with `tagName: 'section'` so the agent knows what to expect in the DOM.
 */
export const SayncSection = React.forwardRef<HTMLElement, SayncSectionProps>(
  ({ name, expects, sourceFile, sourceLine, children, ...elementProps }, ref) => {
    return (
      <LayoutWrap
        forwardedRef={ref}
        tagName="section"
        name={name}
        expects={expects}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        elementProps={elementProps}
        warnLabel="Section"
      >
        {children}
      </LayoutWrap>
    );
  },
);
SayncSection.displayName = 'SayncSection';

/* ──────────────────────────────────────────────────────────── */

interface LayoutWrapProps {
  forwardedRef: React.ForwardedRef<any>;
  tagName: 'div' | 'section';
  name?: string;
  expects?: LayoutContract;
  sourceFile?: string;
  sourceLine?: number;
  elementProps: React.HTMLAttributes<HTMLElement>;
  warnLabel: string;
  children?: React.ReactNode;
}

// Region and Section differ only in the rendered HTML tag and the
// `tagName` field on the expectation. Everything else is shared.
function LayoutWrap({
  forwardedRef,
  tagName,
  name,
  expects,
  sourceFile,
  sourceLine,
  elementProps,
  warnLabel,
  children,
}: LayoutWrapProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId(tagName === 'section' ? 'section' : 'region'));
  const elRef = useRef<HTMLElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      elRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName(warnLabel);
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: RegionExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'region',
      tagName,
      selector: `[data-saync-id="${expectationId}"]`,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, tagName, sourceFile, sourceLine]);

  // Render the chosen tag with all the same data-* attrs.
  const sharedProps = {
    ref: setRefs as React.Ref<any>,
    'data-saync-id': expectationId,
    'data-saync-name': resolvedName,
    'data-saync-type': 'region',
    ...elementProps,
  };
  return tagName === 'section' ? (
    <section {...sharedProps}>{children}</section>
  ) : (
    <div {...sharedProps}>{children}</div>
  );
}
