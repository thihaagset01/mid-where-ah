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
      mrt: '#0066CC',          // Singapore MRT blue
      bus: '#FF6B35',          // Bus orange
      walk: '#10B981',         // Walking green
      drive: '#6B7280',        // Driving gray
      mixed: '#8B5CF6'         // Multi-modal purple
    },
    neutral: {
      white: '#FFFFFF',
      gray100: '#F8F9FA',
      gray500: '#6B7280',
      gray900: '#111827'
    }
  } as const;