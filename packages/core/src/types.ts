/**
 * Core type definitions for Saync expectations
 */

/**
 * Saync operation mode
 */
export type SayncMode = 'off' | 'log' | 'report';

/**
 * Expected API call specification
 */
export interface ApiCallExpectation {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string | RegExp;
  expectedStatus?: number;
  maxDuration?: number; // milliseconds
}

/**
 * Expected response shape validation
 * Simple JSON schema-like validation for v0.1
 */
export type ResponseShape = {
  [key: string]: 'string' | 'number' | 'boolean' | 'object' | 'array' | ResponseShape;
};

/**
 * Button click expectation
 */
export interface ButtonClickExpectation {
  apiCall?: ApiCallExpectation;
  responseShape?: ResponseShape;
}

/**
 * Expectation types - extensible for future interaction types
 */
export type ExpectationType = 'button-click' | 'form-submit';

/**
 * Base expectation structure
 */
export interface BaseExpectation {
  id: string;
  type: ExpectationType;
  selector: string;
  sourceFile?: string;
  sourceLine?: number;
}

/**
 * Button click expectation with full metadata
 */
export interface ButtonExpectation extends BaseExpectation {
  type: 'button-click';
  onClick: ButtonClickExpectation;
}

/**
 * Union type for all expectation types
 */
export type Expectation = ButtonExpectation;

/**
 * Global window interface extension
 */
export interface SayncGlobal {
  __SAYNC_EXPECTATIONS__: Map<string, Expectation>;
  __SAYNC_MODE__: SayncMode;
}

/**
 * Configuration options
 */
export interface SayncConfig {
  mode: SayncMode;
  reportWebhook?: string;
  enabled?: boolean;
}

declare global {
  interface Window {
    __SAYNC_EXPECTATIONS__?: Map<string, Expectation>;
    __SAYNC_MODE__?: SayncMode;
  }
}

// Made with Bob
