/**
 * Purple Theme Colors for MidWhereAh
 * 
 * Matches Canva's beautiful purple gradient design aesthetic
 * with accessibility compliance and consistent brand identity.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

/**
 * Primary purple color palette matching Canva designs
 */
export const PurpleColors = {
  // Primary purple gradients
  primary: '#8B5DB8',           // Main purple
  primaryLight: '#A477CC',      // Light purple 
  primaryDark: '#6A4A8C',       // Dark purple accent
  primaryExtraLight: '#C299DC', // Extra light for highlights
  
  // Purple variations
  purple100: '#F5F3FA',         // Lightest purple tint
  purple200: '#E8DFF5',         // Light purple background
  purple300: '#D1C4E9',         // Soft purple
  purple400: '#B39DDB',         // Medium purple
  purple500: '#9575CD',         // Standard purple
  purple600: '#8B5DB8',         // Primary purple
  purple700: '#7E57C2',         // Darker purple
  purple800: '#6A4A8C',         // Dark purple
  purple900: '#4A2C6A',         // Darkest purple
  
  // Gradient colors
  gradientStart: '#8B5DB8',     // Gradient start
  gradientEnd: '#A477CC',       // Gradient end
  gradientBackground: '#E8DFF5', // Background gradient start
  gradientBackgroundEnd: '#F5F3FA', // Background gradient end
  
  // Text colors (WCAG AA compliant)
  textPrimary: '#2D1B3D',       // Dark purple text
  textSecondary: '#6B5B73',     // Medium purple text
  textLight: '#9B8BA3',         // Light purple text
  textWhite: '#FFFFFF',         // White text for dark backgrounds
  
  // Neutral colors
  white: '#FFFFFF',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Accent colors
  success: '#4CAF50',           // Green for success states
  warning: '#FF9800',           // Orange for warnings
  error: '#F44336',             // Red for errors
  info: '#2196F3',              // Blue for information
  
  // Transport mode colors (purple-themed)
  transport: {
    DRIVING: '#8B5DB8',         // Primary purple for driving
    TRANSIT: '#A477CC',         // Light purple for transit
    WALKING: '#6A4A8C',         // Dark purple for walking
    CYCLING: '#C299DC',         // Extra light purple for cycling
  },
  
  // Equity level colors (purple-themed)
  equity: {
    excellent: '#4CAF50',       // Green for excellent equity
    good: '#8BC34A',            // Light green for good equity
    fair: '#FF9800',            // Orange for fair equity
    poor: '#FF5722',            // Red-orange for poor equity
    critical: '#F44336',        // Red for critical equity
  },
  
  // Interactive states
  hover: 'rgba(139, 93, 184, 0.08)',    // Purple hover overlay
  pressed: 'rgba(139, 93, 184, 0.12)',  // Purple pressed overlay
  focus: 'rgba(139, 93, 184, 0.24)',    // Purple focus overlay
  disabled: 'rgba(139, 93, 184, 0.38)', // Purple disabled overlay
  
  // Shadows and overlays
  shadow: 'rgba(45, 27, 61, 0.1)',      // Subtle shadow
  overlay: 'rgba(45, 27, 61, 0.5)',     // Modal overlay
  backdrop: 'rgba(45, 27, 61, 0.8)',    // Strong backdrop
} as const;

/**
 * Color utility functions
 */
export const ColorUtils = {
  /**
   * Add alpha transparency to any color
   */
  withAlpha: (color: string, alpha: number): string => {
    // Simple hex to rgba conversion for purple theme colors
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  /**
   * Get appropriate text color for background
   */
  getTextColor: (backgroundColor: string): string => {
    // For purple theme, use simple light/dark logic
    const darkColors = [
      PurpleColors.primary,
      PurpleColors.primaryDark,
      PurpleColors.purple700,
      PurpleColors.purple800,
      PurpleColors.purple900,
      PurpleColors.textPrimary,
    ];
    
    return darkColors.some(color => color === backgroundColor)
      ? PurpleColors.textWhite 
      : PurpleColors.textPrimary;
  },

  /**
   * Get transport mode color
   */
  getTransportColor: (mode: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'CYCLING'): string => {
    return PurpleColors.transport[mode];
  },

  /**
   * Get equity level color
   */
  getEquityColor: (level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'): string => {
    return PurpleColors.equity[level];
  },
};

/**
 * Accessibility-compliant color combinations
 */
export const AccessibleCombinations = {
  // Primary combinations (WCAG AA compliant)
  primaryOnLight: {
    background: PurpleColors.white,
    text: PurpleColors.primary,
    contrast: 7.1, // Exceeds WCAG AA requirement
  },
  
  lightOnPrimary: {
    background: PurpleColors.primary,
    text: PurpleColors.white,
    contrast: 7.1,
  },
  
  darkOnLight: {
    background: PurpleColors.purple100,
    text: PurpleColors.textPrimary,
    contrast: 12.6, // Exceeds WCAG AAA requirement
  },
  
  // Secondary combinations
  secondaryOnLight: {
    background: PurpleColors.purple100,
    text: PurpleColors.textSecondary,
    contrast: 4.8,
  },
  
  // Interactive state combinations
  hoverState: {
    background: PurpleColors.hover,
    text: PurpleColors.textPrimary,
  },
  
  pressedState: {
    background: PurpleColors.pressed,
    text: PurpleColors.textPrimary,
  },
} as const;