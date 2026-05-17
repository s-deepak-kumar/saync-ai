/**
 * @saync/react — React SDK for Saync expectations.
 *
 * Two equivalent ways to import:
 *
 *   import { Saync } from '@saync/react';
 *   <Saync.Provider>
 *     <Saync.Button name="add-to-cart" expects={…} />
 *   </Saync.Provider>
 *
 * or named exports:
 *
 *   import { SayncProvider, SayncButton, useSaync } from '@saync/react';
 *
 * Both compile to the same code; pick the one that reads better in your app.
 */

import { SayncButton } from './Button.js';
import { SayncInput } from './Input.js';
import { SayncTextarea } from './Textarea.js';
import { SayncForm } from './Form.js';
import { SayncSelect } from './Select.js';
import { SayncCheckbox, SayncSwitch } from './Checkbox.js';
import { SayncRadioGroup } from './RadioGroup.js';
import { SayncRadio } from './Radio.js';
import { SayncSlider } from './Slider.js';
import { SayncFileInput } from './FileInput.js';
import { SayncDatePicker } from './DatePicker.js';
import { SayncLink, SayncNavLink } from './Link.js';
import { SayncTabs, SayncTab } from './Tabs.js';
import { SayncBreadcrumb, SayncBreadcrumbItem } from './Breadcrumb.js';
import { SayncPagination } from './Pagination.js';
import { SayncMenu, SayncMenuItem } from './Menu.js';
import { SayncRegion, SayncSection } from './Region.js';
import { SayncModal, SayncDialog, SayncDrawer } from './Modal.js';
import { SayncPopover } from './Popover.js';
import { SayncTooltip } from './Tooltip.js';
import { SayncAccordion, SayncAccordionItem } from './Accordion.js';
import { SayncImage, SayncAvatar } from './Image.js';
import { SayncBadge } from './Badge.js';
import { SayncToast, SayncAlert } from './Notice.js';
import { SayncSpinner, SayncProgress, SayncSkeleton } from './Loading.js';
import { SayncList, SayncTable, SayncCard, SayncTree } from './Data.js';
import { SayncProvider } from './Provider.js';
import { SayncErrorBoundary } from './ErrorBoundary.js';
import { useSaync } from './context.js';

// Named exports — preferred for tree-shaking, and matches the existing
// demo-app's `import { SayncButton }` style for backwards compat.
export { SayncButton } from './Button.js';
export type { SayncButtonProps } from './Button.js';
export { SayncInput } from './Input.js';
export type { SayncInputProps } from './Input.js';
export { SayncTextarea } from './Textarea.js';
export type { SayncTextareaProps } from './Textarea.js';
export { SayncForm } from './Form.js';
export type { SayncFormProps } from './Form.js';
export { SayncSelect } from './Select.js';
export type { SayncSelectProps } from './Select.js';
export { SayncCheckbox, SayncSwitch } from './Checkbox.js';
export type { SayncCheckboxProps, SayncSwitchProps } from './Checkbox.js';
export { SayncRadioGroup } from './RadioGroup.js';
export type { SayncRadioGroupProps } from './RadioGroup.js';
export { SayncRadio } from './Radio.js';
export type { SayncRadioProps } from './Radio.js';
export { SayncSlider } from './Slider.js';
export type { SayncSliderProps } from './Slider.js';
export { SayncFileInput } from './FileInput.js';
export type { SayncFileInputProps } from './FileInput.js';
export { SayncDatePicker } from './DatePicker.js';
export type { SayncDatePickerProps } from './DatePicker.js';
export { SayncLink, SayncNavLink } from './Link.js';
export type { SayncLinkProps, SayncNavLinkProps } from './Link.js';
export { SayncTabs, SayncTab } from './Tabs.js';
export type { SayncTabsProps, SayncTabProps } from './Tabs.js';
export { SayncBreadcrumb, SayncBreadcrumbItem } from './Breadcrumb.js';
export type { SayncBreadcrumbProps, SayncBreadcrumbItemProps } from './Breadcrumb.js';
export { SayncPagination } from './Pagination.js';
export type { SayncPaginationProps } from './Pagination.js';
export { SayncMenu, SayncMenuItem } from './Menu.js';
export type { SayncMenuProps, SayncMenuItemProps } from './Menu.js';
export { SayncRegion, SayncSection } from './Region.js';
export type { SayncRegionProps, SayncSectionProps } from './Region.js';
export { SayncModal, SayncDialog, SayncDrawer } from './Modal.js';
export type { SayncModalProps, SayncDrawerProps } from './Modal.js';
export { SayncPopover } from './Popover.js';
export type { SayncPopoverProps } from './Popover.js';
export { SayncTooltip } from './Tooltip.js';
export type { SayncTooltipProps } from './Tooltip.js';
export { SayncAccordion, SayncAccordionItem } from './Accordion.js';
export type { SayncAccordionProps, SayncAccordionItemProps } from './Accordion.js';
export { SayncImage, SayncAvatar } from './Image.js';
export type { SayncImageProps, SayncAvatarProps } from './Image.js';
export { SayncBadge } from './Badge.js';
export type { SayncBadgeProps } from './Badge.js';
export { SayncToast, SayncAlert } from './Notice.js';
export type { SayncToastProps, SayncAlertProps } from './Notice.js';
export { SayncSpinner, SayncProgress, SayncSkeleton } from './Loading.js';
export type { SayncSpinnerProps, SayncProgressProps, SayncSkeletonProps } from './Loading.js';
export { SayncList, SayncTable, SayncCard, SayncTree } from './Data.js';
export type { SayncListProps, SayncTableProps, SayncCardProps, SayncTreeProps } from './Data.js';
export { SayncProvider } from './Provider.js';
export type { SayncProviderProps } from './Provider.js';
export { SayncErrorBoundary } from './ErrorBoundary.js';
export { useSaync, SayncContext } from './context.js';
export type { SayncContextValue, SayncEvent } from './context.js';

// Namespace export — `<Saync.Button>` syntax matching the design doc.
// Aliased so users can write Button instead of SayncButton inside the namespace.
export const Saync = {
  Provider: SayncProvider,
  Button: SayncButton,
  Input: SayncInput,
  Textarea: SayncTextarea,
  Form: SayncForm,
  Select: SayncSelect,
  Checkbox: SayncCheckbox,
  Switch: SayncSwitch,
  RadioGroup: SayncRadioGroup,
  Radio: SayncRadio,
  Slider: SayncSlider,
  FileInput: SayncFileInput,
  DatePicker: SayncDatePicker,
  Link: SayncLink,
  NavLink: SayncNavLink,
  Tabs: SayncTabs,
  Tab: SayncTab,
  Breadcrumb: SayncBreadcrumb,
  BreadcrumbItem: SayncBreadcrumbItem,
  Pagination: SayncPagination,
  Menu: SayncMenu,
  MenuItem: SayncMenuItem,
  Region: SayncRegion,
  Section: SayncSection,
  Modal: SayncModal,
  Dialog: SayncDialog,
  Drawer: SayncDrawer,
  Popover: SayncPopover,
  Tooltip: SayncTooltip,
  Accordion: SayncAccordion,
  AccordionItem: SayncAccordionItem,
  Image: SayncImage,
  Avatar: SayncAvatar,
  Badge: SayncBadge,
  Toast: SayncToast,
  Alert: SayncAlert,
  Spinner: SayncSpinner,
  Progress: SayncProgress,
  Skeleton: SayncSkeleton,
  List: SayncList,
  Table: SayncTable,
  Card: SayncCard,
  Tree: SayncTree,
  ErrorBoundary: SayncErrorBoundary,
  useSaync,
};

// Re-export core types for ergonomics in user apps.
export type {
  ButtonClickExpectation,
  ApiCallExpectation,
  ResponseShape,
  SayncMode,
  SayncConfig,
  InputContract,
  InputChangeExpectation,
  InputBlurExpectation,
  InputValidation,
  FormContract,
  FormSubmitExpectation,
  ChoiceContract,
  ChoiceChangeExpectation,
  ChoiceValidation,
  FileContract,
  FileUploadExpectation,
  FileValidation,
  NavigationContract,
  NavigationExpectation,
  PaginationContract,
  MenuContract,
  BreadcrumbContract,
  LayoutContract,
  DisclosureContract,
  TooltipContract,
  AccordionContract,
  ImageContract,
  AvatarContract,
  BadgeContract,
  NoticeContract,
  SpinnerContract,
  ProgressContract,
  SkeletonContract,
  ListContract,
  TableContract,
  CardContract,
  TreeContract,
} from '@saync/core';
