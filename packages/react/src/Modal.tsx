'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type DisclosureContract,
  type ModalExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { warnMissingName } from './internal.js';

export interface SayncModalProps {
  name?: string;
  /** Controlled open state. Modal is only useful as controlled — the
   *  trigger lives elsewhere in your app (usually a button somewhere). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expects?: DisclosureContract;
  /** Whether the dialog needs an immediate response (role="alertdialog"). */
  alert?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Modal> — controlled disclosure with a backdrop. Renders nothing
 * when `open` is false. When open, renders a backdrop + panel; closes
 * on Escape and backdrop click by default (those behaviors are also
 * what the contract asserts).
 *
 * Use <Saync.Drawer> for side-anchored variants — same contract shape,
 * different positioning + a `side` discriminator on the expectation.
 *
 * `<Saync.Dialog>` is an alias of this with `alert={true}` — renders
 * role="alertdialog" instead of role="dialog" for assertive-prompt UX.
 */
export function SayncModal({
  name,
  open,
  onOpenChange,
  expects,
  alert = false,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncModalProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('modal'));
  const panelRef = useRef<HTMLDivElement | null>(null);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Modal');
  const contractKey = JSON.stringify(expects ?? null);

  // Register the expectation. Stays registered while the component
  // mounts, regardless of open/closed state — the agent toggles via
  // the page's controls and observes.
  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: ModalExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'modal',
      role: alert ? 'alertdialog' : 'dialog',
      selector: `[data-saync-id="${expectationId}"]`,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, alert, sourceFile, sourceLine]);

  // Close-on-Escape — only when open and only if the contract doesn't
  // forbid it (default behavior is to close on Escape).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div
      role="presentation"
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type="modal"
      onClick={(e) => {
        // Only the backdrop (the div itself) closes — clicks inside the
        // panel shouldn't propagate up to here. We stop propagation in
        // the panel below to keep that invariant.
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        ref={panelRef}
        role={alert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={resolvedName}
        data-saync-modal-panel={expectationId}
        className={className}
        style={{
          background: 'white',
          padding: 24,
          borderRadius: 8,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
SayncModal.displayName = 'SayncModal';

/**
 * <Saync.Dialog> — alias of <Saync.Modal> with `alert={true}`. Renders
 * role="alertdialog" so screen readers announce it more assertively.
 */
export function SayncDialog(props: Omit<SayncModalProps, 'alert'>) {
  return <SayncModal {...props} alert={true} />;
}
SayncDialog.displayName = 'SayncDialog';

/* ──────────────────────────────────────────────────────────── */

export interface SayncDrawerProps {
  name?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which edge the drawer slides from. Default 'right'. */
  side?: 'left' | 'right' | 'top' | 'bottom';
  expects?: DisclosureContract;
  className?: string;
  style?: React.CSSProperties;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
}

/**
 * <Saync.Drawer> — controlled, side-anchored disclosure panel. Same
 * contract shape as Modal (closesOnEscape, closesOnOutsideClick,
 * trapsFocus, hasBackdrop). The `side` prop is recorded on the
 * expectation so the agent knows which edge to expect.
 */
export function SayncDrawer({
  name,
  open,
  onOpenChange,
  side = 'right',
  expects,
  className,
  style,
  sourceFile,
  sourceLine,
  children,
}: SayncDrawerProps) {
  const ctx = useSaync();
  const [expectationId] = useState(() => generateExpectationId('drawer'));

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('Drawer');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation = {
      id: expectationId,
      name: resolvedName,
      componentName: resolvedName,
      type: 'drawer' as const,
      side,
      selector: `[data-saync-id="${expectationId}"]`,
      contract: expects,
      sourceFile,
      sourceLine,
    };

    ctx.register(expectation);
    return () => ctx.unregister(expectationId);
  }, [ctx, expectationId, resolvedName, contractKey, side, sourceFile, sourceLine]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  const sidePos: React.CSSProperties = {
    left: { left: 0, top: 0, bottom: 0, width: '320px' },
    right: { right: 0, top: 0, bottom: 0, width: '320px' },
    top: { top: 0, left: 0, right: 0, height: '320px' },
    bottom: { bottom: 0, left: 0, right: 0, height: '320px' },
  }[side];

  return (
    <div
      role="presentation"
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type="drawer"
      data-saync-side={side}
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 1000 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={resolvedName}
        data-saync-drawer-panel={expectationId}
        className={className}
        style={{
          position: 'fixed',
          background: 'white',
          overflow: 'auto',
          ...sidePos,
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
SayncDrawer.displayName = 'SayncDrawer';
