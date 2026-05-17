'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type AccordionContract,
  type AccordionExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

interface AccordionContextValue {
  /** Currently-open item ids — multiple if !exclusive. */
  openIds: Set<string>;
  toggleItem: (itemId: string) => void;
  registerItem: (itemId: string) => void;
  unregisterItem: (itemId: string) => void;
  exclusive: boolean;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

export interface SayncAccordionProps {
  name?: string;
  /** When true (default), only one item open at a time. When false,
   *  any number of items can be open simultaneously. */
  exclusive?: boolean;
  expects?: AccordionContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Accordion> — wraps a list of <Saync.AccordionItem> children.
 * Manages which items are open. If `exclusive` (default), opening
 * one closes others; if not, items can be open simultaneously.
 *
 * The contract can assert structural invariants like `exclusive` (the
 * agent verifies opening a second item closes the first).
 */
export function SayncAccordion({
  name,
  exclusive = true,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncAccordionProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('accordion'));

  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const itemsRef = useRef<Set<string>>(new Set());
  const [itemsVersion, setItemsVersion] = useState(0);

  const registerItem = useCallback((itemId: string) => {
    itemsRef.current.add(itemId);
    setItemsVersion((v) => v + 1);
  }, []);
  const unregisterItem = useCallback((itemId: string) => {
    itemsRef.current.delete(itemId);
    setItemsVersion((v) => v + 1);
  }, []);

  const toggleItem = useCallback(
    (itemId: string) => {
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          if (exclusive) next.clear();
          next.add(itemId);
        }
        return next;
      });
    },
    [exclusive],
  );

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Accordion');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: AccordionExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'accordion',
      selector: `[data-saync-id="${expectationId}"]`,
      itemIds: Array.from(itemsRef.current),
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, expectationId, resolvedName, contractKey, itemsVersion, sourceFile, sourceLine]);

  const accordionCtx: AccordionContextValue = useMemo(
    () => ({ openIds, toggleItem, registerItem, unregisterItem, exclusive }),
    [openIds, toggleItem, registerItem, unregisterItem, exclusive],
  );

  return (
    <AccordionContext.Provider value={accordionCtx}>
      <div
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="accordion"
        data-saync-exclusive={exclusive ? 'true' : 'false'}
        className={className}
        style={style}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}
SayncAccordion.displayName = 'SayncAccordion';

/* ──────────────────────────────────────────────────────────── */

export interface SayncAccordionItemProps {
  /** Title shown in the header button. */
  title: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Content shown when the item is open. */
  children: React.ReactNode;
}

/**
 * <Saync.AccordionItem> — a single expandable section. Registers
 * with the parent <Saync.Accordion> via context.
 *
 * The header is a <button> for keyboard / a11y. The body is a <div>
 * shown/hidden based on the parent's openIds set.
 */
export function SayncAccordionItem({ title, className, style, children }: SayncAccordionItemProps) {
  const parent = useContext(AccordionContext);
  const [itemId] = useState(() => generateExpectationId('accordion-item'));

  useEffect(() => {
    if (!parent) return;
    parent.registerItem(itemId);
    return () => parent.unregisterItem(itemId);
  }, [parent, itemId]);

  const isOpen = parent?.openIds.has(itemId) ?? false;

  return (
    <div data-saync-accordion-item-id={itemId} className={className} style={style}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`${itemId}-content`}
        onClick={() => parent?.toggleItem(itemId)}
        data-saync-accordion-header={itemId}
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
      >
        {title}
      </button>
      {isOpen && (
        <div
          id={`${itemId}-content`}
          role="region"
          data-saync-accordion-content={itemId}
        >
          {children}
        </div>
      )}
    </div>
  );
}
SayncAccordionItem.displayName = 'SayncAccordionItem';
