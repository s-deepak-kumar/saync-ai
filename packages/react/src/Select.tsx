'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type ChoiceContract,
  type SelectExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { useFormContext } from './FormContext.js';
import { warnMissingName } from './internal.js';

export interface SayncSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  name?: string;
  expects?: ChoiceContract;
  /** Declared option values for verification — optional. If supplied,
   *  the agent can assert the rendered <option> set matches. */
  options?: string[];
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Select> — wraps a native <select>. Captures `onChange`. Lives
 * inside a <Saync.Form> if one's an ancestor (parentFormId set).
 *
 * Use the native `<option>` children for the dropdown UI; if you want
 * the agent to verify your option set is exactly { 'small', 'medium',
 * 'large' }, pass `options={['small','medium','large']}` as well.
 */
export const SayncSelect = React.forwardRef<HTMLSelectElement, SayncSelectProps>(
  ({ name, expects, options, sourceFile, sourceLine, onChange, children, ...selectProps }, ref) => {
    const ctx = useSaync();
    const form = useFormContext();
    const [expectationId] = useState(() => generateExpectationId('select'));
    const selectRef = useRef<HTMLSelectElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLSelectElement | null) => {
        selectRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Select');
    const contractKey = JSON.stringify(expects ?? null);
    const optionsKey = options?.join('') ?? '';

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: SelectExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: form?.formName ?? resolvedName,
        type: 'select',
        selector: `select[data-saync-id="${expectationId}"]`,
        parentFormId: form?.formId,
        options,
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
    }, [ctx, expectationId, resolvedName, contractKey, optionsKey, form?.formId, sourceFile, sourceLine]);

    return (
      <select
        ref={setRefs}
        onChange={onChange}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="select"
        {...selectProps}
      >
        {children}
      </select>
    );
  },
);

SayncSelect.displayName = 'SayncSelect';
