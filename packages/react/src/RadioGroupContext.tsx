'use client';

import { createContext, useContext } from 'react';

/**
 * Provided by <Saync.RadioGroup> to its descendants. Each child
 * <Saync.Radio> reads this on mount to:
 *   1. Get the shared `name` attribute (HTML radio semantics — radios
 *      in the same group must share a `name` attribute).
 *   2. Register its `value` so the group's `optionValues` list stays
 *      live for the agent.
 *
 * `null` when a <Saync.Radio> renders outside any group — in that case
 * it falls back to its own `name` prop and doesn't register with a
 * group (effectively an orphan, which is unusual but supported).
 */
export interface RadioGroupContextValue {
  groupId: string;
  groupName: string;     // HTML radio group name attribute
  /** Currently-selected value, controlled by the group's parent component. */
  currentValue?: string;
  registerOption: (optionId: string, value: string) => void;
  unregisterOption: (optionId: string) => void;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroupContext(): RadioGroupContextValue | null {
  return useContext(RadioGroupContext);
}
