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
 * Input field expectations. Each sub-contract is optional; supply only
 * what you actually care to verify.
 */
export interface InputChangeExpectation {
  /** Min ms of inactivity before an API call should fire — verifies debouncing.
   *  e.g. a search box with debounce:300 should NOT fire /api/search on every keystroke. */
  debounce?: number;
  apiCall?: ApiCallExpectation;
  /** Whether typing should fire ANY API at all. */
  fires?: boolean;
}

export interface InputBlurExpectation {
  apiCall?: ApiCallExpectation;
  /** Whether blur should trigger validation UI (e.g. error message appearing). */
  validates?: boolean;
}

export interface InputValidation {
  required?: boolean;
  pattern?: string;                        // serialized regex source (no flags)
  minLength?: number;
  maxLength?: number;
  /** Numeric or date lower bound. number for sliders / number inputs;
   *  ISO date string ("2024-01-01") for date pickers. */
  min?: number | string;
  max?: number | string;
  step?: number;
  type?:
    | 'email'
    | 'number'
    | 'text'
    | 'url'
    | 'tel'
    | 'password'
    | 'range'
    | 'date'
    | 'time'
    | 'datetime-local';
}

export interface InputContract {
  onChange?: InputChangeExpectation;
  onBlur?: InputBlurExpectation;
  validation?: InputValidation;
}

/**
 * Form submit expectation — the API call that should fire, what should
 * come back, where the user should end up.
 */
export interface FormSubmitExpectation {
  apiCall?: ApiCallExpectation;
  responseShape?: ResponseShape;
  /** URL or path that should appear in window.location after a successful submit. */
  redirectTo?: string;
  /** Submit must be blocked if any child field's validation fails. */
  preventsSubmitWhenInvalid?: boolean;
  /** Form should clear itself after a successful submit. */
  resetsAfterSuccess?: boolean;
}

export interface FormContract {
  onSubmit?: FormSubmitExpectation;
}

/**
 * Choice/toggle contract — for select, checkbox, radio-group, switch.
 * All four components share the same shape: a single value or boolean
 * changes, and you optionally assert about the resulting API call,
 * an allowed-values constraint, or required-ness.
 */
export interface ChoiceChangeExpectation {
  apiCall?: ApiCallExpectation;
  /** Whether the change should fire an API at all. */
  fires?: boolean;
}

export interface ChoiceValidation {
  required?: boolean;
  /** For Select / RadioGroup: the chosen value must be one of these.
   *  Ignored for Checkbox/Switch (which are boolean by definition). */
  allowedValues?: string[];
}

export interface ChoiceContract {
  onChange?: ChoiceChangeExpectation;
  validation?: ChoiceValidation;
}

/**
 * File-upload contract — separate from InputContract because the
 * triggering event is "user selected one or more files" (FileList),
 * not "user typed". The expected API is typically a multipart POST.
 */
export interface FileUploadExpectation {
  apiCall?: ApiCallExpectation;
  responseShape?: ResponseShape;
}

export interface FileValidation {
  required?: boolean;
  /** Comma-separated MIME types or extensions ("image/*,application/pdf").
   *  Matches the HTML `accept` attribute. */
  accept?: string;
  maxSizeBytes?: number;
  maxFiles?: number;
}

export interface FileContract {
  /** Fires the moment a user picks a file. */
  upload?: FileUploadExpectation;
  validation?: FileValidation;
}

/**
 * Navigation contract — shared by Link, NavLink, BreadcrumbItem.
 * "After click, the user should end up at `toUrl` and `appears` should
 * be visible. Optionally an API call should fire (e.g. analytics)."
 */
export interface NavigationExpectation {
  /** Path or full URL expected after click. Compared by exact match
   *  unless ends with "*", which becomes a prefix match. */
  toUrl?: string;
  /** CSS selector that should be visible at the destination — the agent
   *  navigates and asserts this element renders. */
  appears?: string;
  apiCall?: ApiCallExpectation;
}

export interface NavigationContract {
  onNavigate?: NavigationExpectation;
  /** For <Saync.NavLink>: should be styled as "active" when current URL
   *  matches. RegExp source string (no flags) or exact path. */
  activeOn?: string;
}

/**
 * Pagination contract — page change fires an API and updates a URL param.
 */
export interface PaginationContract {
  onChange?: {
    apiCall?: ApiCallExpectation;
    /** Query-string param the page number should be written to ("page"). */
    urlParam?: string;
  };
}

/**
 * Menu contract — dropdown open/close + item-click behavior.
 */
export interface MenuContract {
  onOpen?: {
    fires?: boolean;
  };
  validation?: {
    closesOnOutsideClick?: boolean;
    closesOnEscape?: boolean;
  };
}

/**
 * Breadcrumb contract — structural assertions about the hierarchy.
 */
export interface BreadcrumbContract {
  /** The last item should be a non-link (current page). */
  lastIsCurrent?: boolean;
  /** Each item's href should be a prefix of the next item's href. */
  pathsMatchHierarchy?: boolean;
}

/**
 * Layout contract — for <Saync.Region> / <Saync.Section>. Purely
 * declarative: the agent measures the rendered element against these
 * constraints, no events to drive.
 */
export interface LayoutContract {
  /** Element should be visible at each named viewport size. The agent
   *  resizes the page to a standard size for each named viewport
   *  (mobile=375x667, tablet=768x1024, desktop=1440x900) and checks. */
  visibleAt?: ('mobile' | 'tablet' | 'desktop')[];
  /** Bounding rect must not extend past the viewport's right edge. */
  notClipped?: boolean;
  /** Minimum tap-target size in CSS pixels — for mobile, default 44. */
  minTapTarget?: number;
  /** Rendered element should contain this exact substring. */
  containsText?: string;
  /** A descendant matching this CSS selector should be visible. */
  appears?: string;
}

/**
 * Disclosure contract — for Modal / Drawer (controlled) and conceptually
 * also Popover / Tooltip. The verifier toggles the disclosure and asserts
 * the behaviors the contract declares.
 */
export interface DisclosureContract {
  /** Element should close when the user presses Escape. */
  closesOnEscape?: boolean;
  /** Element should close when the user clicks outside it. */
  closesOnOutsideClick?: boolean;
  /** Focus should be trapped inside while open (Modal/Dialog).
   *  When verified, agent tabs through and asserts focus stays in. */
  trapsFocus?: boolean;
  /** A visible backdrop element should render behind it. */
  hasBackdrop?: boolean;
}

/**
 * Tooltip contract — like Disclosure but the trigger is hover/focus,
 * not click. Distinct so the verifier knows to dispatch mouseenter.
 */
export interface TooltipContract {
  /** Tooltip should appear on hover and be visible. */
  showsOnHover?: boolean;
  /** Tooltip's visible content should contain this substring. */
  containsText?: string;
  /** Tooltip should hide when the trigger loses focus / mouse leaves. */
  hidesOnBlur?: boolean;
}

/**
 * Accordion contract — exclusive (only one open at a time) and other
 * structural invariants.
 */
export interface AccordionContract {
  /** Only one item can be open at a time. */
  exclusive?: boolean;
  /** Clicking an item header expands/collapses it. */
  expandsOnClick?: boolean;
}

/**
 * Image contract — assert the rendered <img> actually loaded and has
 * accessible metadata.
 */
export interface ImageContract {
  /** Image src loaded successfully (complete + naturalWidth > 0). */
  loads?: boolean;
  /** alt must be present and non-empty. If a string, it must match. */
  hasAlt?: boolean | string;
  /** Rendered width must be ≥ this many pixels. */
  minWidth?: number;
  /** Rendered height must be ≥ this many pixels. */
  minHeight?: number;
}

/**
 * Avatar contract — either the <img> loads OR a visible fallback
 * (initials, icon) renders. Exactly one of the two must be present.
 */
export interface AvatarContract {
  hasVisibleContent?: boolean;
  hasAlt?: boolean;
}

/**
 * Badge contract — a small inline indicator (a count, a dot, a status).
 */
export interface BadgeContract {
  /** Badge element should not be display:none / hidden. */
  visible?: boolean;
  /** Badge inner text contains this substring. */
  containsText?: string;
  /** Badge text parses as a number within these bounds. */
  numberInRange?: { min?: number; max?: number };
}

/**
 * Toast / Alert share this shape — both are notifications.
 * Distinct expectations (toast / alert) for the registry so the
 * verifier can apply slightly different a11y assertions (toast →
 * role="status" or role="alert" depending on severity).
 */
export interface NoticeContract {
  containsText?: string;
  /** Toast auto-dismisses after this many ms. Pure static info; the
   *  verifier reads the value off the DOM where possible. */
  dismissesAfter?: number;
  /** Element has a close button. */
  dismissible?: boolean;
  severity?: 'info' | 'warn' | 'error' | 'success';
}

/**
 * Loading-state contracts — spinner / progress / skeleton.
 * All three express "a temporary visual while waiting for data".
 */
export interface SpinnerContract {
  /** Spinner has role="status" (the WAI-ARIA standard). */
  hasStatusRole?: boolean;
  /** Spinner has aria-label describing what's loading. */
  hasAriaLabel?: boolean;
}

export interface ProgressContract {
  /** Current value attribute is present. */
  hasValue?: boolean;
  /** Value is bounded by these limits at all times. */
  range?: { min?: number; max?: number };
  /** aria-valuenow matches the visible value. */
  hasAriaValueNow?: boolean;
}

export interface SkeletonContract {
  /** Skeleton block has aria-hidden="true" (it's decorative). */
  ariaHidden?: boolean;
  /** Animated (has animation:* in computed style). */
  animated?: boolean;
}

/**
 * List contract — for <Saync.List>. Counts rendered <li> descendants
 * and asserts content/cardinality constraints.
 */
export interface ListContract {
  /** Minimum number of <li> items rendered (use 0 to allow empty list). */
  minItems?: number;
  /** Maximum number of items — useful for pagination bounds. */
  maxItems?: number;
  /** Every item's text content includes this substring. */
  itemContains?: string;
  /** When item count === 0, this CSS selector must be visible
   *  (empty-state component). */
  emptyStateSelector?: string;
}

/**
 * Table contract — header / row assertions for tabular data.
 */
export interface TableContract {
  /** Expected column headers in render order. Verifier reads <th>
   *  text in document order and compares. */
  columns?: string[];
  minRows?: number;
  maxRows?: number;
  /** Caption (table title) must contain this text. */
  captionContains?: string;
}

/**
 * Card contract — generic single-record container.
 */
export interface CardContract {
  containsText?: string;
  /** Card itself is clickable (wraps content in a link/button). */
  clickable?: boolean;
}

/**
 * Tree contract — hierarchical data structure. Counts elements with
 * role="treeitem".
 */
export interface TreeContract {
  minNodes?: number;
  maxNodes?: number;
  /** The root <ul> has role="tree" — assert this is present. */
  hasTreeRole?: boolean;
}

/**
 * Expectation types — every new SDK component adds one entry here so the
 * agent can dispatch verification appropriately.
 */
export type ExpectationType =
  | 'button-click'
  | 'input'
  | 'textarea'
  | 'form'
  | 'select'
  | 'checkbox'
  | 'switch'
  | 'radio-group'
  | 'slider'
  | 'file-input'
  | 'date-picker'
  | 'link'
  | 'nav-link'
  | 'tabs'
  | 'breadcrumb'
  | 'pagination'
  | 'menu'
  | 'region'
  | 'modal'
  | 'drawer'
  | 'popover'
  | 'tooltip'
  | 'accordion'
  | 'image'
  | 'avatar'
  | 'badge'
  | 'toast'
  | 'alert'
  | 'spinner'
  | 'progress'
  | 'skeleton'
  | 'list'
  | 'table'
  | 'card'
  | 'tree';

/**
 * Base expectation structure
 *
 * `id` is internally generated (random, stable for component lifetime).
 * `name` is developer-provided ("add-to-cart") and is what shows up
 * in dashboards / reports. If the dev omits `name`, the SDK falls back
 * to `id` and emits a console warning — usable but ugly.
 */
export interface BaseExpectation {
  id: string;
  name: string;
  componentName?: string;
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

export interface InputExpectation extends BaseExpectation {
  type: 'input' | 'textarea';
  /** Set when this input lives inside a <Saync.Form> — lets the agent
   *  scope field-level errors back to the parent form's contract. */
  parentFormId?: string;
  contract: InputContract;
}

export interface FormExpectation extends BaseExpectation {
  type: 'form';
  /** Live list of child Saync.Input / Saync.Textarea expectation ids.
   *  Populated dynamically; the agent uses this to know which fields to
   *  drive before submitting. */
  fieldIds: string[];
  contract: FormContract;
}

export interface SelectExpectation extends BaseExpectation {
  type: 'select';
  parentFormId?: string;
  /** Declared list of option values, if the developer wants to verify
   *  the rendered options match a known set. Optional. */
  options?: string[];
  contract: ChoiceContract;
}

export interface CheckboxExpectation extends BaseExpectation {
  type: 'checkbox' | 'switch';   // Both share a boolean shape; UI differs.
  parentFormId?: string;
  contract: ChoiceContract;
}

export interface RadioGroupExpectation extends BaseExpectation {
  type: 'radio-group';
  parentFormId?: string;
  /** Live list of child <Saync.Radio> option ids — populated dynamically.
   *  Mirrors the FormExpectation.fieldIds pattern. */
  optionIds: string[];
  /** Live list of child option values (1:1 with optionIds), for the agent
   *  to pick from without DOM-querying. */
  optionValues: string[];
  contract: ChoiceContract;
}

/**
 * <Saync.Slider> — wraps <input type="range">. Value is numeric; min/max/step
 * are mirrored onto the expectation so the agent can drive intermediate values
 * without re-parsing the DOM attributes.
 */
export interface SliderExpectation extends BaseExpectation {
  type: 'slider';
  parentFormId?: string;
  min?: number;
  max?: number;
  step?: number;
  contract: InputContract;
}

/**
 * <Saync.FileInput> — wraps <input type="file">. Carries its own contract
 * shape (FileContract) because uploads aren't keystroke-driven.
 */
export interface FileInputExpectation extends BaseExpectation {
  type: 'file-input';
  parentFormId?: string;
  accept?: string;
  multiple?: boolean;
  contract: FileContract;
}

/**
 * <Saync.DatePicker> — wraps <input type="date|time|datetime-local|month|week">.
 * Value semantics differ by `dateType` but the contract shape is shared
 * with Input (validation min/max accept ISO strings).
 */
export interface DatePickerExpectation extends BaseExpectation {
  type: 'date-picker';
  parentFormId?: string;
  /** Which HTML date variant — different agent driver per variant. */
  dateType: 'date' | 'time' | 'datetime-local' | 'month' | 'week';
  min?: string;
  max?: string;
  contract: InputContract;
}

/**
 * <Saync.Link> — plain anchor with navigation contract.
 */
export interface LinkExpectation extends BaseExpectation {
  type: 'link';
  href: string;
  contract: NavigationContract;
}

/**
 * <Saync.NavLink> — like Link plus active-state assertions.
 */
export interface NavLinkExpectation extends BaseExpectation {
  type: 'nav-link';
  href: string;
  contract: NavigationContract;
}

/**
 * <Saync.Tabs> — wrapper owning the contract. Reuses ChoiceContract
 * (a tab pick is functionally the same as a radio pick).
 */
export interface TabsExpectation extends BaseExpectation {
  type: 'tabs';
  /** Live list of child <Saync.Tab> ids. */
  tabIds: string[];
  /** 1:1 list of tab values. */
  tabValues: string[];
  contract: ChoiceContract;
}

/**
 * <Saync.Breadcrumb> — wrapper owning the contract; items are markers.
 */
export interface BreadcrumbExpectation extends BaseExpectation {
  type: 'breadcrumb';
  /** Live list of child item ids in render order. */
  itemIds: string[];
  /** 1:1 list of href values (or null for non-link items like the current page). */
  itemHrefs: (string | null)[];
  contract: BreadcrumbContract;
}

export interface PaginationExpectation extends BaseExpectation {
  type: 'pagination';
  contract: PaginationContract;
}

/**
 * <Saync.Menu> — owns the contract for dropdown open/close + child items.
 */
export interface MenuExpectation extends BaseExpectation {
  type: 'menu';
  /** Live list of child item ids. */
  itemIds: string[];
  contract: MenuContract;
}

/**
 * <Saync.Region> + <Saync.Section> share this expectation row — the
 * `tagName` field tells the verifier whether to expect `<div>` or
 * `<section>` so a11y assertions land correctly.
 */
export interface RegionExpectation extends BaseExpectation {
  type: 'region';
  /** Which HTML element the component rendered. */
  tagName: 'div' | 'section';
  contract: LayoutContract;
}

/**
 * <Saync.Modal> + <Saync.Dialog> share this row — `role` distinguishes
 * "modal dialog" (focus-trapping, blocks the rest of the page) from
 * a plain "dialog" (interruption but not always blocking).
 */
export interface ModalExpectation extends BaseExpectation {
  type: 'modal';
  role: 'dialog' | 'alertdialog';
  contract: DisclosureContract;
}

export interface DrawerExpectation extends BaseExpectation {
  type: 'drawer';
  /** Which edge the drawer is anchored to. */
  side: 'left' | 'right' | 'top' | 'bottom';
  contract: DisclosureContract;
}

export interface PopoverExpectation extends BaseExpectation {
  type: 'popover';
  contract: DisclosureContract;
}

export interface TooltipExpectation extends BaseExpectation {
  type: 'tooltip';
  contract: TooltipContract;
}

export interface AccordionExpectation extends BaseExpectation {
  type: 'accordion';
  /** Live list of <Saync.AccordionItem> ids. */
  itemIds: string[];
  contract: AccordionContract;
}

export interface ImageExpectation extends BaseExpectation {
  type: 'image';
  src: string;
  contract: ImageContract;
}

export interface AvatarExpectation extends BaseExpectation {
  type: 'avatar';
  /** Whether the avatar attempts to render an image (src given) or
   *  only a fallback (initials/icon). */
  hasImage: boolean;
  contract: AvatarContract;
}

export interface BadgeExpectation extends BaseExpectation {
  type: 'badge';
  contract: BadgeContract;
}

export interface ToastExpectation extends BaseExpectation {
  type: 'toast';
  contract: NoticeContract;
}

export interface AlertExpectation extends BaseExpectation {
  type: 'alert';
  contract: NoticeContract;
}

export interface SpinnerExpectation extends BaseExpectation {
  type: 'spinner';
  contract: SpinnerContract;
}

export interface ProgressExpectation extends BaseExpectation {
  type: 'progress';
  contract: ProgressContract;
}

export interface SkeletonExpectation extends BaseExpectation {
  type: 'skeleton';
  contract: SkeletonContract;
}

export interface ListExpectation extends BaseExpectation {
  type: 'list';
  /** <ul> or <ol> — tells the verifier which element to expect. */
  ordered: boolean;
  contract: ListContract;
}

export interface TableExpectation extends BaseExpectation {
  type: 'table';
  contract: TableContract;
}

export interface CardExpectation extends BaseExpectation {
  type: 'card';
  contract: CardContract;
}

export interface TreeExpectation extends BaseExpectation {
  type: 'tree';
  contract: TreeContract;
}

/**
 * Discriminated union of every supported expectation. Add new variants
 * here when introducing new SDK components.
 */
export type Expectation =
  | ButtonExpectation
  | InputExpectation
  | FormExpectation
  | SelectExpectation
  | CheckboxExpectation
  | RadioGroupExpectation
  | SliderExpectation
  | FileInputExpectation
  | DatePickerExpectation
  | LinkExpectation
  | NavLinkExpectation
  | TabsExpectation
  | BreadcrumbExpectation
  | PaginationExpectation
  | MenuExpectation
  | RegionExpectation
  | ModalExpectation
  | DrawerExpectation
  | PopoverExpectation
  | TooltipExpectation
  | AccordionExpectation
  | ImageExpectation
  | AvatarExpectation
  | BadgeExpectation
  | ToastExpectation
  | AlertExpectation
  | SpinnerExpectation
  | ProgressExpectation
  | SkeletonExpectation
  | ListExpectation
  | TableExpectation
  | CardExpectation
  | TreeExpectation;

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
