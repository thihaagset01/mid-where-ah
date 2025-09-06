/**
 * Accessibility utilities for React Native components
 * Provides helpers for WCAG compliance and screen reader optimization
 */

import { AccessibilityInfo, AccessibilityRole, Platform } from 'react-native';

export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessibilityActions?: Array<{
    name: string;
    label?: string;
  }>;
  onAccessibilityAction?: (event: { nativeEvent: { actionName: string } }) => void;
  // iOS specific
  accessibilityViewIsModal?: boolean;
}

/**
 * Screen reader announcement utility
 */
export const announceForAccessibility = (message: string): void => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  } else if (Platform.OS === 'android') {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, {
      queue: false, // Don't queue, interrupt current announcement
    });
  }
};

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = (): Promise<boolean> => {
  return AccessibilityInfo.isScreenReaderEnabled();
};

/**
 * Generate accessibility props for buttons
 */
export const getButtonAccessibilityProps = (
  label: string,
  hint?: string,
  disabled?: boolean
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'button',
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityState: {
    disabled: disabled ?? false,
  },
});

/**
 * Generate accessibility props for text inputs
 */
export const getTextInputAccessibilityProps = (
  label: string,
  value?: string,
  placeholder?: string,
  required?: boolean
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'text',
  accessibilityLabel: label + (required ? ' (required)' : ''),
  accessibilityHint: placeholder ? `Placeholder: ${placeholder}` : undefined,
  accessibilityValue: value ? { text: value } : undefined,
});

/**
 * Generate accessibility props for switches/toggles
 */
export const getSwitchAccessibilityProps = (
  label: string,
  checked: boolean,
  hint?: string
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'switch',
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityState: {
    checked,
  },
});

/**
 * Generate accessibility props for sliders
 */
export const getSliderAccessibilityProps = (
  label: string,
  value: number,
  min: number,
  max: number,
  hint?: string
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'adjustable',
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityValue: {
    min,
    max,
    now: value,
    text: `${value}`,
  },
  accessibilityActions: [
    { name: 'increment', label: 'Increase value' },
    { name: 'decrement', label: 'Decrease value' },
  ],
});

/**
 * Generate accessibility props for lists
 */
export const getListAccessibilityProps = (
  label: string,
  itemCount: number
): AccessibilityProps => ({
  accessible: false, // Let individual items be accessible
  accessibilityRole: 'list',
  accessibilityLabel: `${label}, ${itemCount} items`,
});

/**
 * Generate accessibility props for list items
 */
export const getListItemAccessibilityProps = (
  label: string,
  index: number,
  total: number,
  selected?: boolean
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'button',
  accessibilityLabel: `${label}, ${index + 1} of ${total}`,
  accessibilityState: {
    selected: selected ?? false,
  },
});

/**
 * Generate accessibility props for headings
 */
export const getHeadingAccessibilityProps = (
  text: string,
  level: number = 1
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'header',
  accessibilityLabel: text,
  // React Native doesn't have native heading levels, but we can include it in the label
  ...(level > 1 && { accessibilityHint: `Heading level ${level}` }),
});

/**
 * Generate accessibility props for progress indicators
 */
export const getProgressAccessibilityProps = (
  label: string,
  value: number,
  max: number = 100,
  indeterminate?: boolean
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'progressbar',
  accessibilityLabel: label,
  accessibilityValue: indeterminate
    ? { text: 'Loading' }
    : {
        min: 0,
        max,
        now: value,
        text: `${Math.round((value / max) * 100)}% complete`,
      },
  accessibilityState: {
    busy: indeterminate ?? false,
  },
});

/**
 * Generate accessibility props for images
 */
export const getImageAccessibilityProps = (
  altText: string,
  decorative?: boolean
): AccessibilityProps => ({
  accessible: !decorative,
  accessibilityRole: decorative ? undefined : 'image',
  accessibilityLabel: decorative ? undefined : altText,
});

/**
 * Generate accessibility props for tabs
 */
export const getTabAccessibilityProps = (
  label: string,
  selected: boolean,
  index: number,
  total: number
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'tab',
  accessibilityLabel: `${label}, tab ${index + 1} of ${total}`,
  accessibilityState: {
    selected,
  },
});

/**
 * Generate accessibility props for modals/alerts
 */
export const getModalAccessibilityProps = (
  title: string,
  important?: boolean
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: important ? 'alert' : 'text',
  accessibilityLabel: title,
  accessibilityViewIsModal: true,
});

/**
 * Color contrast utility (basic check)
 * For production, consider using a more robust contrast checking library
 */
export const hasGoodContrast = (
  foreground: string,
  background: string,
  largeText: boolean = false
): boolean => {
  // This is a simplified implementation
  // In a real app, you'd want to use a proper color contrast library
  const threshold = largeText ? 3.0 : 4.5; // WCAG AA standards
  
  // For now, return true as this would require color parsing
  // In production, implement proper contrast ratio calculation
  return true;
};

/**
 * Skip link component props generator
 */
export const getSkipLinkProps = (
  targetId: string,
  label: string = 'Skip to main content'
): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'link',
  accessibilityLabel: label,
  accessibilityHint: 'Navigate to main content area',
});

/**
 * Focus management utilities
 */
export const focusNextElement = (): void => {
  // React Native doesn't have direct DOM focus control
  // This would be implemented with specific focus management for the platform
  AccessibilityInfo.setAccessibilityFocus(0); // Focus first element
};

export const focusPreviousElement = (): void => {
  // Implementation would depend on focus management strategy
  // This is a placeholder for platform-specific focus control
};

/**
 * Accessibility test helpers
 */
export const validateAccessibilityProps = (props: AccessibilityProps): string[] => {
  const warnings: string[] = [];
  
  if (props.accessible && !props.accessibilityLabel) {
    warnings.push('Accessible element should have an accessibilityLabel');
  }
  
  if (props.accessibilityRole === 'button' && !props.accessibilityLabel) {
    warnings.push('Button should have an accessibilityLabel');
  }
  
  if (props.accessibilityHint && props.accessibilityHint.length > 50) {
    warnings.push('AccessibilityHint should be concise (under 50 characters)');
  }
  
  return warnings;
};