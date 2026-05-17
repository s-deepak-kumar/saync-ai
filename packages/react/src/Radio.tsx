'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { generateExpectationId } from '@saync/core';
import { useRadioGroupContext } from './RadioGroupContext.js';

export interface SayncRadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'name' | 'checked'> {
  /** The value this radio represents. Must be unique within the group. */
  value: string;
}

/**
 * <Saync.Radio> — a single radio option. Must be a descendant of a
 * <Saync.RadioGroup>; the group owns the contract and this component
 * just registers its `value` into the group's option list.
 *
 * Outside a RadioGroup, renders as a plain radio input but doesn't
 * register with Saync — unusual but not erroneous (e.g. when toggling
 * the wrapping group conditionally).
 */
export const SayncRadio = React.forwardRef<HTMLInputElement, SayncRadioProps>(
  ({ value, ...inputProps }, ref) => {
    const group = useRadioGroupContext();
    const [optionId] = useState(() => generateExpectationId('radio-option'));
    const inputRef = useRef<HTMLInputElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    useEffect(() => {
      if (!group) return;
      group.registerOption(optionId, value);
      return () => group.unregisterOption(optionId);
    }, [group, optionId, value]);

    return (
      <input
        ref={setRefs}
        type="radio"
        name={group?.groupName}
        value={value}
        checked={group ? group.currentValue === value : undefined}
        data-saync-radio-id={optionId}
        data-saync-group-id={group?.groupId}
        // Read-only without onChange: RadioGroup attaches a delegated
        // onChange on the wrapping <div>, so individual radios don't
        // each wire up their own. The group dispatches to user code.
        onChange={() => {}}
        {...inputProps}
      />
    );
  },
);
SayncRadio.displayName = 'SayncRadio';
