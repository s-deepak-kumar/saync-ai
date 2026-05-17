'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type PaginationContract,
  type PaginationExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncPaginationProps {
  name?: string;
  /** Current page, 1-indexed by convention. */
  page: number;
  /** Total pages. Optional — if absent, renders Prev/Next only. */
  totalPages?: number;
  onChange: (page: number) => void;
  expects?: PaginationContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Pagination> — a minimal Prev/Page-N/Next control. Owns the
 * contract that asserts "changing the page fires an API refetch and
 * writes the page number to the URL".
 *
 * Renders an unstyled <nav> + <button>s. Style with `className` /
 * `style` from the parent — the SDK doesn't ship CSS.
 */
export function SayncPagination({
  name,
  page,
  totalPages,
  onChange,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
}: SayncPaginationProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('pagination'));
  const navRef = useRef<HTMLElement | null>(null);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Pagination');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: PaginationExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'pagination',
      selector: `[data-saync-id="${expectationId}"]`,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

  const go = useCallback(
    (next: number) => {
      if (totalPages && (next < 1 || next > totalPages)) return;
      if (next < 1) return;
      onChange(next);
    },
    [onChange, totalPages],
  );

  return (
    <nav
      ref={navRef}
      aria-label={resolvedName}
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type="pagination"
      className={className}
      style={style}
    >
      <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page">
        ‹ Prev
      </button>
      <span data-saync-current-page={page}>
        {page}
        {totalPages ? ` / ${totalPages}` : null}
      </span>
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={totalPages ? page >= totalPages : false}
        aria-label="Next page"
      >
        Next ›
      </button>
    </nav>
  );
}
SayncPagination.displayName = 'SayncPagination';
