'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type InputContract,
  type DatePickerExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { useFormContext } from './FormContext.js';
import { warnMissingName } from './internal.js';

export interface SayncDatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'min' | 'max'> {
  name?: string;
  expects?: InputContract;
  /** Which HTML date variant — defaults to "date" (YYYY-MM-DD). */
  dateType?: 'date' | 'time' | 'datetime-local' | 'month' | 'week';
  /** ISO date string lower bound — passed to both the DOM `min` attribute
   *  and the registered expectation. */
  min?: string;
  max?: string;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.DatePicker> — wraps <input type="date|time|datetime-local|month|week">.
 * Contract shape is shared with <Saync.Input>; the registered expectation
 * additionally carries `dateType` + `min`/`max` so the agent knows which
 * date variant it's dealing with and the valid range.
 *
 * Date values are always ISO strings (the HTML standard) — never JS Date
 * objects, never localized — so the contract is portable across timezones.
 */
export const SayncDatePicker = React.forwardRef<HTMLInputElement, SayncDatePickerProps>(
  (
    {
      name,
      expects,
      dateType = 'date',
      min,
      max,
      sourceFile,
      sourceLine,
      onChange,
      onBlur,
      ...inputProps
    },
    ref,
  ) => {
    const ctx = useSaync();
    const form = useFormContext();
    const [expectationId] = useState(() => generateExpectationId('date-picker'));
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
    if (!name && typeof window !== 'undefined') warnMissingName('DatePicker');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: DatePickerExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: form?.formName ?? resolvedName,
        type: 'date-picker',
        selector: `input[data-saync-id="${expectationId}"]`,
        parentFormId: form?.formId,
        dateType,
        min,
        max,
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
    }, [ctx, expectationId, resolvedName, contractKey, dateType, min, max, form?.formId, sourceFile, sourceLine]);

    return (
      <input
        ref={setRefs}
        type={dateType}
        min={min}
        max={max}
        onChange={onChange}
        onBlur={onBlur}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="date-picker"
        data-saync-date-type={dateType}
        {...inputProps}
      />
    );
  },
);

SayncDatePicker.displayName = 'SayncDatePicker';
