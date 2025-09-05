/**
 * Purple Theme System for MidWhereAh
 * 
 * Complete design system with purple gradients, typography, spacing,
 * and component tokens matching Canva's beautiful design aesthetic.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import { PurpleColors, ColorUtils } from './colors';
import { PurpleGradients, GradientUtils } from './gradients';

/**
 * Typography scale with purple theme
 */
export const Typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    light: 'System',
  },
  
  // Font sizes following 8pt grid
  fontSize: {
    xs: 12,      // Extra small
    sm: 14,      // Small
    base: 16,    // Base/body
    lg: 18,      // Large
    xl: 20,      // Extra large
    '2xl': 24,   // 2x large
    '3xl': 30,   // 3x large
    '4xl': 36,   // 4x large
    '5xl': 48,   // 5x large
    '6xl': 60,   // 6x large
  },
  
  // Font weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Line heights (relative to font size)
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Text styles
  styles: {
    h1: {
      fontSize: 36,
      fontWeight: '700',
      lineHeight: 1.25,
      color: PurpleColors.textPrimary,
    },
    h2: {
      fontSize: 30,
      fontWeight: '600',
      lineHeight: 1.3,
      color: PurpleColors.textPrimary,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 1.35,
      color: PurpleColors.textPrimary,
    },
    h4: {
      fontSize: 20,
      fontWeight: '500',
      lineHeight: 1.4,
      color: PurpleColors.textPrimary,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.5,
      color: PurpleColors.textPrimary,
    },
    bodyLarge: {
      fontSize: 18,
      fontWeight: '400',
      lineHeight: 1.5,
      color: PurpleColors.textPrimary,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.5,
      color: PurpleColors.textSecondary,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.5,
      color: PurpleColors.textLight,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1,
      color: PurpleColors.white,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 1.2,
      color: PurpleColors.textSecondary,
    },
  },
} as const;

/**
 * Spacing scale following 8pt grid system
 */
export const Spacing = {
  xs: 4,      // 0.25rem
  sm: 8,      // 0.5rem
  md: 16,     // 1rem
  lg: 24,     // 1.5rem
  xl: 32,     // 2rem
  '2xl': 48,  // 3rem
  '3xl': 64,  // 4rem
  '4xl': 96,  // 6rem
  
  // Component-specific spacing
  padding: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  margin: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  gap: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

/**
 * Border radius scale
 */
export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  full: 9999,
  
  // Component-specific radius
  button: 12,
  card: 16,
  modal: 24,
  avatar: 9999,
  input: 8,
} as const;

/**
 * Shadow definitions with purple tints
 */
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  sm: {
    shadowColor: PurpleColors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  
  md: {
    shadowColor: PurpleColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  
  lg: {
    shadowColor: PurpleColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  xl: {
    shadowColor: PurpleColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Component-specific shadows
  card: {
    shadowColor: PurpleColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  
  button: {
    shadowColor: PurpleColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  
  modal: {
    shadowColor: PurpleColors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

/**
 * Component tokens with purple theme
 */
export const Components = {
  // Button variants
  button: {
    primary: {
      background: PurpleGradients.button,
      text: PurpleColors.white,
      border: 'transparent',
      shadow: Shadows.button,
      borderRadius: BorderRadius.button,
      padding: { vertical: Spacing.md, horizontal: Spacing.xl },
    },
    
    secondary: {
      background: PurpleColors.white,
      text: PurpleColors.primary,
      border: PurpleColors.primary,
      shadow: Shadows.sm,
      borderRadius: BorderRadius.button,
      padding: { vertical: Spacing.md, horizontal: Spacing.xl },
    },
    
    ghost: {
      background: 'transparent',
      text: PurpleColors.primary,
      border: 'transparent',
      shadow: Shadows.none,
      borderRadius: BorderRadius.button,
      padding: { vertical: Spacing.md, horizontal: Spacing.xl },
    },
  },
  
  // Card variants
  card: {
    default: {
      background: PurpleGradients.card,
      border: PurpleColors.purple200,
      shadow: Shadows.card,
      borderRadius: BorderRadius.card,
      padding: Spacing.lg,
    },
    
    elevated: {
      background: PurpleColors.white,
      border: 'transparent',
      shadow: Shadows.lg,
      borderRadius: BorderRadius.card,
      padding: Spacing.lg,
    },
    
    outlined: {
      background: PurpleColors.white,
      border: PurpleColors.purple300,
      shadow: Shadows.none,
      borderRadius: BorderRadius.card,
      padding: Spacing.lg,
    },
  },
  
  // Input variants
  input: {
    default: {
      background: PurpleColors.white,
      border: PurpleColors.purple300,
      text: PurpleColors.textPrimary,
      placeholder: PurpleColors.textLight,
      borderRadius: BorderRadius.input,
      padding: { vertical: Spacing.md, horizontal: Spacing.md },
    },
    
    focused: {
      background: PurpleColors.white,
      border: PurpleColors.primary,
      text: PurpleColors.textPrimary,
      placeholder: PurpleColors.textLight,
      borderRadius: BorderRadius.input,
      padding: { vertical: Spacing.md, horizontal: Spacing.md },
      shadow: Shadows.sm,
    },
    
    error: {
      background: PurpleColors.white,
      border: PurpleColors.error,
      text: PurpleColors.textPrimary,
      placeholder: PurpleColors.textLight,
      borderRadius: BorderRadius.input,
      padding: { vertical: Spacing.md, horizontal: Spacing.md },
    },
  },
  
  // Header variants
  header: {
    default: {
      background: PurpleGradients.header,
      text: PurpleColors.white,
      border: 'transparent',
      shadow: Shadows.md,
      padding: Spacing.lg,
    },
    
    transparent: {
      background: 'transparent',
      text: PurpleColors.textPrimary,
      border: 'transparent',
      shadow: Shadows.none,
      padding: Spacing.lg,
    },
  },
  
  // Avatar variants
  avatar: {
    small: {
      size: 32,
      borderRadius: BorderRadius.avatar,
      border: PurpleColors.purple200,
    },
    
    medium: {
      size: 48,
      borderRadius: BorderRadius.avatar,
      border: PurpleColors.purple200,
    },
    
    large: {
      size: 64,
      borderRadius: BorderRadius.avatar,
      border: PurpleColors.purple200,
    },
    
    xlarge: {
      size: 96,
      borderRadius: BorderRadius.avatar,
      border: PurpleColors.purple200,
    },
  },
} as const;

/**
 * Animation and timing values
 */
export const Animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
  
  // Common animation configs
  fadeIn: {
    duration: 250,
    useNativeDriver: true,
  },
  
  slideIn: {
    duration: 300,
    useNativeDriver: true,
  },
  
  bounce: {
    duration: 400,
    useNativeDriver: true,
  },
} as const;

/**
 * Complete Purple Theme object
 */
export const PurpleTheme = {
  colors: PurpleColors,
  gradients: PurpleGradients,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  components: Components,
  animation: Animation,
  
  // Utility functions
  utils: {
    ...ColorUtils,
    ...GradientUtils,
  },
} as const;

/**
 * Theme type for TypeScript
 */
export type Theme = typeof PurpleTheme;

/**
 * Default export
 */
export default PurpleTheme;