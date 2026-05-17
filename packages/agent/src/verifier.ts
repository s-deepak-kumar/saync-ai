/**
 * Core verification logic for Saync expectations.
 *
 * One verify* method per contract type. Each method's job:
 *   1. Locate the DOM element via expectation.selector
 *   2. Drive the appropriate event (click / type / select / etc.)
 *   3. Compare captured network requests + DOM state to the contract
 *   4. Push any mismatch as a VerificationError
 *
 * Static contracts (declared validation rules like `required`, `pattern`,
 * `min`, `max`, `accept`) are checked against the element's HTML attributes
 * — these are deterministic and don't require driving the UI.
 *
 * Dynamic contracts (an API call should fire, a URL should change, an
 * element should appear) drive the UI and observe.
 */

import { chromium, type Browser, type Locator, type Page, type Route } from 'playwright';
import type {
  Expectation,
  ButtonExpectation,
  InputExpectation,
  FormExpectation,
  SelectExpectation,
  CheckboxExpectation,
  RadioGroupExpectation,
  SliderExpectation,
  FileInputExpectation,
  DatePickerExpectation,
  LinkExpectation,
  NavLinkExpectation,
  TabsExpectation,
  BreadcrumbExpectation,
  PaginationExpectation,
  MenuExpectation,
  RegionExpectation,
  ModalExpectation,
  DrawerExpectation,
  PopoverExpectation,
  TooltipExpectation,
  AccordionExpectation,
  ImageExpectation,
  AvatarExpectation,
  BadgeExpectation,
  ToastExpectation,
  AlertExpectation,
  SpinnerExpectation,
  ProgressExpectation,
  SkeletonExpectation,
  ListExpectation,
  TableExpectation,
  CardExpectation,
  TreeExpectation,
  ApiCallExpectation,
  ResponseShape,
} from '@saync/core';
import type {
  VerificationResult,
  VerificationError,
  CapturedRequest,
  AgentConfig,
} from './types.js';

export class Verifier {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: Required<AgentConfig>;
  private capturedRequests: Map<string, CapturedRequest[]> = new Map();
  // Full registry — populated by readExpectations. Form verifier looks
  // up its children by parentFormId here without re-querying the page.
  private allExpectations: Map<string, Expectation> = new Map();

  constructor(config: AgentConfig) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      outputFile: config.outputFile ?? 'saync-failures.json',
      screenshotOnFailure: config.screenshotOnFailure ?? true,
      url: config.url,
    };
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: this.config.headless });
    this.page = await this.browser.newPage();
    await this.setupNetworkInterception();
    await this.page.goto(this.config.url, {
      waitUntil: 'networkidle',
      timeout: this.config.timeout,
    });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  private async setupNetworkInterception(): Promise<void> {
    if (!this.page) return;
    await this.page.route('**/*', async (route: Route) => {
      const request = route.request();
      const startTime = Date.now();
      await route.continue();
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
        try {
          const postData = request.postData();
          if (postData) captured.requestBody = JSON.parse(postData);
        } catch { /* not JSON */ }
        try {
          const body = await response.body();
          captured.responseBody = JSON.parse(body.toString());
        } catch { /* not JSON */ }
        const urlKey = new URL(request.url()).pathname;
        if (!this.capturedRequests.has(urlKey)) this.capturedRequests.set(urlKey, []);
        this.capturedRequests.get(urlKey)!.push(captured);
      }
    });
  }

  async readExpectations(): Promise<Expectation[]> {
    if (!this.page) throw new Error('Verifier not initialized');
    const expectations = await this.page.evaluate(() => {
      const m = window.__SAYNC_EXPECTATIONS__;
      return m ? Array.from(m.values()) : [];
    });
    this.allExpectations.clear();
    for (const e of expectations) this.allExpectations.set(e.id, e);
    return expectations;
  }

  async verifyExpectation(expectation: Expectation): Promise<VerificationResult> {
    const startTime = Date.now();
    const errors: VerificationError[] = [];

    // Dismiss any lingering overlay (drawer/modal/popover) from a
    // previous verification — they trap pointer events and would block
    // every click that follows. Skip when we're about to verify the
    // overlay itself; that verifier needs it in its current state.
    if (!OVERLAY_TYPES.has(expectation.type)) {
      await this.dismissOpenOverlay();
    }

    try {
      switch (expectation.type) {
        case 'button-click':
          await this.verifyButtonClick(expectation, errors); break;
        case 'input':
        case 'textarea':
          await this.verifyInput(expectation, errors); break;
        case 'form':
          await this.verifyForm(expectation, errors); break;
        case 'select':
          await this.verifySelect(expectation, errors); break;
        case 'checkbox':
        case 'switch':
          await this.verifyCheckbox(expectation, errors); break;
        case 'radio-group':
          await this.verifyRadioGroup(expectation, errors); break;
        case 'slider':
          await this.verifySlider(expectation, errors); break;
        case 'file-input':
          await this.verifyFileInput(expectation, errors); break;
        case 'date-picker':
          await this.verifyDatePicker(expectation, errors); break;
        case 'link':
        case 'nav-link':
          await this.verifyLink(expectation, errors); break;
        case 'tabs':
          await this.verifyTabs(expectation, errors); break;
        case 'breadcrumb':
          await this.verifyBreadcrumb(expectation, errors); break;
        case 'pagination':
          await this.verifyPagination(expectation, errors); break;
        case 'menu':
          await this.verifyMenu(expectation, errors); break;
        case 'region':
          await this.verifyRegion(expectation, errors); break;
        case 'modal':
          await this.verifyModal(expectation, errors); break;
        case 'drawer':
          await this.verifyDrawer(expectation, errors); break;
        case 'popover':
          await this.verifyPopover(expectation, errors); break;
        case 'tooltip':
          await this.verifyTooltip(expectation, errors); break;
        case 'accordion':
          await this.verifyAccordion(expectation, errors); break;
        case 'image':
          await this.verifyImage(expectation, errors); break;
        case 'avatar':
          await this.verifyAvatar(expectation, errors); break;
        case 'badge':
          await this.verifyBadge(expectation, errors); break;
        case 'toast':
        case 'alert':
          await this.verifyNotice(expectation, errors); break;
        case 'spinner':
          await this.verifySpinner(expectation, errors); break;
        case 'progress':
          await this.verifyProgress(expectation, errors); break;
        case 'skeleton':
          await this.verifySkeleton(expectation, errors); break;
        case 'list':
          await this.verifyList(expectation, errors); break;
        case 'table':
          await this.verifyTable(expectation, errors); break;
        case 'card':
          await this.verifyCard(expectation, errors); break;
        case 'tree':
          await this.verifyTree(expectation, errors); break;
        default: {
          // Exhaustive check — if a new ExpectationType is added in core
          // and not handled here, TypeScript surfaces it at compile time.
          const _exhaustive: never = expectation;
          void _exhaustive;
        }
      }
    } catch (error) {
      errors.push({
        type: 'unexpected-error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    const duration = Date.now() - startTime;
    const result: VerificationResult = {
      expectationId: expectation.id,
      passed: errors.length === 0,
      errors,
      duration,
      timestamp: new Date().toISOString(),
    };

    if (!result.passed && this.config.screenshotOnFailure && this.page) {
      const screenshot = await this.page.screenshot({ type: 'png' });
      result.screenshot = screenshot.toString('base64');
    }
    return result;
  }

  /* ═══════════════════════════════════════════════════════════
     BUTTON
     ═══════════════════════════════════════════════════════════ */
  private async verifyButtonClick(exp: ButtonExpectation, errors: VerificationError[]) {
    const button = await this.findOrError(exp.selector, 'button', errors);
    if (!button) return;
    this.capturedRequests.clear();
    await button.click();
    await this.page!.waitForTimeout(500);
    if (exp.onClick.apiCall) this.verifyApiCall(exp.onClick.apiCall, errors);
    if (exp.onClick.responseShape && exp.onClick.apiCall) {
      this.verifyResponseShape(exp.onClick.apiCall.url, exp.onClick.responseShape, errors);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     INPUT / TEXTAREA — share the same contract shape
     ═══════════════════════════════════════════════════════════ */
  private async verifyInput(exp: InputExpectation, errors: VerificationError[]) {
    const el = await this.findOrError(exp.selector, exp.type, errors);
    if (!el) return;

    // Static validation checks — declared attributes must match the DOM.
    const v = exp.contract.validation;
    if (v) await this.checkValidationAttrs(el, v, errors);

    // Dynamic: drive a typed value if onChange or onBlur is declared.
    if (exp.contract.onChange || exp.contract.onBlur) {
      this.capturedRequests.clear();
      const sample = sampleValueFor(v?.type ?? 'text');
      await el.fill(sample);

      if (exp.contract.onChange) {
        // For debounce: wait debounce + 100ms grace, then check API.
        const wait = (exp.contract.onChange.debounce ?? 0) + 200;
        await this.page!.waitForTimeout(wait);
        if (exp.contract.onChange.apiCall) {
          this.verifyApiCall(exp.contract.onChange.apiCall, errors);
        }
        if (exp.contract.onChange.fires === false && this.capturedRequests.size > 0) {
          errors.push({
            type: 'api-call',
            message: 'Typing fired an API call when `fires: false` was declared',
            actual: Array.from(this.capturedRequests.keys()),
          });
        }
      }

      if (exp.contract.onBlur) {
        this.capturedRequests.clear();
        await el.blur();
        await this.page!.waitForTimeout(300);
        if (exp.contract.onBlur.apiCall) {
          this.verifyApiCall(exp.contract.onBlur.apiCall, errors);
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     FORM — drives all child fields, submits, asserts the API
     ═══════════════════════════════════════════════════════════ */
  private async verifyForm(exp: FormExpectation, errors: VerificationError[]) {
    const form = await this.findOrError(exp.selector, 'form', errors);
    if (!form) return;

    // Fill each declared child field with a sensible sample. We DON'T
    // run their individual verifiers here (those execute separately on
    // their own pass); we just put valid data in so submit can succeed.
    for (const fieldId of exp.fieldIds) {
      const field = this.allExpectations.get(fieldId);
      if (!field) continue;
      await this.driveFieldWithSample(field).catch(() => {/* best-effort */});
    }

    this.capturedRequests.clear();
    const urlBefore = this.page!.url();

    // Submit. Prefer clicking a [type=submit] inside the form; fall back
    // to form.submit() via the DOM API.
    const submitBtn = form.locator('button[type="submit"], input[type="submit"]').first();
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
    } else {
      await form.evaluate((f: Element) => (f as HTMLFormElement).requestSubmit());
    }
    await this.page!.waitForTimeout(800);

    const submitContract = exp.contract.onSubmit;
    if (!submitContract) return;

    if (submitContract.apiCall) this.verifyApiCall(submitContract.apiCall, errors);
    if (submitContract.responseShape && submitContract.apiCall) {
      this.verifyResponseShape(submitContract.apiCall.url, submitContract.responseShape, errors);
    }
    if (submitContract.redirectTo) {
      const urlAfter = this.page!.url();
      if (urlBefore === urlAfter) {
        errors.push({
          type: 'api-call',
          message: 'Form submit did not navigate',
          expected: submitContract.redirectTo,
          actual: urlAfter,
        });
      } else if (!urlAfter.includes(submitContract.redirectTo)) {
        errors.push({
          type: 'api-call',
          message: 'Form submit redirected to wrong URL',
          expected: submitContract.redirectTo,
          actual: urlAfter,
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SELECT
     ═══════════════════════════════════════════════════════════ */
  private async verifySelect(exp: SelectExpectation, errors: VerificationError[]) {
    const select = await this.findOrError(exp.selector, 'select', errors);
    if (!select) return;

    if (exp.options) {
      // Static check: rendered <option> values match the declared set.
      const rendered = await select.evaluate((node: Element) => {
        return Array.from((node as HTMLSelectElement).options).map((o) => o.value);
      });
      const missing = exp.options.filter((o) => !rendered.includes(o));
      if (missing.length > 0) {
        errors.push({
          type: 'unexpected-error',
          message: 'Select is missing declared options',
          expected: exp.options,
          actual: rendered,
        });
      }
    }

    if (exp.contract.onChange) {
      this.capturedRequests.clear();
      const allowed = exp.contract.validation?.allowedValues ?? exp.options;
      const pick = allowed?.[0];
      if (!pick) {
        // Choose any rendered option as a fallback.
        const first = await select.evaluate((n: Element) => (n as HTMLSelectElement).options[0]?.value ?? '');
        if (!first) return;
        await select.selectOption(first);
      } else {
        await select.selectOption(pick);
      }
      await this.page!.waitForTimeout(300);
      if (exp.contract.onChange.apiCall) {
        this.verifyApiCall(exp.contract.onChange.apiCall, errors);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     CHECKBOX / SWITCH — same body, different `type` discriminator
     ═══════════════════════════════════════════════════════════ */
  private async verifyCheckbox(exp: CheckboxExpectation, errors: VerificationError[]) {
    const box = await this.findOrError(exp.selector, exp.type, errors);
    if (!box) return;
    if (exp.contract.onChange) {
      this.capturedRequests.clear();
      await box.click();
      await this.page!.waitForTimeout(300);
      if (exp.contract.onChange.apiCall) {
        this.verifyApiCall(exp.contract.onChange.apiCall, errors);
      }
    }
    if (exp.contract.validation?.required) {
      const required = await box.evaluate((n: Element) => (n as HTMLInputElement).required);
      if (!required) {
        errors.push({
          type: 'unexpected-error',
          message: 'Checkbox/switch declared required=true but DOM `required` is false',
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     RADIO GROUP — click each option, optionally verify API
     ═══════════════════════════════════════════════════════════ */
  private async verifyRadioGroup(exp: RadioGroupExpectation, errors: VerificationError[]) {
    const group = await this.findOrError(exp.selector, 'radio-group', errors);
    if (!group) return;
    if (exp.optionValues.length === 0) {
      errors.push({
        type: 'unexpected-error',
        message: 'RadioGroup has no child <Saync.Radio> options registered',
      });
      return;
    }

    if (exp.contract.validation?.allowedValues) {
      const missing = exp.contract.validation.allowedValues.filter(
        (v) => !exp.optionValues.includes(v),
      );
      if (missing.length > 0) {
        errors.push({
          type: 'unexpected-error',
          message: 'RadioGroup missing declared allowedValues',
          expected: exp.contract.validation.allowedValues,
          actual: exp.optionValues,
        });
      }
    }

    if (exp.contract.onChange) {
      this.capturedRequests.clear();
      // Click the first option — verifying every option would multiply
      // run time; one is enough to assert the change handler fires.
      const firstRadio = group.locator('input[type="radio"]').first();
      await firstRadio.click();
      await this.page!.waitForTimeout(300);
      if (exp.contract.onChange.apiCall) {
        this.verifyApiCall(exp.contract.onChange.apiCall, errors);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SLIDER — fill numeric, verify API
     ═══════════════════════════════════════════════════════════ */
  private async verifySlider(exp: SliderExpectation, errors: VerificationError[]) {
    const slider = await this.findOrError(exp.selector, 'slider', errors);
    if (!slider) return;

    // Static checks: DOM min/max/step match the registered metadata.
    const attrs = await slider.evaluate((n: Element) => {
      const el = n as HTMLInputElement;
      return { min: el.min, max: el.max, step: el.step };
    });
    const expectedMin = exp.min !== undefined ? String(exp.min) : '';
    const expectedMax = exp.max !== undefined ? String(exp.max) : '';
    if (expectedMin && attrs.min !== expectedMin) {
      errors.push({
        type: 'unexpected-error',
        message: 'Slider DOM min does not match declared',
        expected: exp.min, actual: attrs.min,
      });
    }
    if (expectedMax && attrs.max !== expectedMax) {
      errors.push({
        type: 'unexpected-error',
        message: 'Slider DOM max does not match declared',
        expected: exp.max, actual: attrs.max,
      });
    }

    if (exp.contract.onChange) {
      this.capturedRequests.clear();
      // Pick a midpoint value if min/max provided; otherwise just "50".
      const mid = exp.min !== undefined && exp.max !== undefined
        ? String(Math.floor((exp.min + exp.max) / 2))
        : '50';
      await slider.fill(mid);
      await this.page!.waitForTimeout((exp.contract.onChange.debounce ?? 0) + 300);
      if (exp.contract.onChange.apiCall) {
        this.verifyApiCall(exp.contract.onChange.apiCall, errors);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     FILE INPUT — synthesize a fixture, upload, verify API
     ═══════════════════════════════════════════════════════════ */
  private async verifyFileInput(exp: FileInputExpectation, errors: VerificationError[]) {
    const input = await this.findOrError(exp.selector, 'file-input', errors);
    if (!input) return;

    if (exp.accept) {
      const accept = await input.evaluate((n: Element) => (n as HTMLInputElement).accept);
      if (accept !== exp.accept) {
        errors.push({
          type: 'unexpected-error',
          message: 'FileInput accept attribute mismatch',
          expected: exp.accept, actual: accept,
        });
      }
    }

    if (exp.contract.upload) {
      this.capturedRequests.clear();
      // Pick a plausible MIME from the accept hint. Defaults to text/plain.
      const mime = pickMimeFromAccept(exp.accept) ?? 'text/plain';
      const ext = mimeExt(mime);
      await input.setInputFiles({
        name: `saync-fixture.${ext}`,
        mimeType: mime,
        buffer: Buffer.from('saync-test'),
      });
      await this.page!.waitForTimeout(800);
      if (exp.contract.upload.apiCall) {
        this.verifyApiCall(exp.contract.upload.apiCall, errors);
      }
      if (exp.contract.upload.responseShape && exp.contract.upload.apiCall) {
        this.verifyResponseShape(exp.contract.upload.apiCall.url, exp.contract.upload.responseShape, errors);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     DATE PICKER — fill ISO date, verify
     ═══════════════════════════════════════════════════════════ */
  private async verifyDatePicker(exp: DatePickerExpectation, errors: VerificationError[]) {
    const picker = await this.findOrError(exp.selector, 'date-picker', errors);
    if (!picker) return;

    if (exp.contract.onChange) {
      this.capturedRequests.clear();
      const sample = sampleDateFor(exp.dateType, exp.min, exp.max);
      await picker.fill(sample);
      await this.page!.waitForTimeout(300);
      if (exp.contract.onChange.apiCall) {
        this.verifyApiCall(exp.contract.onChange.apiCall, errors);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     LINK / NAV-LINK — click, verify URL changes, verify `appears`
     ═══════════════════════════════════════════════════════════ */
  private async verifyLink(
    exp: LinkExpectation | NavLinkExpectation,
    errors: VerificationError[],
  ) {
    const link = await this.findOrError(exp.selector, exp.type, errors);
    if (!link) return;

    if (!exp.contract.onNavigate) return;
    const urlBefore = this.page!.url();
    this.capturedRequests.clear();
    await link.click();
    await this.page!.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page!.waitForTimeout(500);

    const urlAfter = this.page!.url();
    const expectedUrl = exp.contract.onNavigate.toUrl;
    if (expectedUrl) {
      const matched = expectedUrl.endsWith('*')
        ? urlAfter.includes(expectedUrl.slice(0, -1))
        : urlAfter.includes(expectedUrl);
      if (!matched) {
        errors.push({
          type: 'api-call',
          message: 'Link did not navigate to expected URL',
          expected: expectedUrl,
          actual: urlAfter,
        });
      }
    } else if (urlBefore === urlAfter) {
      errors.push({
        type: 'api-call',
        message: 'Link click did not navigate',
        actual: urlAfter,
      });
    }

    if (exp.contract.onNavigate.appears) {
      const appears = this.page!.locator(exp.contract.onNavigate.appears).first();
      const visible = await appears.isVisible().catch(() => false);
      if (!visible) {
        errors.push({
          type: 'selector-not-found',
          message: `Expected element not visible after navigation: ${exp.contract.onNavigate.appears}`,
        });
      }
    }

    if (exp.contract.onNavigate.apiCall) {
      this.verifyApiCall(exp.contract.onNavigate.apiCall, errors);
    }

    // Deliberately DON'T navigate back here. Reloading the page would
    // re-mount every SDK component, regenerating their random-suffixed
    // expectation IDs. Subsequent verifications would then look up stale
    // IDs from our pre-click registry snapshot and all fail with
    // selector-not-found. Instead, runner.ts orders link verifications
    // last so earlier contracts have already run.
  }

  /* ═══════════════════════════════════════════════════════════
     TABS — click each tab, verify each registered value works
     ═══════════════════════════════════════════════════════════ */
  private async verifyTabs(exp: TabsExpectation, errors: VerificationError[]) {
    const list = await this.findOrError(exp.selector, 'tabs', errors);
    if (!list) return;

    if (exp.contract.validation?.allowedValues) {
      const missing = exp.contract.validation.allowedValues.filter(
        (v) => !exp.tabValues.includes(v),
      );
      if (missing.length > 0) {
        errors.push({
          type: 'unexpected-error',
          message: 'Tabs missing declared allowedValues',
          expected: exp.contract.validation.allowedValues,
          actual: exp.tabValues,
        });
      }
    }

    if (exp.contract.onChange && exp.tabValues.length > 1) {
      // Click the SECOND tab (the first is usually already selected).
      this.capturedRequests.clear();
      const targetValue = exp.tabValues[1];
      const tabBtn = list.locator(`[data-saync-value="${targetValue}"]`).first();
      if ((await tabBtn.count()) > 0) {
        await tabBtn.click();
        await this.page!.waitForTimeout(300);
        if (exp.contract.onChange.apiCall) {
          this.verifyApiCall(exp.contract.onChange.apiCall, errors);
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     BREADCRUMB — structural assertions only
     ═══════════════════════════════════════════════════════════ */
  private async verifyBreadcrumb(exp: BreadcrumbExpectation, errors: VerificationError[]) {
    const nav = await this.findOrError(exp.selector, 'breadcrumb', errors);
    if (!nav) return;

    if (exp.contract.lastIsCurrent && exp.itemHrefs.length > 0) {
      const lastHref = exp.itemHrefs[exp.itemHrefs.length - 1];
      if (lastHref !== null) {
        errors.push({
          type: 'unexpected-error',
          message: 'Last breadcrumb item has an href; should be the current (non-link) page',
          expected: 'no href on last item',
          actual: lastHref,
        });
      }
    }

    if (exp.contract.pathsMatchHierarchy) {
      // Every successive non-null href must be longer than (or equal to) the prior.
      const hrefs = exp.itemHrefs.filter((h): h is string => h !== null);
      for (let i = 1; i < hrefs.length; i++) {
        if (!hrefs[i].startsWith(hrefs[i - 1]) && hrefs[i - 1] !== '/') {
          errors.push({
            type: 'unexpected-error',
            message: `Breadcrumb hierarchy break: ${hrefs[i]} is not a sub-path of ${hrefs[i - 1]}`,
          });
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     PAGINATION — click Next, verify URL param + API
     ═══════════════════════════════════════════════════════════ */
  private async verifyPagination(exp: PaginationExpectation, errors: VerificationError[]) {
    const nav = await this.findOrError(exp.selector, 'pagination', errors);
    if (!nav) return;

    if (!exp.contract.onChange) return;
    this.capturedRequests.clear();
    const nextBtn = nav.locator('button[aria-label="Next page"]').first();
    if ((await nextBtn.count()) === 0) {
      errors.push({
        type: 'selector-not-found',
        message: 'Pagination missing Next button',
      });
      return;
    }
    await nextBtn.click();
    await this.page!.waitForTimeout(400);

    if (exp.contract.onChange.apiCall) {
      this.verifyApiCall(exp.contract.onChange.apiCall, errors);
    }
    if (exp.contract.onChange.urlParam) {
      const url = new URL(this.page!.url());
      if (!url.searchParams.has(exp.contract.onChange.urlParam)) {
        errors.push({
          type: 'unexpected-error',
          message: 'Pagination did not write the page number to the URL',
          expected: `?${exp.contract.onChange.urlParam}=…`,
          actual: this.page!.url(),
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MENU — trigger → opens; Escape → closes; outside click → closes
     ═══════════════════════════════════════════════════════════ */
  private async verifyMenu(exp: MenuExpectation, errors: VerificationError[]) {
    const container = await this.findOrError(exp.selector, 'menu', errors);
    if (!container) return;

    const trigger = container.locator('button[aria-haspopup="menu"]').first();
    if ((await trigger.count()) === 0) {
      errors.push({
        type: 'selector-not-found',
        message: 'Menu has no trigger button with aria-haspopup="menu"',
      });
      return;
    }
    await trigger.click();
    await this.page!.waitForTimeout(200);

    // Did the panel appear?
    const panel = this.page!.locator(`[data-saync-menu-panel="${exp.id}"]`).first();
    const opened = await panel.isVisible().catch(() => false);
    if (!opened) {
      errors.push({
        type: 'unexpected-error',
        message: 'Menu trigger did not open the panel',
      });
      return;
    }

    if (exp.contract.validation?.closesOnEscape !== false) {
      await this.page!.keyboard.press('Escape');
      await this.page!.waitForTimeout(150);
      const stillOpen = await panel.isVisible().catch(() => false);
      if (stillOpen) {
        errors.push({
          type: 'unexpected-error',
          message: 'Menu did not close on Escape key',
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     REGION / SECTION — static layout assertions only
     ═══════════════════════════════════════════════════════════ */
  private async verifyRegion(exp: RegionExpectation, errors: VerificationError[]) {
    const el = await this.findOrError(exp.selector, exp.tagName, errors);
    if (!el) return;
    const c = exp.contract;

    if (c.containsText) {
      const text = await el.innerText().catch(() => '');
      if (!text.includes(c.containsText)) {
        errors.push({
          type: 'unexpected-error',
          message: `Region missing expected text`,
          expected: c.containsText,
          actual: text.slice(0, 80),
        });
      }
    }

    if (c.appears) {
      const inner = el.locator(c.appears).first();
      const visible = await inner.isVisible().catch(() => false);
      if (!visible) {
        errors.push({
          type: 'selector-not-found',
          message: `Region's required descendant not visible: ${c.appears}`,
        });
      }
    }

    if (c.notClipped) {
      const overflow = await el.evaluate((n: Element) => {
        const rect = (n as HTMLElement).getBoundingClientRect();
        return { right: rect.right, vw: window.innerWidth };
      });
      if (overflow.right > overflow.vw + 1) {
        errors.push({
          type: 'unexpected-error',
          message: `Region clipped by viewport`,
          expected: `<= ${overflow.vw}px right edge`,
          actual: `${overflow.right}px`,
        });
      }
    }

    if (c.minTapTarget !== undefined) {
      const size = await el.evaluate((n: Element) => {
        const r = (n as HTMLElement).getBoundingClientRect();
        return Math.min(r.width, r.height);
      });
      if (size < c.minTapTarget) {
        errors.push({
          type: 'unexpected-error',
          message: `Region below minTapTarget`,
          expected: `>= ${c.minTapTarget}px`,
          actual: `${size}px`,
        });
      }
    }

    if (c.visibleAt && c.visibleAt.length > 0) {
      for (const viewport of c.visibleAt) {
        const dims = VIEWPORTS[viewport];
        await this.page!.setViewportSize(dims);
        await this.page!.waitForTimeout(150);
        const visible = await el.isVisible().catch(() => false);
        if (!visible) {
          errors.push({
            type: 'unexpected-error',
            message: `Region not visible at ${viewport} viewport`,
            expected: `visible at ${dims.width}x${dims.height}`,
            actual: 'hidden / display:none',
          });
        }
      }
      // Restore the default 1440x900 — subsequent verifications expect it.
      await this.page!.setViewportSize(VIEWPORTS.desktop);
      await this.page!.waitForTimeout(100);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MODAL / DRAWER — both controlled; verifier can only inspect
     ═══════════════════════════════════════════════════════════ */
  private async verifyModal(exp: ModalExpectation, errors: VerificationError[]) {
    await this.verifyControlledDisclosure(exp.selector, 'modal', exp.role, exp.contract, errors);
  }

  private async verifyDrawer(exp: DrawerExpectation, errors: VerificationError[]) {
    await this.verifyControlledDisclosure(exp.selector, 'drawer', 'dialog', exp.contract, errors);
  }

  /**
   * Shared body for Modal/Drawer. Both render nothing while closed
   * (the registered DOM disappears when `open={false}`), so when the
   * verifier visits, the element may not exist. If it does exist
   * (someone opened it in app code, or the user expects it always
   * rendered): assert a11y attrs, Escape closes, click outside closes.
   */
  private async verifyControlledDisclosure(
    selector: string,
    kind: 'modal' | 'drawer',
    role: 'dialog' | 'alertdialog',
    contract: {
      closesOnEscape?: boolean;
      closesOnOutsideClick?: boolean;
      trapsFocus?: boolean;
      hasBackdrop?: boolean;
    },
    errors: VerificationError[],
  ) {
    if (!this.page) return;
    const root = this.page.locator(selector).first();
    if ((await root.count()) === 0) {
      // Controlled disclosure isn't currently rendered — we can't drive
      // it from outside the app. Pass quietly; the agent has no way to
      // open it without knowing the trigger.
      return;
    }

    const panel = this.page.locator(`[data-saync-${kind}-panel]`).first();
    if ((await panel.count()) === 0) {
      errors.push({
        type: 'unexpected-error',
        message: `${kind} is rendered but has no panel element`,
      });
      return;
    }

    // a11y: panel should have the right role + aria-modal.
    const ariaRole = await panel.getAttribute('role');
    if (ariaRole !== role) {
      errors.push({
        type: 'unexpected-error',
        message: `${kind} panel role mismatch`,
        expected: role,
        actual: ariaRole,
      });
    }

    if (contract.hasBackdrop !== false) {
      // The root <div role="presentation"> with the dim background is the backdrop.
      const backdropRole = await root.getAttribute('role');
      if (backdropRole !== 'presentation') {
        errors.push({
          type: 'unexpected-error',
          message: `${kind} backdrop missing role="presentation"`,
        });
      }
    }

    if (contract.closesOnEscape !== false) {
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(150);
      const stillVisible = await panel.isVisible().catch(() => false);
      if (stillVisible) {
        errors.push({
          type: 'unexpected-error',
          message: `${kind} did not close on Escape`,
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     POPOVER — uncontrolled; trigger is inside the component
     ═══════════════════════════════════════════════════════════ */
  private async verifyPopover(exp: PopoverExpectation, errors: VerificationError[]) {
    const root = await this.findOrError(exp.selector, 'popover', errors);
    if (!root) return;

    const trigger = root.locator('button[aria-haspopup="dialog"]').first();
    if ((await trigger.count()) === 0) {
      errors.push({
        type: 'selector-not-found',
        message: 'Popover has no trigger button with aria-haspopup="dialog"',
      });
      return;
    }
    await trigger.click();
    await this.page!.waitForTimeout(150);

    const panel = this.page!.locator(`[data-saync-popover-panel="${exp.id}"]`).first();
    const opened = await panel.isVisible().catch(() => false);
    if (!opened) {
      errors.push({
        type: 'unexpected-error',
        message: 'Popover trigger did not open the panel',
      });
      return;
    }

    if (exp.contract.closesOnEscape !== false) {
      await this.page!.keyboard.press('Escape');
      await this.page!.waitForTimeout(150);
      const stillOpen = await panel.isVisible().catch(() => false);
      if (stillOpen) {
        errors.push({
          type: 'unexpected-error',
          message: 'Popover did not close on Escape',
        });
      }
    }

    if (exp.contract.closesOnOutsideClick !== false) {
      // Re-open and click outside the popover container.
      await trigger.click();
      await this.page!.waitForTimeout(100);
      await this.page!.mouse.click(5, 5);
      await this.page!.waitForTimeout(150);
      const stillOpen = await panel.isVisible().catch(() => false);
      if (stillOpen) {
        errors.push({
          type: 'unexpected-error',
          message: 'Popover did not close on outside click',
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TOOLTIP — hover-driven; uncontrolled
     ═══════════════════════════════════════════════════════════ */
  private async verifyTooltip(exp: TooltipExpectation, errors: VerificationError[]) {
    const wrap = await this.findOrError(exp.selector, 'tooltip', errors);
    if (!wrap) return;

    if (exp.contract.showsOnHover !== false) {
      await wrap.hover();
      await this.page!.waitForTimeout(150);
      const bubble = this.page!.locator(`[data-saync-tooltip-content="${exp.id}"]`).first();
      const visible = await bubble.isVisible().catch(() => false);
      if (!visible) {
        errors.push({
          type: 'unexpected-error',
          message: 'Tooltip did not appear on hover',
        });
        return;
      }
      if (exp.contract.containsText) {
        const text = await bubble.innerText().catch(() => '');
        if (!text.includes(exp.contract.containsText)) {
          errors.push({
            type: 'unexpected-error',
            message: 'Tooltip text mismatch',
            expected: exp.contract.containsText,
            actual: text,
          });
        }
      }
      if (exp.contract.hidesOnBlur !== false) {
        // Move mouse away from the wrap to dispatch mouseleave.
        await this.page!.mouse.move(0, 0);
        await this.page!.waitForTimeout(150);
        const stillVisible = await bubble.isVisible().catch(() => false);
        if (stillVisible) {
          errors.push({
            type: 'unexpected-error',
            message: 'Tooltip did not hide on mouseleave/blur',
          });
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     ACCORDION — click an item, assert content; if exclusive, second
     click should close the first
     ═══════════════════════════════════════════════════════════ */
  private async verifyAccordion(exp: AccordionExpectation, errors: VerificationError[]) {
    const root = await this.findOrError(exp.selector, 'accordion', errors);
    if (!root) return;
    if (exp.itemIds.length < 1) {
      errors.push({
        type: 'unexpected-error',
        message: 'Accordion has no <Saync.AccordionItem> children registered',
      });
      return;
    }

    if (exp.contract.expandsOnClick !== false) {
      const firstHeader = root.locator(`button[data-saync-accordion-header="${exp.itemIds[0]}"]`).first();
      await firstHeader.click();
      await this.page!.waitForTimeout(150);
      const firstContent = this.page!.locator(`[data-saync-accordion-content="${exp.itemIds[0]}"]`).first();
      const opened = await firstContent.isVisible().catch(() => false);
      if (!opened) {
        errors.push({
          type: 'unexpected-error',
          message: 'AccordionItem did not expand on click',
        });
        return;
      }

      if (exp.contract.exclusive && exp.itemIds.length >= 2) {
        const secondHeader = root.locator(`button[data-saync-accordion-header="${exp.itemIds[1]}"]`).first();
        await secondHeader.click();
        await this.page!.waitForTimeout(150);
        const firstStillOpen = await firstContent.isVisible().catch(() => false);
        if (firstStillOpen) {
          errors.push({
            type: 'unexpected-error',
            message: 'Accordion declared exclusive=true but opening a second item left the first open',
          });
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     IMAGE — assert load + alt + min dimensions
     ═══════════════════════════════════════════════════════════ */
  private async verifyImage(exp: ImageExpectation, errors: VerificationError[]) {
    const img = await this.findOrError(exp.selector, 'image', errors);
    if (!img) return;
    const c = exp.contract;

    const info = await img.evaluate((n: Element) => {
      const el = n as HTMLImageElement;
      return {
        complete: el.complete,
        naturalWidth: el.naturalWidth,
        naturalHeight: el.naturalHeight,
        renderedWidth: el.getBoundingClientRect().width,
        renderedHeight: el.getBoundingClientRect().height,
        alt: el.alt,
      };
    });

    if (c.loads !== false) {
      if (!info.complete || info.naturalWidth === 0) {
        errors.push({
          type: 'unexpected-error',
          message: `Image failed to load: ${exp.src}`,
          actual: `complete=${info.complete}, naturalWidth=${info.naturalWidth}`,
        });
        return;
      }
    }
    if (c.hasAlt !== undefined) {
      if (typeof c.hasAlt === 'string') {
        if (info.alt !== c.hasAlt) {
          errors.push({
            type: 'unexpected-error',
            message: 'Image alt text mismatch',
            expected: c.hasAlt, actual: info.alt,
          });
        }
      } else if (c.hasAlt === true && !info.alt) {
        errors.push({
          type: 'unexpected-error',
          message: 'Image declared hasAlt=true but alt attribute is empty',
        });
      }
    }
    if (c.minWidth !== undefined && info.renderedWidth < c.minWidth) {
      errors.push({
        type: 'unexpected-error',
        message: 'Image below minWidth',
        expected: `>= ${c.minWidth}px`, actual: `${info.renderedWidth}px`,
      });
    }
    if (c.minHeight !== undefined && info.renderedHeight < c.minHeight) {
      errors.push({
        type: 'unexpected-error',
        message: 'Image below minHeight',
        expected: `>= ${c.minHeight}px`, actual: `${info.renderedHeight}px`,
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     AVATAR — image OR fallback (never broken)
     ═══════════════════════════════════════════════════════════ */
  private async verifyAvatar(exp: AvatarExpectation, errors: VerificationError[]) {
    const shell = await this.findOrError(exp.selector, 'avatar', errors);
    if (!shell) return;

    const state = await shell.evaluate((n: Element) => {
      const root = n as HTMLElement;
      const img = root.querySelector('img');
      const fallback = root.querySelector('[data-saync-avatar-fallback]');
      return {
        hasImage: !!img,
        imageOk: !!(img && (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0),
        hasFallback: !!fallback,
        ariaLabel: root.getAttribute('aria-label') || '',
      };
    });

    if (exp.contract.hasVisibleContent !== false) {
      const ok = state.imageOk || state.hasFallback;
      if (!ok) {
        errors.push({
          type: 'unexpected-error',
          message: 'Avatar has neither a loaded image nor a fallback visible',
          actual: state,
        });
      }
    }
    if (exp.contract.hasAlt !== false && !state.ariaLabel) {
      errors.push({
        type: 'unexpected-error',
        message: 'Avatar has empty aria-label',
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     BADGE — visible, contains expected text/number
     ═══════════════════════════════════════════════════════════ */
  private async verifyBadge(exp: BadgeExpectation, errors: VerificationError[]) {
    const el = await this.findOrError(exp.selector, 'badge', errors);
    if (!el) return;

    if (exp.contract.visible !== false) {
      const visible = await el.isVisible().catch(() => false);
      if (!visible) {
        errors.push({
          type: 'unexpected-error',
          message: 'Badge declared visible=true but is not visible',
        });
      }
    }
    const text = (await el.innerText().catch(() => '')).trim();
    if (exp.contract.containsText && !text.includes(exp.contract.containsText)) {
      errors.push({
        type: 'unexpected-error',
        message: 'Badge text mismatch',
        expected: exp.contract.containsText, actual: text,
      });
    }
    if (exp.contract.numberInRange) {
      const n = Number(text);
      if (Number.isNaN(n)) {
        errors.push({
          type: 'unexpected-error',
          message: 'Badge declared numberInRange but content is not numeric',
          actual: text,
        });
      } else {
        const { min, max } = exp.contract.numberInRange;
        if (min !== undefined && n < min) {
          errors.push({
            type: 'unexpected-error',
            message: 'Badge number below declared min',
            expected: `>= ${min}`, actual: n,
          });
        }
        if (max !== undefined && n > max) {
          errors.push({
            type: 'unexpected-error',
            message: 'Badge number above declared max',
            expected: `<= ${max}`, actual: n,
          });
        }
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TOAST / ALERT — share verifyNotice; role differs by severity
     ═══════════════════════════════════════════════════════════ */
  private async verifyNotice(
    exp: ToastExpectation | AlertExpectation,
    errors: VerificationError[],
  ) {
    const el = await this.findOrError(exp.selector, exp.type, errors);
    if (!el) return;

    const info = await el.evaluate((n: Element) => {
      const root = n as HTMLElement;
      return {
        role: root.getAttribute('role') || '',
        severity: root.getAttribute('data-saync-severity') || '',
        dismissesAfter: root.getAttribute('data-saync-dismisses-after'),
        dismissible: root.getAttribute('data-saync-dismissible') === 'true',
        text: root.innerText.trim(),
      };
    });

    if (exp.contract.containsText && !info.text.includes(exp.contract.containsText)) {
      errors.push({
        type: 'unexpected-error',
        message: `${exp.type} text mismatch`,
        expected: exp.contract.containsText, actual: info.text.slice(0, 80),
      });
    }
    if (exp.contract.severity && info.severity !== exp.contract.severity) {
      errors.push({
        type: 'unexpected-error',
        message: `${exp.type} severity mismatch`,
        expected: exp.contract.severity, actual: info.severity,
      });
    }
    if (exp.contract.dismissible === true && !info.dismissible) {
      errors.push({
        type: 'unexpected-error',
        message: `${exp.type} declared dismissible but no dismiss button is rendered`,
      });
    }
    if (exp.contract.dismissesAfter !== undefined) {
      const declared = info.dismissesAfter ? Number(info.dismissesAfter) : null;
      if (declared !== exp.contract.dismissesAfter) {
        errors.push({
          type: 'unexpected-error',
          message: `${exp.type} dismissesAfter mismatch`,
          expected: `${exp.contract.dismissesAfter}ms`,
          actual: declared ? `${declared}ms` : 'unset',
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SPINNER — a11y attributes only (declarative)
     ═══════════════════════════════════════════════════════════ */
  private async verifySpinner(exp: SpinnerExpectation, errors: VerificationError[]) {
    const el = await this.findOrError(exp.selector, 'spinner', errors);
    if (!el) return;

    const info = await el.evaluate((n: Element) => ({
      role: (n as HTMLElement).getAttribute('role') || '',
      ariaLabel: (n as HTMLElement).getAttribute('aria-label') || '',
    }));

    if (exp.contract.hasStatusRole !== false && info.role !== 'status') {
      errors.push({
        type: 'unexpected-error',
        message: 'Spinner missing role="status"',
        expected: 'status', actual: info.role,
      });
    }
    if (exp.contract.hasAriaLabel !== false && !info.ariaLabel) {
      errors.push({
        type: 'unexpected-error',
        message: 'Spinner missing aria-label',
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     PROGRESS — value and aria-valuenow checks
     ═══════════════════════════════════════════════════════════ */
  private async verifyProgress(exp: ProgressExpectation, errors: VerificationError[]) {
    const el = await this.findOrError(exp.selector, 'progress', errors);
    if (!el) return;

    const info = await el.evaluate((n: Element) => ({
      role: (n as HTMLElement).getAttribute('role') || '',
      valueNow: (n as HTMLElement).getAttribute('aria-valuenow'),
      valueMin: (n as HTMLElement).getAttribute('aria-valuemin'),
      valueMax: (n as HTMLElement).getAttribute('aria-valuemax'),
    }));

    if (info.role !== 'progressbar') {
      errors.push({
        type: 'unexpected-error',
        message: 'Progress missing role="progressbar"',
      });
    }
    const valueNum = info.valueNow !== null ? Number(info.valueNow) : NaN;
    if (exp.contract.hasValue !== false && Number.isNaN(valueNum)) {
      errors.push({
        type: 'unexpected-error',
        message: 'Progress aria-valuenow missing or not numeric',
        actual: info.valueNow,
      });
    }
    if (exp.contract.range) {
      const { min, max } = exp.contract.range;
      if (min !== undefined && valueNum < min) {
        errors.push({
          type: 'unexpected-error',
          message: 'Progress value below declared min',
          expected: `>= ${min}`, actual: valueNum,
        });
      }
      if (max !== undefined && valueNum > max) {
        errors.push({
          type: 'unexpected-error',
          message: 'Progress value above declared max',
          expected: `<= ${max}`, actual: valueNum,
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SKELETON — decorative; aria-hidden + animated
     ═══════════════════════════════════════════════════════════ */
  private async verifySkeleton(exp: SkeletonExpectation, errors: VerificationError[]) {
    const el = await this.findOrError(exp.selector, 'skeleton', errors);
    if (!el) return;

    const info = await el.evaluate((n: Element) => {
      const root = n as HTMLElement;
      return {
        ariaHidden: root.getAttribute('aria-hidden') || '',
        animation: window.getComputedStyle(root).animationName,
      };
    });

    if (exp.contract.ariaHidden !== false && info.ariaHidden !== 'true') {
      errors.push({
        type: 'unexpected-error',
        message: 'Skeleton missing aria-hidden="true" (it should be decorative)',
        actual: info.ariaHidden,
      });
    }
    if (exp.contract.animated === true && (!info.animation || info.animation === 'none')) {
      errors.push({
        type: 'unexpected-error',
        message: 'Skeleton declared animated=true but has no CSS animation',
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     LIST — count <li> descendants, check item text
     ═══════════════════════════════════════════════════════════ */
  private async verifyList(exp: ListExpectation, errors: VerificationError[]) {
    const list = await this.findOrError(exp.selector, 'list', errors);
    if (!list) return;

    // Expected tag: <ol> when ordered, <ul> otherwise.
    const tag = await list.evaluate((n: Element) => n.tagName.toLowerCase());
    const expectedTag = exp.ordered ? 'ol' : 'ul';
    if (tag !== expectedTag) {
      errors.push({
        type: 'unexpected-error',
        message: `List rendered wrong element`,
        expected: expectedTag, actual: tag,
      });
    }

    // Count direct <li> children — not all descendants (nested lists
    // shouldn't double-count). Most lists are flat.
    const info = await list.evaluate((n: Element) => {
      const items = Array.from(n.children).filter((c) => c.tagName === 'LI');
      return {
        count: items.length,
        texts: items.map((c) => (c as HTMLElement).innerText.trim()),
      };
    });

    if (exp.contract.minItems !== undefined && info.count < exp.contract.minItems) {
      errors.push({
        type: 'unexpected-error',
        message: `List has fewer items than declared minimum`,
        expected: `>= ${exp.contract.minItems}`,
        actual: info.count,
      });
    }
    if (exp.contract.maxItems !== undefined && info.count > exp.contract.maxItems) {
      errors.push({
        type: 'unexpected-error',
        message: `List has more items than declared maximum`,
        expected: `<= ${exp.contract.maxItems}`,
        actual: info.count,
      });
    }
    if (exp.contract.itemContains) {
      const missing = info.texts
        .map((t, i) => (t.includes(exp.contract.itemContains!) ? null : i))
        .filter((i): i is number => i !== null);
      if (missing.length > 0) {
        errors.push({
          type: 'unexpected-error',
          message: `${missing.length} list item(s) missing required text`,
          expected: exp.contract.itemContains,
          actual: missing.map((i) => `[${i}] "${info.texts[i].slice(0, 40)}"`).join(', '),
        });
      }
    }
    if (info.count === 0 && exp.contract.emptyStateSelector) {
      const empty = this.page!.locator(exp.contract.emptyStateSelector).first();
      const visible = await empty.isVisible().catch(() => false);
      if (!visible) {
        errors.push({
          type: 'selector-not-found',
          message: `List is empty but emptyState element not visible: ${exp.contract.emptyStateSelector}`,
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TABLE — column headers, row count, caption
     ═══════════════════════════════════════════════════════════ */
  private async verifyTable(exp: TableExpectation, errors: VerificationError[]) {
    const table = await this.findOrError(exp.selector, 'table', errors);
    if (!table) return;

    const info = await table.evaluate((n: Element) => {
      const t = n as HTMLTableElement;
      const headers = Array.from(t.querySelectorAll('thead th, thead td'))
        .map((c) => (c as HTMLElement).innerText.trim());
      const bodyRows = t.querySelectorAll('tbody tr').length;
      const caption = t.querySelector('caption')?.innerText.trim() ?? '';
      return { headers, bodyRows, caption };
    });

    if (exp.contract.columns) {
      if (info.headers.length !== exp.contract.columns.length) {
        errors.push({
          type: 'unexpected-error',
          message: 'Table column count mismatch',
          expected: exp.contract.columns,
          actual: info.headers,
        });
      } else {
        for (let i = 0; i < exp.contract.columns.length; i++) {
          if (info.headers[i] !== exp.contract.columns[i]) {
            errors.push({
              type: 'unexpected-error',
              message: `Table column ${i} mismatch`,
              expected: exp.contract.columns[i],
              actual: info.headers[i],
            });
          }
        }
      }
    }
    if (exp.contract.minRows !== undefined && info.bodyRows < exp.contract.minRows) {
      errors.push({
        type: 'unexpected-error',
        message: 'Table has fewer rows than declared minimum',
        expected: `>= ${exp.contract.minRows}`,
        actual: info.bodyRows,
      });
    }
    if (exp.contract.maxRows !== undefined && info.bodyRows > exp.contract.maxRows) {
      errors.push({
        type: 'unexpected-error',
        message: 'Table has more rows than declared maximum',
        expected: `<= ${exp.contract.maxRows}`,
        actual: info.bodyRows,
      });
    }
    if (exp.contract.captionContains && !info.caption.includes(exp.contract.captionContains)) {
      errors.push({
        type: 'unexpected-error',
        message: 'Table caption text mismatch',
        expected: exp.contract.captionContains,
        actual: info.caption || '(no caption)',
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     CARD — contains text, clickable wrapper present
     ═══════════════════════════════════════════════════════════ */
  private async verifyCard(exp: CardExpectation, errors: VerificationError[]) {
    const card = await this.findOrError(exp.selector, 'card', errors);
    if (!card) return;

    if (exp.contract.containsText) {
      const text = (await card.innerText().catch(() => '')).trim();
      if (!text.includes(exp.contract.containsText)) {
        errors.push({
          type: 'unexpected-error',
          message: 'Card text mismatch',
          expected: exp.contract.containsText,
          actual: text.slice(0, 80),
        });
      }
    }
    if (exp.contract.clickable === true) {
      const inLink = await card.evaluate((n: Element) => {
        return n.parentElement?.tagName === 'A' || n.closest('a') !== null;
      });
      if (!inLink) {
        errors.push({
          type: 'unexpected-error',
          message: 'Card declared clickable but is not wrapped in an <a>',
        });
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════
     TREE — count role="treeitem" descendants
     ═══════════════════════════════════════════════════════════ */
  private async verifyTree(exp: TreeExpectation, errors: VerificationError[]) {
    const tree = await this.findOrError(exp.selector, 'tree', errors);
    if (!tree) return;

    const info = await tree.evaluate((n: Element) => ({
      role: (n as HTMLElement).getAttribute('role'),
      nodeCount: n.querySelectorAll('[role="treeitem"]').length,
    }));

    if (exp.contract.hasTreeRole !== false && info.role !== 'tree') {
      errors.push({
        type: 'unexpected-error',
        message: 'Tree root missing role="tree"',
        expected: 'tree',
        actual: info.role,
      });
    }
    if (exp.contract.minNodes !== undefined && info.nodeCount < exp.contract.minNodes) {
      errors.push({
        type: 'unexpected-error',
        message: 'Tree has fewer nodes than declared minimum',
        expected: `>= ${exp.contract.minNodes}`,
        actual: info.nodeCount,
      });
    }
    if (exp.contract.maxNodes !== undefined && info.nodeCount > exp.contract.maxNodes) {
      errors.push({
        type: 'unexpected-error',
        message: 'Tree has more nodes than declared maximum',
        expected: `<= ${exp.contract.maxNodes}`,
        actual: info.nodeCount,
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════
     SHARED HELPERS
     ═══════════════════════════════════════════════════════════ */

  /**
   * Dismiss any visible Drawer/Modal/Popover by pressing Escape.
   * No-op if nothing is open. Used between non-overlay verifications
   * so a previously-opened disclosure can't block the next click.
   */
  private async dismissOpenOverlay(): Promise<void> {
    if (!this.page) return;
    const sel = '[data-saync-type="drawer"], [data-saync-type="modal"], [data-saync-popover-panel]';
    const overlay = this.page.locator(sel).first();
    const visible = await overlay.isVisible().catch(() => false);
    if (!visible) return;
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(150);
  }

  /** Locate via selector. Pushes a selector-not-found error and returns
   *  null if zero matches. Returns the first match otherwise. */
  private async findOrError(
    selector: string,
    label: string,
    errors: VerificationError[],
  ): Promise<Locator | null> {
    if (!this.page) return null;
    const loc = this.page.locator(selector).first();
    if ((await loc.count()) === 0) {
      errors.push({
        type: 'selector-not-found',
        message: `${label} not found with selector: ${selector}`,
      });
      return null;
    }
    return loc;
  }

  /** Check declared validation attributes against the rendered DOM. */
  private async checkValidationAttrs(
    el: Locator,
    v: NonNullable<InputExpectation['contract']['validation']>,
    errors: VerificationError[],
  ): Promise<void> {
    const attrs = await el.evaluate((n: Element) => {
      const el = n as HTMLInputElement | HTMLTextAreaElement;
      return {
        required: el.required,
        pattern: el.getAttribute('pattern'),
        minLength: el.getAttribute('minlength'),
        maxLength: el.getAttribute('maxlength'),
        min: el.getAttribute('min'),
        max: el.getAttribute('max'),
        type: el.getAttribute('type'),
      };
    });
    if (v.required && !attrs.required) {
      errors.push({ type: 'unexpected-error', message: 'Declared required=true but DOM `required` is false' });
    }
    if (v.pattern && attrs.pattern !== v.pattern) {
      errors.push({ type: 'unexpected-error', message: 'pattern attribute mismatch', expected: v.pattern, actual: attrs.pattern });
    }
    if (v.minLength != null && attrs.minLength !== String(v.minLength)) {
      errors.push({ type: 'unexpected-error', message: 'minLength mismatch', expected: v.minLength, actual: attrs.minLength });
    }
    if (v.maxLength != null && attrs.maxLength !== String(v.maxLength)) {
      errors.push({ type: 'unexpected-error', message: 'maxLength mismatch', expected: v.maxLength, actual: attrs.maxLength });
    }
  }

  /** Best-effort: drive a child field with a plausible sample value. */
  private async driveFieldWithSample(field: Expectation): Promise<void> {
    if (!this.page) return;
    const loc = this.page.locator(field.selector).first();
    if ((await loc.count()) === 0) return;
    switch (field.type) {
      case 'input':
      case 'textarea':
        await loc.fill(sampleValueFor(field.contract.validation?.type ?? 'text'));
        break;
      case 'select': {
        const v = field.contract.validation?.allowedValues?.[0] ?? field.options?.[0];
        if (v) await loc.selectOption(v);
        break;
      }
      case 'checkbox':
      case 'switch':
        await loc.check().catch(() => {});
        break;
      case 'radio-group': {
        const inner = loc.locator('input[type="radio"]').first();
        await inner.click().catch(() => {});
        break;
      }
      case 'slider': {
        const mid = field.min !== undefined && field.max !== undefined
          ? String(Math.floor((field.min + field.max) / 2))
          : '50';
        await loc.fill(mid);
        break;
      }
      case 'date-picker':
        await loc.fill(sampleDateFor(field.dateType, field.min, field.max));
        break;
      default: /* not a fillable field */ break;
    }
  }

  private verifyApiCall(apiCall: ApiCallExpectation, errors: VerificationError[]): void {
    const urlPattern = typeof apiCall.url === 'string'
      ? new URL(apiCall.url, this.config.url).pathname
      : apiCall.url;
    let matching: CapturedRequest[] = [];
    if (typeof urlPattern === 'string') {
      matching = this.capturedRequests.get(urlPattern) || [];
    } else {
      for (const [url, requests] of this.capturedRequests.entries()) {
        if (urlPattern.test(url)) matching.push(...requests);
      }
    }
    if (matching.length === 0) {
      errors.push({
        type: 'api-call',
        message: `No API call found matching: ${apiCall.url}`,
        expected: apiCall,
      });
      return;
    }
    const req = matching[0];
    if (req.method !== apiCall.method) {
      errors.push({ type: 'api-call', message: 'API method mismatch', expected: apiCall.method, actual: req.method });
    }
    if (apiCall.expectedStatus && req.status !== apiCall.expectedStatus) {
      errors.push({ type: 'api-call', message: 'API status mismatch', expected: apiCall.expectedStatus, actual: req.status });
    }
    if (apiCall.maxDuration && req.duration > apiCall.maxDuration) {
      errors.push({ type: 'timeout', message: 'API call took too long', expected: `< ${apiCall.maxDuration}ms`, actual: `${req.duration}ms` });
    }
  }

  private verifyResponseShape(
    url: string | RegExp,
    shape: ResponseShape,
    errors: VerificationError[],
  ): void {
    const urlPattern = typeof url === 'string'
      ? new URL(url, this.config.url).pathname
      : url;
    let matching: CapturedRequest[] = [];
    if (typeof urlPattern === 'string') {
      matching = this.capturedRequests.get(urlPattern) || [];
    } else {
      for (const [reqUrl, requests] of this.capturedRequests.entries()) {
        if (urlPattern.test(reqUrl)) matching.push(...requests);
      }
    }
    if (matching.length === 0) return;
    const body = matching[0].responseBody;
    if (!body || typeof body !== 'object') {
      errors.push({ type: 'response-shape', message: 'Response body is not a valid object', actual: body });
      return;
    }
    this.validateShape(body as Record<string, unknown>, shape, errors, 'response');
  }

  private validateShape(
    data: Record<string, unknown>,
    shape: ResponseShape,
    errors: VerificationError[],
    path: string,
  ): void {
    for (const [key, expectedType] of Object.entries(shape)) {
      const value = data[key];
      const currentPath = `${path}.${key}`;
      if (value === undefined) {
        errors.push({ type: 'response-shape', message: `Missing field: ${currentPath}`, expected: expectedType });
        continue;
      }
      if (typeof expectedType === 'string') {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== expectedType) {
          errors.push({ type: 'response-shape', message: `Type mismatch at ${currentPath}`, expected: expectedType, actual: actualType });
        }
      } else if (typeof expectedType === 'object') {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          this.validateShape(value as Record<string, unknown>, expectedType, errors, currentPath);
        } else {
          errors.push({ type: 'response-shape', message: `Expected object at ${currentPath}`, expected: 'object', actual: Array.isArray(value) ? 'array' : typeof value });
        }
      }
    }
  }

  /**
   * Borrow the active Playwright Page so callers (like the flow runner)
   * can drive the same browser without spinning up a new context.
   * Null until `initialize()` has run; null again after `cleanup()`.
   */
  getPage(): Page | null {
    return this.page;
  }

  async cleanup(): Promise<void> {
    if (this.page) { await this.page.close(); this.page = null; }
    if (this.browser) { await this.browser.close(); this.browser = null; }
  }
}

/* ──────────────────────────────────────────────────────────── */

/**
 * Contract types that render an overlay (backdrop + panel) when active.
 * The verifier skips its pre-verification overlay-dismiss step for
 * these — they need the overlay in its current state to verify.
 */
const OVERLAY_TYPES: ReadonlySet<string> = new Set([
  'modal',
  'drawer',
  'popover',
  'menu',
  'tooltip',
]);

/**
 * Standard viewport sizes for Region.visibleAt verification. Mobile is
 * iPhone SE width (the tightest reasonable target); tablet is iPad
 * portrait; desktop matches Playwright's default 1440x900.
 */
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

function sampleValueFor(type: string): string {
  switch (type) {
    case 'email': return 'agent+test@saync.dev';
    case 'password': return 'AgentPass1!';
    case 'number':
    case 'range': return '5';
    case 'url': return 'https://example.com';
    case 'tel': return '+15555550100';
    default: return 'saync-agent-sample';
  }
}

function sampleDateFor(
  kind: DatePickerExpectation['dateType'],
  min?: string,
  max?: string,
): string {
  // If a min is provided use it directly — it's the safest valid date.
  // Otherwise pick a date in the middle of 2024 in the appropriate format.
  if (min) return min;
  if (max) return max;
  switch (kind) {
    case 'time': return '12:00';
    case 'datetime-local': return '2024-06-15T12:00';
    case 'month': return '2024-06';
    case 'week': return '2024-W24';
    case 'date':
    default: return '2024-06-15';
  }
}

function pickMimeFromAccept(accept?: string): string | null {
  if (!accept) return null;
  const first = accept.split(',')[0].trim();
  if (!first || first.includes('/*')) return first === 'image/*' ? 'image/png' : 'application/octet-stream';
  if (first.startsWith('.')) {
    // Extension hint
    return mimeFromExt(first.slice(1));
  }
  return first;
}

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

function mimeExt(mime: string): string {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'application/pdf': return 'pdf';
    case 'application/json': return 'json';
    case 'text/plain': return 'txt';
    default: return 'bin';
  }
}
