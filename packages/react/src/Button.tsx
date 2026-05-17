'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type ButtonClickExpectation,
  type ButtonExpectation,
} from '@saync/core';
import { useSaync } from './context.js';

export interface SayncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Human-readable contract identifier — "add-to-cart", "checkout.confirm-pay".
   * Surfaces in dashboards / reports. If omitted, falls back to a random id and
   * logs a one-time warning in dev. Strongly recommended.
   */
  name?: string;
  /** Behavior contract for the click. */
  expects?: { onClick?: ButtonClickExpectation };
  /** Backwards-compat alias for `expects` — existing demo-app passes `expect={…}`. */
  expect?: { onClick?: ButtonClickExpectation };
  sourceFile?: string;
  sourceLine?: number;
}

let warnedNoName = false;
function warnOnceNoName() {
  if (warnedNoName) return;
  warnedNoName = true;
  console.warn(
    '[Saync] <Saync.Button> rendered without a `name` prop. Issue titles will use the random id, which is unreadable. Add name="something-meaningful".',
  );
}

/**
 * <Saync.Button> — wraps a native <button>. Registers a click-expectation
 * contract on mount (via context's `register`, falling back to the global
 * if rendered outside a Provider).
 *
 * Key design choices baked in:
 *   - ID is generated once via useState init function so the DOM gets
 *     data-saync-id from the FIRST render. Earlier bug: the id was set
 *     in useEffect → ref, which never made it into the markup.
 *   - The `expects` prop is read off the latest render; the registration
 *     effect re-runs if it changes, but the same stable ID is reused.
 *   - `name` defaults to the random ID if absent (with a warning); the
 *     contractName the agent reports is `${name}.click`, so the dashboard
 *     can split on "." and render "Component · click".
 */
export const SayncButton = React.forwardRef<HTMLButtonElement, SayncButtonProps>(
  ({ name, expects, expect, sourceFile, sourceLine, children, onClick, ...buttonProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('button'));
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    // Resolve which contract object actually applies (prefer the new
    // `expects` plural, accept the old `expect` for backwards compat).
    const onClickExpect = expects?.onClick ?? expect?.onClick;

    // Resolve display name + warn once if missing.
    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') {
      warnOnceNoName();
    }

    useEffect(() => {
      // Honor SDK mode coming from either the Provider context or the
      // legacy global (when no Provider is mounted in the tree).
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !onClickExpect) return;

      const expectation: ButtonExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'button-click',
        selector: `button[data-saync-id="${expectationId}"]`,
        onClick: onClickExpect,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
    }, [ctx, expectationId, resolvedName, onClickExpect, sourceFile, sourceLine]);

    return (
      <button
        ref={setRefs}
        onClick={onClick}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        {...buttonProps}
      >
        {children}
      </button>
    );
  },
);

SayncButton.displayName = 'SayncButton';
