'use client';

import React, { useEffect, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type ListContract,
  type TableContract,
  type CardContract,
  type TreeContract,
  type ListExpectation,
  type TableExpectation,
  type CardExpectation,
  type TreeExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

/* ═══════════════════════════════════════════════════════════
   LIST
   ═══════════════════════════════════════════════════════════ */

export interface SayncListProps extends React.HTMLAttributes<HTMLUListElement> {
  name?: string;
  /** Render <ol> instead of <ul>. */
  ordered?: boolean;
  expects?: ListContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.List> — wraps a native <ul> (or <ol> if `ordered`). Doesn't
 * dictate child structure; your code renders <li> elements as usual.
 * The verifier counts visible <li> descendants and asserts
 * min/maxItems, every item contains expected text, etc.
 */
export const SayncList = React.forwardRef<HTMLUListElement, SayncListProps>(
  ({ name, ordered = false, expects, sourceFile, sourceLine, children, ...listProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('list'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('List');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: ListExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'list',
        ordered,
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, ordered, sourceFile, sourceLine]);

    // Branch explicitly — TypeScript can't reconcile the ref union
    // between <ul> (HTMLUListElement) and <ol> (HTMLOListElement) when
    // we use a dynamic <Tag>. The duplication is cheap; the alternative
    // is an ugly cast that loses ref-type safety for users.
    const shared = {
      role: 'list',
      'data-saync-id': expectationId,
      'data-saync-name': resolvedName,
      'data-saync-type': 'list',
      ...listProps,
    };
    return ordered ? (
      <ol ref={ref as React.Ref<HTMLOListElement>} {...shared}>{children}</ol>
    ) : (
      <ul ref={ref} {...shared}>{children}</ul>
    );
  },
);
SayncList.displayName = 'SayncList';

/* ═══════════════════════════════════════════════════════════
   TABLE
   ═══════════════════════════════════════════════════════════ */

export interface SayncTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  name?: string;
  /** Optional caption rendered as <caption>. The verifier asserts its
   *  text content against `expects.captionContains`. */
  caption?: string;
  expects?: TableContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Table> — wraps a native <table>. Your code renders
 * <thead>/<tbody>/<tr>/<th>/<td>; the verifier reads header text in
 * document order, counts rows, asserts captions.
 */
export const SayncTable = React.forwardRef<HTMLTableElement, SayncTableProps>(
  ({ name, caption, expects, sourceFile, sourceLine, children, ...tableProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('table'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Table');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: TableExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'table',
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

    return (
      <table
        ref={ref}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="table"
        {...tableProps}
      >
        {caption && <caption>{caption}</caption>}
        {children}
      </table>
    );
  },
);
SayncTable.displayName = 'SayncTable';

/* ═══════════════════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════════════════ */

export interface SayncCardProps extends React.HTMLAttributes<HTMLElement> {
  name?: string;
  /** When provided, makes the whole card clickable. The contract's
   *  `clickable: true` is asserted via the presence of a wrapping <a>. */
  href?: string;
  expects?: CardContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Card> — wraps <article>. When `href` is set, the whole card
 * becomes a clickable <a> wrapping the article (matches how cards
 * are usually built in product UIs).
 */
export const SayncCard = React.forwardRef<HTMLElement, SayncCardProps>(
  ({ name, href, expects, sourceFile, sourceLine, children, ...articleProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('card'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Card');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: CardExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'card',
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

    const article = (
      <article
        ref={ref}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="card"
        data-saync-clickable={href ? 'true' : 'false'}
        {...articleProps}
      >
        {children}
      </article>
    );

    return href ? (
      <a href={href} style={{ display: 'block', color: 'inherit', textDecoration: 'inherit' }}>
        {article}
      </a>
    ) : (
      article
    );
  },
);
SayncCard.displayName = 'SayncCard';

/* ═══════════════════════════════════════════════════════════
   TREE
   ═══════════════════════════════════════════════════════════ */

export interface SayncTreeProps extends React.HTMLAttributes<HTMLUListElement> {
  name?: string;
  expects?: TreeContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Tree> — wraps <ul role="tree">. Your code renders
 * <li role="treeitem"> descendants (potentially nested). The verifier
 * counts treeitems via document.querySelectorAll('[role="treeitem"]').
 *
 * No subcomponent for tree nodes — that's a decision for app code.
 * If you want individual node contracts (expand/collapse), use
 * <Saync.Button> on the expand affordance.
 */
export const SayncTree = React.forwardRef<HTMLUListElement, SayncTreeProps>(
  ({ name, expects, sourceFile, sourceLine, children, ...listProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('tree'));

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Tree');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: TreeExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'tree',
        selector: `[data-saync-id="${expectationId}"]`,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, contractKey, sourceFile, sourceLine]);

    return (
      <ul
        ref={ref}
        role="tree"
        aria-label={resolvedName}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="tree"
        {...listProps}
      >
        {children}
      </ul>
    );
  },
);
SayncTree.displayName = 'SayncTree';
