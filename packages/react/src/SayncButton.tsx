/**
 * SayncButton - React wrapper component for button expectations
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  registerExpectation,
  unregisterExpectation,
  generateExpectationId,
  getSayncMode,
  type ButtonClickExpectation,
  type ButtonExpectation,
} from '@saync/core';

export interface SayncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Expectation declaration for this button's onClick behavior
   */
  expect?: {
    onClick?: ButtonClickExpectation;
  };
  /**
   * Optional source file information (for better error reporting)
   */
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * SayncButton component
 * 
 * Wraps a standard button element and registers expectations for its behavior.
 * 
 * @example
 * ```tsx
 * <SayncButton
 *   expect={{
 *     onClick: {
 *       apiCall: {
 *         method: 'POST',
 *         url: '/api/cart',
 *         expectedStatus: 200,
 *         maxDuration: 500
 *       },
 *       responseShape: {
 *         cartCount: 'number',
 *         success: 'boolean'
 *       }
 *     }
 *   }}
 *   onClick={handleAddToCart}
 * >
 *   Add to Cart
 * </SayncButton>
 * ```
 */
export const SayncButton = React.forwardRef<HTMLButtonElement, SayncButtonProps>(
  ({ expect, sourceFile, sourceLine, children, onClick, ...buttonProps }, ref) => {
    const expectationIdRef = useRef<string | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    // Combine refs
    const setRefs = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    useEffect(() => {
      const mode = getSayncMode();
      
      // Don't register if mode is 'off' or no expectations provided
      if (mode === 'off' || !expect?.onClick) {
        return;
      }

      // Generate unique ID for this expectation
      const id = generateExpectationId('button');
      expectationIdRef.current = id;

      // Generate a selector for this button
      // In a real implementation, we'd use a more robust selector strategy
      const selector = buttonRef.current
        ? `button[data-saync-id="${id}"]`
        : `button`;

      // Create the expectation object
      const expectation: ButtonExpectation = {
        id,
        type: 'button-click',
        selector,
        onClick: expect.onClick,
        sourceFile,
        sourceLine,
      };

      // Register the expectation
      registerExpectation(expectation);

      // Cleanup: unregister when component unmounts
      return () => {
        if (expectationIdRef.current) {
          unregisterExpectation(expectationIdRef.current);
        }
      };
    }, [expect, sourceFile, sourceLine]);

    // Add data attribute for selector targeting
    const dataAttributes = expectationIdRef.current
      ? { 'data-saync-id': expectationIdRef.current }
      : {};

    return (
      <button
        ref={setRefs}
        onClick={onClick}
        {...dataAttributes}
        {...buttonProps}
      >
        {children}
      </button>
    );
  }
);

SayncButton.displayName = 'SayncButton';

// Made with Bob
