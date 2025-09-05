/**
 * Purple Gradient Definitions for MidWhereAh
 * 
 * Beautiful gradient combinations matching Canva's purple theme
 * with smooth transitions and optimized performance.
 * 
 * @author MidWhereAh Team  
 * @version 1.0.0
 */

import { PurpleColors } from './colors';

/**
 * Gradient direction types for React Native LinearGradient
 */
export type GradientDirection = {
  start: { x: number; y: number };
  end: { x: number; y: number };
};

/**
 * Gradient definitions with colors and directions
 */
export interface GradientDefinition {
  colors: string[];
  direction: GradientDirection;
  locations?: number[];
  name: string;
  description: string;
}

/**
 * Pre-defined gradient directions
 */
export const GradientDirections = {
  // Vertical gradients
  topToBottom: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  bottomToTop: { start: { x: 0, y: 1 }, end: { x: 0, y: 0 } },
  
  // Horizontal gradients  
  leftToRight: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  rightToLeft: { start: { x: 1, y: 0 }, end: { x: 0, y: 0 } },
  
  // Diagonal gradients
  topLeftToBottomRight: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  topRightToBottomLeft: { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
  bottomLeftToTopRight: { start: { x: 0, y: 1 }, end: { x: 1, y: 0 } },
  bottomRightToTopLeft: { start: { x: 1, y: 1 }, end: { x: 0, y: 0 } },
  
  // Radial-like gradients (using diagonal)
  centerOut: { start: { x: 0.5, y: 0.5 }, end: { x: 1, y: 1 } },
} as const;

/**
 * Purple gradient collection matching Canva designs
 */
export const PurpleGradients = {
  // Primary gradients for main UI elements
  primary: {
    colors: [...[PurpleColors.primary, PurpleColors.primaryLight]],
    direction: GradientDirections.leftToRight,
    name: 'Primary Purple',
    description: 'Main purple gradient for buttons and primary elements',
  },
  
  primaryVertical: {
    colors: [...[PurpleColors.primary, PurpleColors.primaryLight]],
    direction: GradientDirections.topToBottom,
    name: 'Primary Purple Vertical',
    description: 'Vertical version of primary gradient',
  },
  
  primaryDiagonal: {
    colors: [...[PurpleColors.primary, PurpleColors.primaryLight]],
    direction: GradientDirections.topLeftToBottomRight,
    name: 'Primary Purple Diagonal',
    description: 'Diagonal primary gradient for dynamic elements',
  },
  
  // Background gradients for screens and containers
  background: {
    colors: [...[PurpleColors.gradientBackground, PurpleColors.gradientBackgroundEnd]],
    direction: GradientDirections.topToBottom,
    name: 'Background Purple',
    description: 'Light purple background gradient for screens',
  },
  
  backgroundReverse: {
    colors: [...[PurpleColors.gradientBackgroundEnd, PurpleColors.gradientBackground]],
    direction: GradientDirections.bottomToTop,
    name: 'Background Purple Reverse',
    description: 'Reverse background gradient for variety',
  },
  
  // Card gradients for content containers
  card: {
    colors: [...[PurpleColors.white, PurpleColors.purple100]],
    direction: GradientDirections.topToBottom,
    name: 'Card Gradient',
    description: 'Subtle gradient for cards and containers',
  },
  
  cardHover: {
    colors: [...[PurpleColors.purple100, PurpleColors.purple200]],
    direction: GradientDirections.topToBottom,
    name: 'Card Hover Gradient',
    description: 'Enhanced gradient for card hover states',
  },
  
  // Feature gradients for special elements
  feature: {
    colors: [...[PurpleColors.primaryDark, PurpleColors.primary, PurpleColors.primaryLight]],
    direction: GradientDirections.topLeftToBottomRight,
    locations: [0, 0.5, 1],
    name: 'Feature Gradient',
    description: 'Rich three-color gradient for feature highlights',
  },
  
  accent: {
    colors: [...[PurpleColors.primaryExtraLight, PurpleColors.primaryLight]],
    direction: GradientDirections.leftToRight,
    name: 'Accent Gradient',
    description: 'Light accent gradient for secondary elements',
  },
  
  // Interactive state gradients
  button: {
    colors: [...[PurpleColors.primary, PurpleColors.primaryDark]],
    direction: GradientDirections.topToBottom,
    name: 'Button Gradient',
    description: 'Button gradient with depth effect',
  },
  
  buttonHover: {
    colors: [...[PurpleColors.primaryLight, PurpleColors.primary]],
    direction: GradientDirections.topToBottom,
    name: 'Button Hover Gradient',
    description: 'Lighter button gradient for hover state',
  },
  
  buttonPressed: {
    colors: [...[PurpleColors.primaryDark, PurpleColors.purple800]],
    direction: GradientDirections.topToBottom,
    name: 'Button Pressed Gradient',
    description: 'Darker button gradient for pressed state',
  },
  
  // Special effect gradients
  shimmer: {
    colors: [
      ...[PurpleColors.purple200,
      PurpleColors.purple100,
      PurpleColors.purple200]
    ],
    direction: GradientDirections.leftToRight,
    locations: [0, 0.5, 1],
    name: 'Shimmer Effect',
    description: 'Loading shimmer effect gradient',
  },
  
  overlay: {
    colors: [
      ...[ColorUtils.withAlpha(PurpleColors.textPrimary, 0),
      ColorUtils.withAlpha(PurpleColors.textPrimary, 0.7)]
    ],
    direction: GradientDirections.topToBottom,
    name: 'Overlay Gradient',
    description: 'Gradient overlay for images and content',
  },
  
  // Navigation gradients
  header: {
    colors: [...[PurpleColors.primary, PurpleColors.primaryDark]],
    direction: GradientDirections.topToBottom,
    name: 'Header Gradient',
    description: 'Navigation header gradient',
  },
  
  tabBar: {
    colors: [...[PurpleColors.white, PurpleColors.purple100]],
    direction: GradientDirections.topToBottom,
    name: 'Tab Bar Gradient',
    description: 'Bottom tab bar gradient',
  },
  
  // Status gradients
  success: {
    colors: [...[PurpleColors.success, '#66BB6A']],
    direction: GradientDirections.leftToRight,
    name: 'Success Gradient',
    description: 'Success state gradient',
  },
  
  warning: {
    colors: [...[PurpleColors.warning, '#FFB74D']],
    direction: GradientDirections.leftToRight,
    name: 'Warning Gradient',
    description: 'Warning state gradient',
  },
  
  error: {
    colors: [...[PurpleColors.error, '#EF5350']],
    direction: GradientDirections.leftToRight,
    name: 'Error Gradient',
    description: 'Error state gradient',
  },
} as const;

/**
 * Helper function to create gradient style object for React Native
 */
export const createGradientStyle = (gradient: GradientDefinition) => ({
  colors: gradient.colors,
  start: gradient.direction.start,
  end: gradient.direction.end,
  ...(gradient.locations && { locations: gradient.locations }),
});

/**
 * Utility functions for working with gradients
 */
export const GradientUtils = {
  /**
   * Get gradient by name
   */
  getGradient: (name: keyof typeof PurpleGradients): GradientDefinition => {
    return PurpleGradients[name];
  },

  /**
   * Create custom gradient
   */
  createCustomGradient: (
    colors: string[],
    direction: GradientDirection,
    name: string,
    description: string,
    locations?: number[]
  ): GradientDefinition => ({
    colors,
    direction,
    locations,
    name,
    description,
  }),

  /**
   * Reverse gradient colors
   */
  reverseGradient: (gradient: GradientDefinition): GradientDefinition => ({
    ...gradient,
    colors: [...gradient.colors].reverse(),
    name: `${gradient.name} Reversed`,
  }),

  /**
   * Create gradient with custom direction
   */
  withDirection: (
    gradient: GradientDefinition,
    direction: GradientDirection
  ): GradientDefinition => ({
    ...gradient,
    direction,
    name: `${gradient.name} Custom Direction`,
  }),

  /**
   * Add transparency to gradient
   */
  withAlpha: (
    gradient: GradientDefinition,
    alpha: number
  ): GradientDefinition => ({
    ...gradient,
    colors: gradient.colors.map(color => 
      ColorUtils.withAlpha(color, alpha)
    ),
    name: `${gradient.name} Transparent`,
  }),
};

// Import ColorUtils from colors.ts
import { ColorUtils } from './colors';