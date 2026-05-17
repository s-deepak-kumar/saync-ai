'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type FileContract,
  type FileInputExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { useFormContext } from './FormContext.js';
import { warnMissingName } from './internal.js';

export interface SayncFileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  name?: string;
  expects?: FileContract;
  /** Mirrors the HTML `accept` attribute — also copied onto the registered
   *  expectation so the agent can pick a fixture file the input will accept. */
  accept?: string;
  multiple?: boolean;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.FileInput> — wraps <input type="file">. Uses FileContract
 * (separate from InputContract) because the trigger is "user picked
 * one or more files", not keystrokes — the asserted API call is
 * typically a multipart upload, the validation cares about size and
 * MIME type.
 *
 * The `accept` and `multiple` props are copied onto the expectation
 * so the Playwright agent can synthesize an appropriate fixture file
 * without re-querying the DOM.
 */
export const SayncFileInput = React.forwardRef<HTMLInputElement, SayncFileInputProps>(
  (
    { name, expects, accept, multiple, sourceFile, sourceLine, onChange, ...inputProps },
    ref,
  ) => {
    const ctx = useSaync();
    const form = useFormContext();
    const [expectationId] = useState(() => generateExpectationId('file-input'));
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
    if (!name && typeof window !== 'undefined') warnMissingName('FileInput');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: FileInputExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: form?.formName ?? resolvedName,
        type: 'file-input',
        selector: `input[data-saync-id="${expectationId}"]`,
        parentFormId: form?.formId,
        accept,
        multiple,
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx, expectationId, resolvedName, contractKey, accept, multiple, form?.formId, sourceFile, sourceLine]);

    return (
      <input
        ref={setRefs}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onChange}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="file-input"
        {...inputProps}
      />
    );
  },
);

SayncFileInput.displayName = 'SayncFileInput';
