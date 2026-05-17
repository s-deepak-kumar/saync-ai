'use client';

import { createContext, useContext } from 'react';

/**
 * Provided by <Saync.Form> to its descendants. Child <Saync.Input> /
 * <Saync.Textarea> components read this on mount to:
 *   1. Discover the parent form's expectation id, so their own
 *      `parentFormId` field is correct.
 *   2. Register themselves with the form so the form's `fieldIds`
 *      list stays current — the agent uses that list to know which
 *      inputs to fill before submitting.
 *
 * `null` when no Form ancestor exists — Inputs/Textareas can still
 * render and register, they just don't get linked to a parent.
 */
export interface FormContextValue {
  formId: string;
  formName: string;
  registerField: (fieldId: string) => void;
  unregisterField: (fieldId: string) => void;
}

export const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue | null {
  return useContext(FormContext);
}
