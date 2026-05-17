'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type InputContract,
  type InputExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { useFormContext } from './FormContext.js';
import { warnMissingName } from './internal.js';

export interface SayncInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Human-readable contract id. Strongly recommended; see <Saync.Button> docs. */
  name?: string;
  /** Behavior contract for the input: change/blur API calls, validation rules. */
  expects?: InputContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Input> — wraps a native <input>. Captures:
 *   - onChange (every keystroke, for debounce verification)
 *   - onBlur   (for validation-on-blur expectations)
 *
 * When mounted inside a <Saync.Form>, automatically registers itself
 * as a field of that form via FormContext — the agent then knows to
 * fill this input before submitting the parent.
 *
 * The user's own `onChange` / `onBlur` handlers always run; this
 * component only registers + lets the DOM bubble events naturally
 * so the Playwright agent's network/event capture can see them.
 */
export const SayncInput = React.forwardRef<HTMLInputElement, SayncInputProps>(
  ({ name, expects, sourceFile, sourceLine, onChange, onBlur, ...inputProps }, ref) => {
    const ctx = useSaync();
    const form = useFormContext();
    const [expectationId] = useState(() => generateExpectationId('input'));
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Input');

    // Stringify the contract once per render to detect real changes —
    // inline object literals would re-run the registration every render
    // otherwise. Cheap for the shapes we deal with (a dozen fields at most).
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: InputExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: form?.formName ?? resolvedName,
        type: 'input',
        selector: `input[data-saync-id="${expectationId}"]`,
        parentFormId: form?.formId,
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      form?.registerField(expectationId);

      return () => {
        ctx.unregister(expectationId);
        form?.unregisterField(expectationId);
      };
      // contractKey covers `expects` changes; form identity stable per form mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx, expectationId, resolvedName, contractKey, form?.formId, sourceFile, sourceLine]);

    return (
      <input
        ref={setRefs}
        onChange={onChange}
        onBlur={onBlur}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="input"
        {...inputProps}
      />
    );
  },
);

SayncInput.displayName = 'SayncInput';
