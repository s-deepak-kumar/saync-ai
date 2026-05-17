'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  generateExpectationId,
  getSayncMode,
  type ChoiceContract,
  type CheckboxExpectation,
} from '@saync/core';
import { useSaync } from './context.js';
import { useFormContext } from './FormContext.js';
import { warnMissingName } from './internal.js';

export interface SayncCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  name?: string;
  expects?: ChoiceContract;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * <Saync.Checkbox> — wraps <input type="checkbox">. The contract is
 * boolean: toggled / untoggled. `allowedValues` on `validation` doesn't
 * apply (checkbox is just a boolean).
 *
 * For a visually-different toggle UI with the same semantics, use
 * <Saync.Switch> — same registration shape, different `type` discriminator
 * so the agent knows to drive it via the appropriate event.
 */
export const SayncCheckbox = React.forwardRef<HTMLInputElement, SayncCheckboxProps>(
  ({ name, expects, sourceFile, sourceLine, onChange, ...inputProps }, ref) => {
    return (
      <BooleanToggle
        forwardedRef={ref}
        toggleType="checkbox"
        name={name}
        expects={expects}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        onChange={onChange}
        inputProps={inputProps}
        warnLabel="Checkbox"
      />
    );
  },
);
SayncCheckbox.displayName = 'SayncCheckbox';

export interface SayncSwitchProps extends SayncCheckboxProps {}

/**
 * <Saync.Switch> — visually distinct toggle, same underlying contract
 * shape as Checkbox. Renders <input type="checkbox" role="switch">
 * so screen readers announce it correctly.
 */
export const SayncSwitch = React.forwardRef<HTMLInputElement, SayncSwitchProps>(
  ({ name, expects, sourceFile, sourceLine, onChange, ...inputProps }, ref) => {
    return (
      <BooleanToggle
        forwardedRef={ref}
        toggleType="switch"
        name={name}
        expects={expects}
        sourceFile={sourceFile}
        sourceLine={sourceLine}
        onChange={onChange}
        inputProps={inputProps}
        warnLabel="Switch"
      />
    );
  },
);
SayncSwitch.displayName = 'SayncSwitch';

/* ──────────────────────────────────────────────────────────── */

interface BooleanToggleProps {
  forwardedRef: React.ForwardedRef<HTMLInputElement>;
  toggleType: 'checkbox' | 'switch';
  name?: string;
  expects?: ChoiceContract;
  sourceFile?: string;
  sourceLine?: number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  inputProps: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'>;
  warnLabel: string;
}

// Shared body — Checkbox and Switch differ only in the `type`
// discriminator we register with and the `role` attribute we set.
// Everything else (registration shape, form scoping, ref forwarding)
// is identical.
function BooleanToggle({
  forwardedRef,
  toggleType,
  name,
  expects,
  sourceFile,
  sourceLine,
  onChange,
  inputProps,
  warnLabel,
}: BooleanToggleProps) {
  const ctx = useSaync();
  const form = useFormContext();
  const [expectationId] = useState(() => generateExpectationId(toggleType));
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const resolvedName = name ?? expectationId;
  if (!name && typeof window !== 'undefined') warnMissingName(warnLabel);
  const contractKey = JSON.stringify(expects ?? null);

  useEffect(() => {
    const mode = ctx.mode ?? getSayncMode();
    if (mode === 'off' || !expects) return;

    const expectation: CheckboxExpectation = {
      id: expectationId,
      name: resolvedName,
      componentName: form?.formName ?? resolvedName,
      type: toggleType,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, expectationId, resolvedName, contractKey, form?.formId, toggleType, sourceFile, sourceLine]);

  return (
    <input
      ref={setRefs}
      type="checkbox"
      role={toggleType === 'switch' ? 'switch' : undefined}
      onChange={onChange}
      data-saync-id={expectationId}
      data-saync-name={resolvedName}
      data-saync-type={toggleType}
      {...inputProps}
    />
  );
}
