'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type ChoiceContract,
  type TabsExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { TabsContext, type TabsContextValue, useTabsContext } from './TabsContext.js';
import { warnMissingName } from './internal.js';

export interface SayncTabsProps {
  name?: string;
  /** Currently-selected tab value, controlled by the parent. */
  value?: string;
  onChange?: (value: string) => void;
  expects?: ChoiceContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Tabs> — owns the contract for a tab strip. Functionally a
 * one-of-many selection, so reuses ChoiceContract (validation.allowedValues
 * naturally constrains to declared tab values).
 *
 * Renders a <div role="tablist">. Provides TabsContext so child Tabs
 * register themselves; the registry's `tabValues` stays live.
 */
export function SayncTabs({
  name,
  value,
  onChange,
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncTabsProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('tabs'));

  const tabsRef = useRef<Map<string, string>>(new Map());
  const [tabsVersion, setTabsVersion] = useState(0);
  const registerTab = useCallback((tabId: string, tabValue: string) => {
    tabsRef.current.set(tabId, tabValue);
    setTabsVersion((v) => v + 1);
  }, []);
  const unregisterTab = useCallback((tabId: string) => {
    tabsRef.current.delete(tabId);
    setTabsVersion((v) => v + 1);
  }, []);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Tabs');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const entries = Array.from(tabsRef.current.entries());
    const expectation: TabsExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'tabs',
      selector: `[data-saync-id="${expectationId}"]`,
      tabIds: entries.map(([id]) => id),
      tabValues: entries.map(([, v]) => v),
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, expectationId, resolvedName, contractKey, tabsVersion, sourceFile, sourceLine]);

  const tabsCtx: TabsContextValue = useMemo(
    () => ({
      tabsId: expectationId,
      tabsName: resolvedName,
      currentValue: value,
      onSelect: (v) => onChange?.(v),
      registerTab,
      unregisterTab,
    }),
    [expectationId, resolvedName, value, onChange, registerTab, unregisterTab],
  );

  return (
    <TabsContext.Provider value={tabsCtx}>
      <div
        role="tablist"
        aria-label={resolvedName}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="tabs"
        className={className}
        style={style}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}
SayncTabs.displayName = 'SayncTabs';

/* ──────────────────────────────────────────────────────────── */

export interface SayncTabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value'> {
  /** Unique value this tab represents within its parent <Saync.Tabs>. */
  value: string;
  children: React.ReactNode;
}

/**
 * <Saync.Tab> — a single tab button. Must be inside a <Saync.Tabs>;
 * registers its `value` with the parent and calls `onSelect` on click.
 *
 * Renders <button role="tab"> — accessible by default. The active
 * state (aria-selected, visual styling) is driven by the parent's
 * `currentValue`.
 */
export function SayncTab({ value, onClick, children, ...buttonProps }: SayncTabProps) {
  const tabs = useTabsContext();
  const [tabId] = useState(() => generateExpectationId('tab'));

  useEffect(() => {
    if (!tabs) return;
    tabs.registerTab(tabId, value);
    return () => tabs.unregisterTab(tabId);
  }, [tabs, tabId, value]);

  const isActive = tabs?.currentValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      data-saync-tab-id={tabId}
      data-saync-tabs-id={tabs?.tabsId}
      data-saync-value={value}
      onClick={(e) => {
        tabs?.onSelect(value);
        onClick?.(e);
      }}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
SayncTab.displayName = 'SayncTab';
