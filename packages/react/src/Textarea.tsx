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

export interface SayncTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  name?: string;
  expects?: InputContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Textarea> — wraps <textarea>. Same contract shape as
 * <Saync.Input> (InputContract — change/blur/validation), distinguished
 * in the registry by `type: 'textarea'`. The agent treats them
 * similarly but Playwright drives them with different events.
 */
export const SayncTextarea = React.forwardRef<HTMLTextAreaElement, SayncTextareaProps>(
  ({ name, expects, sourceFile, sourceLine, onChange, onBlur, ...textareaProps }, ref) => {
    const ctx = useSaync();
    const form = useFormContext();
    const [expectationId] = useState(() => generateExpectationId('textarea'));
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Textarea');
    const contractKey = JSON.stringify(expects ?? null);

    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: InputExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: form?.formName ?? resolvedName,
        type: 'textarea',
        selector: `textarea[data-saync-id="${expectationId}"]`,
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx, expectationId, resolvedName, contractKey, form?.formId, sourceFile, sourceLine]);

    return (
      <textarea
        ref={setRefs}
        onChange={onChange}
        onBlur={onBlur}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="textarea"
        {...textareaProps}
      />
    );
  },
);

SayncTextarea.displayName = 'SayncTextarea';
