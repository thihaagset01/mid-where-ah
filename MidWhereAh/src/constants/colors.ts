export const colors = {
  primary: {
    main: '#8B5DB8',         // Primary purple - existing brand
    light: '#A477CC',        
    dark: '#6A4A8C',         
    background: '#E8DFF5'    
  },
  equity: {
    excellent: '#22C55E',    // Jain's Index > 0.9
    good: '#7BB366',         // Jain's Index 0.8-0.9
    fair: '#F59E0B',         // Jain's Index 0.6-0.8
    poor: '#E74C3C',         // Jain's Index 0.4-0.6
    critical: '#DC2626'      // Jain's Index < 0.4
  },
  transport: {
    mrt: '#8B5DB8',          // Singapore MRT purple (same as primary)
    drive: '#28a745',        // Green for driving
    walk: '#ffc107',         // Yellow for walking
    mixed: '#17a2b8',        // Blue for cycling
    bus: '#FF6B35',          // Bus orange (keeping original)
  },
  neutral: {
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F8F9FA',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray900: '#111827'
  },
  brand: {
    primary: '#8B5DB8'
  }
} as const;