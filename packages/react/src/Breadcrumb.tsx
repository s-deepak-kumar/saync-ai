'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type BreadcrumbContract,
  type BreadcrumbExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

interface BreadcrumbContextValue {
  registerItem: (itemId: string, href: string | null) => void;
  unregisterItem: (itemId: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null);

export interface SayncBreadcrumbProps {
  name?: string;
  expects?: BreadcrumbContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Breadcrumb> — wraps a <nav> hierarchy. Owns the contract;
 * child <Saync.BreadcrumbItem> components register themselves so
 * the agent can verify structural properties like "last item is the
 * current page (non-link)".
 */
export function SayncBreadcrumb({
  name,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncBreadcrumbProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('breadcrumb'));

  // Insertion order matters here — breadcrumbs are an ordered list, so
  // a Map preserves child-render order naturally.
  const itemsRef = useRef<Map<string, string | null>>(new Map());
  const [itemsVersion, setItemsVersion] = useState(0);
  const registerItem = useCallback((itemId: string, href: string | null) => {
    itemsRef.current.set(itemId, href);
    setItemsVersion((v) => v + 1);
  }, []);
  const unregisterItem = useCallback((itemId: string) => {
    itemsRef.current.delete(itemId);
    setItemsVersion((v) => v + 1);
  }, []);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Breadcrumb');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const entries = Array.from(itemsRef.current.entries());
    const expectation: BreadcrumbExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'breadcrumb',
      selector: `[data-saync-id="${expectationId}"]`,
      itemIds: entries.map(([id]) => id),
      itemHrefs: entries.map(([, h]) => h),
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, expectationId, resolvedName, contractKey, itemsVersion, sourceFile, sourceLine]);

  const breadcrumbCtx = useMemo(
    () => ({ registerItem, unregisterItem }),
    [registerItem, unregisterItem],
  );

  return (
    <BreadcrumbContext.Provider value={breadcrumbCtx}>
      <nav
        aria-label={resolvedName ?? 'Breadcrumb'}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="breadcrumb"
        className={className}
        style={style}
      >
        {children}
      </nav>
    </BreadcrumbContext.Provider>
  );
}
SayncBreadcrumb.displayName = 'SayncBreadcrumb';

/* ──────────────────────────────────────────────────────────── */

export interface SayncBreadcrumbItemProps {
  /** When set, renders an <a>. When omitted, renders a <span> with
   *  aria-current="page" — i.e. the final crumb. */
  href?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * <Saync.BreadcrumbItem> — a single breadcrumb. Registers its href
 * (or null for the current page) with the parent <Saync.Breadcrumb>.
 */
export function SayncBreadcrumbItem({ href, className, style, children }: SayncBreadcrumbItemProps) {
  const parent = useContext(BreadcrumbContext);
  const [itemId] = useState(() => generateExpectationId('breadcrumb-item'));

  useEffect(() => {
    if (!parent) return;
    parent.registerItem(itemId, href ?? null);
    return () => parent.unregisterItem(itemId);
  }, [parent, itemId, href]);

  return href ? (
    <a
      href={href}
      data-saync-breadcrumb-item-id={itemId}
      className={className}
      style={style}
    >
      {children}
    </a>
  ) : (
    <span
      aria-current="page"
      data-saync-breadcrumb-item-id={itemId}
      className={className}
      style={style}
    >
      {children}
    </span>
  );
}
SayncBreadcrumbItem.displayName = 'SayncBreadcrumbItem';
