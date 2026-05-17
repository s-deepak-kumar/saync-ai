'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type FormContract,
  type FormExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { FormContext, type FormContextValue } from './FormContext.js';
import { warnMissingName } from './internal.js';

export interface SayncFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Human-readable contract id — "checkout", "login", etc. */
  name?: string;
  /** Behavior contract for the submit. */
  expects?: FormContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Form> — wraps a native <form>. Provides FormContext to its
 * descendants so child <Saync.Input> / <Saync.Textarea> automatically:
 *   - know they belong to this form (parentFormId set on their expectation)
 *   - get added to this form's `fieldIds` list (the agent uses this
 *     list to drive every field before submitting)
 *
 * The form's expectation is **re-registered** whenever the field list
 * changes — children mounting and unmounting must be reflected. We
 * coalesce updates via state to avoid re-registering on every render.
 */
export const SayncForm = React.forwardRef<HTMLFormElement, SayncFormProps>(
  ({ name, expects, sourceFile, sourceLine, onSubmit, children, ...formProps }, ref) => {
    const ctx = useSaync();
    const [expectationId] = useState(() => generateExpectationId('form'));
    const formRef = useRef<HTMLFormElement | null>(null);

    // Live set of child field ids. Use a ref + state pair so updates
    // are visible synchronously to other children but still trigger
    // the registration effect.
    const fieldIdsRef = useRef<Set<string>>(new Set());
    const [fieldsVersion, setFieldsVersion] = useState(0);

    const registerField = useCallback((fieldId: string) => {
      fieldIdsRef.current.add(fieldId);
      setFieldsVersion((v) => v + 1);
    }, []);
    const unregisterField = useCallback((fieldId: string) => {
      fieldIdsRef.current.delete(fieldId);
      setFieldsVersion((v) => v + 1);
    }, []);

    const setRefs = useCallback(
      (node: HTMLFormElement | null) => {
        formRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const resolvedName = name ?? expectationId;
    if (!name && typeof window !== 'undefined') warnMissingName('Form');
    const contractKey = JSON.stringify(expects ?? null);

    // Re-register whenever the field list changes (children mount/unmount)
    // or the contract changes.
    useEffect(() => {
      const mode = ctx.mode ?? getSayncMode();
      if (mode === 'off' || !expects) return;

      const expectation: FormExpectation = {
        id: expectationId,
        name: resolvedName,
        componentName: resolvedName,
        type: 'form',
        selector: `form[data-saync-id="${expectationId}"]`,
        fieldIds: Array.from(fieldIdsRef.current),
        contract: expects,
        sourceFile,
        sourceLine,
      };

      ctx.register(expectation);
      return () => ctx.unregister(expectationId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx, expectationId, resolvedName, contractKey, fieldsVersion, sourceFile, sourceLine]);

    // Stable context value — only changes when functions are recreated
    // (which is rare; setStates are stable across renders).
    const formCtx: FormContextValue = useMemo(
      () => ({
        formId: expectationId,
        formName: resolvedName,
        registerField,
        unregisterField,
      }),
      [expectationId, resolvedName, registerField, unregisterField],
    );

    return (
      <FormContext.Provider value={formCtx}>
        <form
          ref={setRefs}
          onSubmit={onSubmit}
          data-saync-id={expectationId}
          data-saync-name={resolvedName}
          data-saync-type="form"
          {...formProps}
        >
          {children}
        </form>
      </FormContext.Provider>
    );
  },
);

SayncForm.displayName = 'SayncForm';
