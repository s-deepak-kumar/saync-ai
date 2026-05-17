'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type InputContract,
  type SliderExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { useFormContext } from './FormContext.js';
import { warnMissingName } from './internal.js';

export interface SayncSliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  name?: string;
  expects?: InputContract;
  /** Numeric bounds — copied onto the expectation so the agent can
   *  generate intermediate values to drive the slider through. */
  min?: number;
  max?: number;
  step?: number;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Slider> — wraps <input type="range">. The contract shape is
 * the same as <Saync.Input> (change / blur / validation), but the
 * registered expectation also carries `min`/`max`/`step` metadata so
 * the agent can drive the slider deterministically without re-parsing
 * the DOM.
 */
export const SayncSlider = React.forwardRef<HTMLInputElement, SayncSliderProps>(
  ({ name, expects, min, max, step, sourceFile, sourceLine, onChange, onBlur, ...inputProps }, ref) => {
    const ctx = useSaync();
    const form = useFormContext();
    const [expectationId] = useState(() => generateExpectationId('slider'));
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
    if (!name && typeof window !== 'undefined') warnMissingName('Slider');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: SliderExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: form?.formName ?? resolvedName,
        type: 'slider',
        selector: `input[data-saync-id="${expectationId}"]`,
        parentFormId: form?.formId,
        min,
        max,
        step,
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
    }, [ctx, expectationId, resolvedName, contractKey, min, max, step, form?.formId, sourceFile, sourceLine]);

    return (
      <input
        ref={setRefs}
        type="range"
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onBlur={onBlur}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="slider"
        {...inputProps}
      />
    );
  },
);

SayncSlider.displayName = 'SayncSlider';
