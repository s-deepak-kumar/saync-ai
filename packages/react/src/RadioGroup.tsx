'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type ChoiceContract,
  type RadioGroupExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { useFormContext } from './FormContext.js';
import { RadioGroupContext, type RadioGroupContextValue } from './RadioGroupContext.js';
import { warnMissingName } from './internal.js';

export interface SayncRadioGroupProps {
  /** Human-readable contract id. Strongly recommended. Doubles as the
   *  HTML `name` attribute on child radios (radios in the same group
   *  must share a name). */
  name?: string;
  /** Currently-selected value, controlled by the parent. Forwarded to
   *  child Radios so they know which is checked. */
  value?: string;
  /** Fires when the user picks a different option. */
  onChange?: (value: string) => void;
  expects?: ChoiceContract;
  sourceFile?: string;
  sourceLine?: number;
  children: React.ReactNode;
  /** Optional extra props on the wrapping <div role="radiogroup">. */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * <Saync.RadioGroup> — owns the contract for a set of <Saync.Radio>
 * options. Renders a <div role="radiogroup"> and provides
 * RadioGroupContext to descendants so each Radio:
 *   1. Picks up the shared name attribute (HTML semantics)
 *   2. Registers its value into this group's `optionValues` list
 *   3. Knows whether it's the currently-selected one
 *
 * The group registers one expectation; child Radios don't register
 * their own — they're just DOM markers for the group.
 */
export function SayncRadioGroup({
  name,
  value,
  onChange,
  expects,
  sourceFile,
  sourceLine,
  children,
  className,
  style,
}: SayncRadioGroupProps) {
  const ctx = useSaync();
  const form = useFormContext();
  const [expectationId] = useState(() => generateExpectationId('radio-group'));

  // Live registry of child options. Same ref+version trick used in
  // <Saync.Form> — fast inside-render reads, deferred effect-fires.
  const optionsRef = useRef<Map<string, string>>(new Map());
  const [optionsVersion, setOptionsVersion] = useState(0);

  const registerOption = useCallback((optionId: string, optionValue: string) => {
    optionsRef.current.set(optionId, optionValue);
    setOptionsVersion((v) => v + 1);
  }, []);
  const unregisterOption = useCallback((optionId: string) => {
    optionsRef.current.delete(optionId);
    setOptionsVersion((v) => v + 1);
  }, []);

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName('RadioGroup');
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const entries = Array.from(optionsRef.current.entries());
    const expectation: RadioGroupExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: form?.formName ?? resolvedName,
      type: 'radio-group',
      selector: `[data-saync-id="${expectationId}"]`,
      parentFormId: form?.formId,
      optionIds: entries.map(([id]) => id),
      optionValues: entries.map(([, v]) => v),
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
  }, [ctx, expectationId, resolvedName, contractKey, optionsVersion, form?.formId, sourceFile, sourceLine]);

  const groupCtx: RadioGroupContextValue = useMemo(
    () => ({
      groupId: expectationId,
      groupName: resolvedName,
      currentValue: value,
      registerOption,
      unregisterOption,
    }),
    [expectationId, resolvedName, value, registerOption, unregisterOption],
  );

  // The actual user-facing change handler: child Radio components call
  // window.dispatchEvent on the native input; React's synthetic event
  // bubbles up here. We translate it back to the group's onChange API.
  const handleChange = (e: React.ChangeEvent<HTMLDivElement>) => {
    const target = e.target as HTMLInputElement;
    if (target?.type === 'radio' && target.checked) {
      onChange?.(target.value);
    }
  };

  return (
    <RadioGroupContext.Provider value={groupCtx}>
      <div
        role="radiogroup"
        aria-label={resolvedName}
        data-saync-id={expectationId}
        data-saync-name={resolvedName}
        data-saync-type="radio-group"
        className={className}
        style={style}
        onChange={handleChange}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}
SayncRadioGroup.displayName = 'SayncRadioGroup';
