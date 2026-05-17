/**
 * Core verification logic for Saync expectations
 */

import { chromium, type Browser, type Page, type Route } from 'playwright';
import type { Expectation, ButtonExpectation, ResponseShape } from '@saync/core';
import type {
  VerificationResult,
  VerificationError,
  CapturedRequest,
  AgentConfig,
} from './types.js';

/**
 * Verifier class - handles expectation verification using Playwright
 */
export class Verifier {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: Required<AgentConfig>;
  private capturedRequests: Map<string, CapturedRequest[]> = new Map();

  constructor(config: AgentConfig) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      outputFile: config.outputFile ?? 'saync-failures.json',
      screenshotOnFailure: config.screenshotOnFailure ?? true,
      url: config.url,
    };
  }

  /**
   * Initialize the browser and page
   */
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    this.page = await this.browser.newPage();

    // Set up network interception
    await this.setupNetworkInterception();

    // Navigate to the app
    await this.page.goto(this.config.url, {
      waitUntil: 'networkidle',
      timeout: this.config.timeout,
    });

    // Wait for the page to be fully loaded and hydrated
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000); // Give React time to hydrate
  }

  /**
   * Set up network request/response interception
   */
  private async setupNetworkInterception(): Promise<void> {
    if (!this.page) return;

    await this.page.route('**/*', async (route: Route) => {
      const request = route.request();
      const startTime = Date.now();

      // Continue the request
      await route.continue();

      // Wait for response
      const response = await request.response();
      const duration = Date.now() - startTime;

      if (response) {
        const captured: CapturedRequest = {
          method: request.method(),
          url: request.url(),
          status: response.status(),
          duration,
          headers: await response.allHeaders(),
        };

        // Try to capture request/response bodies
        try {
          const postData = request.postData();
          if (postData) {
            captured.requestBody = JSON.parse(postData);
          }
        } catch {
          // Not JSON or no body
        }

        try {
          const body = await response.body();
          captured.responseBody = JSON.parse(body.toString());
        } catch {
          // Not JSON or no body
        }

        // Store by URL pattern for matching
        const urlKey = new URL(request.url()).pathname;
        if (!this.capturedRequests.has(urlKey)) {
          this.capturedRequests.set(urlKey, []);
        }
        this.capturedRequests.get(urlKey)!.push(captured);
      }
    });
  }

  /**
   * Read expectations from the page
   */
  async readExpectations(): Promise<Expectation[]> {
    if (!this.page) {
      throw new Error('Verifier not initialized');
    }

    const expectations = await this.page.evaluate(() => {
      const expectationsMap = window.__SAYNC_EXPECTATIONS__;
      if (!expectationsMap) {
        return [];
      }
      return Array.from(expectationsMap.values());
    });

    return expectations;
  }

  /**
   * Verify a single expectation
   */
  async verifyExpectation(expectation: Expectation): Promise<VerificationResult> {
    const startTime = Date.now();
    const errors: VerificationError[] = [];

    try {
      if (expectation.type === 'button-click') {
        await this.verifyButtonClick(expectation as ButtonExpectation, errors);
      }
    } catch (error) {
      errors.push({
        type: 'unexpected-error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    const duration = Date.now() - startTime;
    const passed = errors.length === 0;

    const result: VerificationResult = {
      expectationId: expectation.id,
      passed,
      errors,
      duration,
      timestamp: new Date().toISOString(),
    };

    // Capture screenshot on failure
    if (!passed && this.config.screenshotOnFailure && this.page) {
      const screenshot = await this.page.screenshot({ type: 'png' });
      result.screenshot = screenshot.toString('base64');
    }

    return result;
  }

  /**
   * Verify a button click expectation
   */
  private async verifyButtonClick(
    expectation: ButtonExpectation,
    errors: VerificationError[]
  ): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Find the button
    const button = await this.page.locator(expectation.selector).first();
    const exists = await button.count() > 0;

    if (!exists) {
      errors.push({
        type: 'selector-not-found',
        message: `Button not found with selector: ${expectation.selector}`,
      });
      return;
    }

    // Clear captured requests before clicking
    this.capturedRequests.clear();

    // Click the button
    await button.click();

    // Wait a bit for API calls to complete
    await this.page.waitForTimeout(500);

    // Verify API call expectations
    if (expectation.onClick.apiCall) {
      this.verifyApiCall(expectation.onClick.apiCall, errors);
    }

    // Verify response shape expectations
    if (expectation.onClick.responseShape && expectation.onClick.apiCall) {
      this.verifyResponseShape(
        expectation.onClick.apiCall.url,
        expectation.onClick.responseShape,
        errors
      );
    }
  }

  /**
   * Verify API call expectation
   */
  private verifyApiCall(
    apiCall: ButtonExpectation['onClick']['apiCall'],
    errors: VerificationError[]
  ): void {
    if (!apiCall) return;

    const urlPattern = typeof apiCall.url === 'string' 
      ? new URL(apiCall.url, this.config.url).pathname
      : apiCall.url;

    // Find matching requests
    let matchingRequests: CapturedRequest[] = [];

    if (typeof urlPattern === 'string') {
      matchingRequests = this.capturedRequests.get(urlPattern) || [];
    } else {
      // RegExp matching
      for (const [url, requests] of this.capturedRequests.entries()) {
        if (urlPattern.test(url)) {
          matchingRequests.push(...requests);
        }
      }
    }

    if (matchingRequests.length === 0) {
      errors.push({
        type: 'api-call',
        message: `No API call found matching: ${apiCall.url}`,
        expected: apiCall,
      });
      return;
    }

    const request = matchingRequests[0];

    // Verify method
    if (request.method !== apiCall.method) {
      errors.push({
        type: 'api-call',
        message: `API method mismatch`,
        expected: apiCall.method,
        actual: request.method,
      });
    }

    // Verify status
    if (apiCall.expectedStatus && request.status !== apiCall.expectedStatus) {
      errors.push({
        type: 'api-call',
        message: `API status mismatch`,
        expected: apiCall.expectedStatus,
        actual: request.status,
      });
    }

    // Verify duration
    if (apiCall.maxDuration && request.duration > apiCall.maxDuration) {
      errors.push({
        type: 'timeout',
        message: `API call took too long`,
        expected: `< ${apiCall.maxDuration}ms`,
        actual: `${request.duration}ms`,
      });
    }
  }

  /**
   * Verify response shape expectation
   */
  private verifyResponseShape(
    url: string | RegExp,
    shape: ResponseShape,
    errors: VerificationError[]
  ): void {
    const urlPattern = typeof url === 'string' 
      ? new URL(url, this.config.url).pathname
      : url;

    let matchingRequests: CapturedRequest[] = [];

    if (typeof urlPattern === 'string') {
      matchingRequests = this.capturedRequests.get(urlPattern) || [];
    } else {
      for (const [requestUrl, requests] of this.capturedRequests.entries()) {
        if (urlPattern.test(requestUrl)) {
          matchingRequests.push(...requests);
        }
      }
    }

    if (matchingRequests.length === 0) {
      return; // Already reported in verifyApiCall
    }

    const response = matchingRequests[0].responseBody;

    if (!response || typeof response !== 'object') {
      errors.push({
        type: 'response-shape',
        message: 'Response body is not a valid object',
        actual: response,
      });
      return;
    }

    // Validate shape
    this.validateShape(response as Record<string, unknown>, shape, errors, 'response');
  }

  /**
   * Recursively validate response shape
   */
  private validateShape(
    data: Record<string, unknown>,
    shape: ResponseShape,
    errors: VerificationError[],
    path: string
  ): void {
    for (const [key, expectedType] of Object.entries(shape)) {
      const value = data[key];
      const currentPath = `${path}.${key}`;

      if (value === undefined) {
        errors.push({
          type: 'response-shape',
          message: `Missing field: ${currentPath}`,
          expected: expectedType,
        });
        continue;
      }

      if (typeof expectedType === 'string') {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== expectedType) {
          errors.push({
            type: 'response-shape',
            message: `Type mismatch at ${currentPath}`,
            expected: expectedType,
            actual: actualType,
          });
        }
      } else if (typeof expectedType === 'object') {
        // Nested shape validation
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          this.validateShape(value as Record<string, unknown>, expectedType, errors, currentPath);
        } else {
          errors.push({
            type: 'response-shape',
            message: `Expected object at ${currentPath}`,
            expected: 'object',
            actual: Array.isArray(value) ? 'array' : typeof value,
          });
        }
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Made with Bob
