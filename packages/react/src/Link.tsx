'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type NavigationContract,
  type LinkExpectation,
  type NavLinkExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  name?: string;
  expects?: NavigationContract;
  /** Required so the contract knows where the link points. Matches HTML semantics. */
  href: string;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Link> — wraps a native <a>. Registers a navigation contract:
 * "after click, the user should be at toUrl, and `appears` should
 * render at the destination."
 *
 * For framework-aware links (Next.js Link, React Router NavLink),
 * compose this on top: wrap your framework's component as `children`
 * inside <Saync.Link>, or copy this file and swap the <a>.
 */
export const SayncLink = React.forwardRef<HTMLAnchorElement, SayncLinkProps>(
  ({ name, expects, href, sourceFile, sourceLine, children, ...anchorProps }, ref) => {
    return (
      <NavigationAnchor
        forwardedRef={ref}
        kind="link"
        name={name}
        expects={expects}
        href={href}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        anchorProps={anchorProps}
        warnLabel="Link"
      >
        {children}
      </NavigationAnchor>
    );
  },
);
SayncLink.displayName = 'SayncLink';

export interface SayncNavLinkProps extends SayncLinkProps {}

/**
 * <Saync.NavLink> — like <Saync.Link> but additionally asserts active-state
 * styling when the current URL matches `expects.activeOn` (or `href` if
 * activeOn is omitted). Renders the same anchor; the agent runs the
 * active-state check separately.
 */
export const SayncNavLink = React.forwardRef<HTMLAnchorElement, SayncNavLinkProps>(
  ({ name, expects, href, sourceFile, sourceLine, children, ...anchorProps }, ref) => {
    return (
      <NavigationAnchor
        forwardedRef={ref}
        kind="nav-link"
        name={name}
        expects={expects}
        href={href}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        anchorProps={anchorProps}
        warnLabel="NavLink"
      >
        {children}
      </NavigationAnchor>
    );
  },
);
SayncNavLink.displayName = 'SayncNavLink';

/* ──────────────────────────────────────────────────────────── */

interface NavigationAnchorProps {
  forwardedRef: React.ForwardedRef<HTMLAnchorElement>;
  kind: 'link' | 'nav-link';
  name?: string;
  expects?: NavigationContract;
  href: string;
  sourceFile?: string;
  sourceLine?: number;
  anchorProps: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
  warnLabel: string;
  children?: React.ReactNode;
}

// Shared body for both link variants — they differ only in the type
// discriminator. Keeps the per-component file small.
function NavigationAnchor({
  forwardedRef,
  kind,
  name,
  expects,
  href,
  sourceFile,
  sourceLine,
  anchorProps,
  warnLabel,
  children,
}: NavigationAnchorProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId(kind));
  const anchorRef = useRef<HTMLAnchorElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLAnchorElement | null) => {
      anchorRef.current = node;
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

    const base = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      selector: `a[data-saync-id="${expectationId}"]`,
      href,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    const expectation: LinkExpectation | NavLinkExpectation =
      kind === 'link'
        ? { ...base, type: 'link' }
        : { ...base, type: 'nav-link' };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, href, kind, sourceFile, sourceLine]);

  return (
    <a
      ref={setRefs}
      href={href}
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type={kind}
      {...anchorProps}
    >
      {children}
    </a>
  );
}
