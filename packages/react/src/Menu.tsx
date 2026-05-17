'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type MenuContract,
  type MenuExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

interface MenuContextValue {
  menuId: string;
  isOpen: boolean;
  close: () => void;
  registerItem: (itemId: string) => void;
  unregisterItem: (itemId: string) => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

export interface SayncMenuProps {
  name?: string;
  /** Button label / element that opens the menu. Required for accessibility. */
  trigger: React.ReactNode;
  expects?: MenuContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Menu> — dropdown menu. Owns the contract for open/close
 * behavior and accessibility (closes on Escape, on outside click).
 *
 * Renders a <button> trigger + a <ul role="menu"> panel. Self-managed
 * open state — no controlled-mode variant in v1; if you need it, lift
 * `isOpen` later by adding a `open` prop.
 */
export function SayncMenu({
  name,
  trigger,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncMenuProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('menu'));
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Menu');
  const contractKey = JSON.stringify(expects ?? null);

  // Register / unregister on mount + when children change.
  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: MenuExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'menu',
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

  // Close on outside click + Escape — these are the standard menu
  // a11y behaviors the contract can assert (`closesOnOutsideClick`,
  // `closesOnEscape`).
  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);
  const menuCtx: MenuContextValue = useMemo(
    () => ({ menuId: expectationId, isOpen, close, registerItem, unregisterItem }),
    [expectationId, isOpen, close, registerItem, unregisterItem],
  );

  return (
    <MenuContext.Provider value={menuCtx}>
      <div
        ref={containerRef}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="menu"
        className={className}
        style={{ position: 'relative', display: 'inline-block', ...style }}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((o) => !o)}
        >
          {trigger}
        </button>
        {isOpen && (
          <ul role="menu" data-saync-menu-panel={expectationId}>
            {children}
          </ul>
        )}
      </div>
    </MenuContext.Provider>
  );
}
SayncMenu.displayName = 'SayncMenu';

/* ──────────────────────────────────────────────────────────── */

export interface SayncMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** When provided, renders as an <a> instead of a <button>. */
  href?: string;
  children: React.ReactNode;
}

/**
 * <Saync.MenuItem> — single dropdown item. Renders as a <button>
 * (action) or <a> (navigation) depending on whether `href` is set.
 * Closes the parent menu after activation.
 *
 * MenuItems don't register their own contract — the parent <Saync.Menu>
 * tracks them via `itemIds`. If you need an action-item with its own
 * contract (e.g. an API call), wrap a <Saync.Button> inside instead.
 */
export function SayncMenuItem({ href, onClick, children, ...rest }: SayncMenuItemProps) {
  const menu = useContext(MenuContext);
  const [itemId] = useState(() => generateExpectationId('menu-item'));

  useEffect(() => {
    if (!menu) return;
    menu.registerItem(itemId);
    return () => menu.unregisterItem(itemId);
  }, [menu, itemId]);

  const close = menu?.close ?? (() => {});

  if (href) {
    return (
      <li role="none">
        <a
          href={href}
          role="menuitem"
          data-saync-menu-item-id={itemId}
          onClick={(e) => {
            close();
            onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
          }}
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li role="none">
      <button
        type="button"
        role="menuitem"
        data-saync-menu-item-id={itemId}
        onClick={(e) => {
          close();
          onClick?.(e);
        }}
        {...rest}
      >
        {children}
      </button>
    </li>
  );
}
SayncMenuItem.displayName = 'SayncMenuItem';
