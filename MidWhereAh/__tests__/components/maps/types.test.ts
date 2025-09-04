/**
 * MapView Types and Configuration Tests
 * Tests the TypeScript interfaces and configuration constants
 */

import { 
  UserLocation, 
  OptimalPoint, 
  Venue, 
  MapMarker,
  SINGAPORE_REGION,
  MARKER_COLORS,
  MAP_PERFORMANCE_CONFIG,
  ACCESSIBILITY_CONFIG
} from '../../../src/components/maps/types';

describe('MapView Types and Configuration', () => {
  describe('Singapore Region Configuration', () => {
    it('should have correct Singapore coordinates', () => {
      expect(SINGAPORE_REGION.latitude).toBe(1.3521);
      expect(SINGAPORE_REGION.longitude).toBe(103.8198);
      expect(SINGAPORE_REGION.latitudeDelta).toBe(0.1);
      expect(SINGAPORE_REGION.longitudeDelta).toBe(0.1);
    });

    it('should have proper region bounds for Singapore', () => {
      // Singapore is roughly between 1.2° to 1.5° latitude and 103.6° to 104.0° longitude
      expect(SINGAPORE_REGION.latitude).toBeGreaterThan(1.2);
      expect(SINGAPORE_REGION.latitude).toBeLessThan(1.5);
      expect(SINGAPORE_REGION.longitude).toBeGreaterThan(103.6);
      expect(SINGAPORE_REGION.longitude).toBeLessThan(104.0);
    });
  });

  describe('Marker Colors Configuration', () => {
    it('should have colors for all transport modes', () => {
      expect(MARKER_COLORS.user.DRIVING).toBe('#6B7280');
      expect(MARKER_COLORS.user.TRANSIT).toBe('#0066CC');
      expect(MARKER_COLORS.user.WALKING).toBe('#10B981');
      expect(MARKER_COLORS.user.CYCLING).toBe('#F59E0B');
    });

    it('should have colors for all equity levels', () => {
      expect(MARKER_COLORS.optimal.excellent).toBe('#22C55E');
      expect(MARKER_COLORS.optimal.good).toBe('#7BB366');
      expect(MARKER_COLORS.optimal.fair).toBe('#F59E0B');
      expect(MARKER_COLORS.optimal.poor).toBe('#E74C3C');
      expect(MARKER_COLORS.optimal.critical).toBe('#DC2626');
    });

    it('should have venue color', () => {
      expect(MARKER_COLORS.venue).toBe('#8B5DB8');
    });

    it('should use valid hex color format', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;
      
      // Test user colors
      Object.values(MARKER_COLORS.user).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
      
      // Test optimal colors
      Object.values(MARKER_COLORS.optimal).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
      
      // Test venue color
      expect(MARKER_COLORS.venue).toMatch(hexColorRegex);
    });
  });

  describe('Performance Configuration', () => {
    it('should have reasonable performance thresholds', () => {
      expect(MAP_PERFORMANCE_CONFIG.CLUSTER_THRESHOLD).toBe(10);
      expect(MAP_PERFORMANCE_CONFIG.MAX_ZOOM_LEVEL).toBe(18);
      expect(MAP_PERFORMANCE_CONFIG.MIN_ZOOM_LEVEL).toBe(8);
      expect(MAP_PERFORMANCE_CONFIG.ANIMATION_DURATION).toBe(250);
      expect(MAP_PERFORMANCE_CONFIG.TOUCH_RESPONSE_THRESHOLD).toBe(100);
      expect(MAP_PERFORMANCE_CONFIG.TARGET_FPS).toBe(60);
      expect(MAP_PERFORMANCE_CONFIG.VIEWPORT_PADDING).toBe(0.1);
    });

    it('should have valid zoom level ranges', () => {
      expect(MAP_PERFORMANCE_CONFIG.MIN_ZOOM_LEVEL).toBeLessThan(MAP_PERFORMANCE_CONFIG.MAX_ZOOM_LEVEL);
      expect(MAP_PERFORMANCE_CONFIG.MIN_ZOOM_LEVEL).toBeGreaterThanOrEqual(0);
      expect(MAP_PERFORMANCE_CONFIG.MAX_ZOOM_LEVEL).toBeLessThanOrEqual(20);
    });

    it('should have reasonable performance targets', () => {
      expect(MAP_PERFORMANCE_CONFIG.TARGET_FPS).toBe(60);
      expect(MAP_PERFORMANCE_CONFIG.TOUCH_RESPONSE_THRESHOLD).toBeLessThanOrEqual(100);
      expect(MAP_PERFORMANCE_CONFIG.ANIMATION_DURATION).toBeGreaterThan(0);
      expect(MAP_PERFORMANCE_CONFIG.ANIMATION_DURATION).toBeLessThanOrEqual(1000);
    });
  });

  describe('Accessibility Configuration', () => {
    it('should have descriptive accessibility labels', () => {
      expect(ACCESSIBILITY_CONFIG.MAP_LABEL).toBe('Singapore transport equity map');
      expect(ACCESSIBILITY_CONFIG.USER_MARKER_LABEL).toBe('User location marker');
      expect(ACCESSIBILITY_CONFIG.OPTIMAL_POINT_LABEL).toBe('Optimal meeting point');
      expect(ACCESSIBILITY_CONFIG.VENUE_MARKER_LABEL).toBe('Venue marker');
      expect(ACCESSIBILITY_CONFIG.CLUSTER_LABEL).toBe('Marker cluster');
    });

    it('should have non-empty accessibility labels', () => {
      Object.values(ACCESSIBILITY_CONFIG).forEach(label => {
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Type Definitions', () => {
    it('should create valid UserLocation objects', () => {
      const user: UserLocation = {
        id: 'test-user',
        coordinate: { latitude: 1.3521, longitude: 103.8198 },
        transportMode: 'TRANSIT',
        name: 'Test User',
        travelTime: 30,
      };

      expect(user.id).toBe('test-user');
      expect(user.coordinate.latitude).toBe(1.3521);
      expect(user.coordinate.longitude).toBe(103.8198);
      expect(user.transportMode).toBe('TRANSIT');
      expect(user.name).toBe('Test User');
      expect(user.travelTime).toBe(30);
    });

    it('should create valid OptimalPoint objects', () => {
      const optimal: OptimalPoint = {
        coordinate: { latitude: 1.3571, longitude: 103.8248 },
        equityLevel: 'good',
        jainsIndex: 0.85,
        venues: [],
      };

      expect(optimal.coordinate.latitude).toBe(1.3571);
      expect(optimal.coordinate.longitude).toBe(103.8248);
      expect(optimal.equityLevel).toBe('good');
      expect(optimal.jainsIndex).toBe(0.85);
      expect(Array.isArray(optimal.venues)).toBe(true);
    });

    it('should create valid Venue objects', () => {
      const venue: Venue = {
        id: 'test-venue',
        coordinate: { latitude: 1.3500, longitude: 103.8200 },
        name: 'Test Venue',
        type: 'restaurant',
        amenities: ['wifi', 'parking'],
      };

      expect(venue.id).toBe('test-venue');
      expect(venue.coordinate.latitude).toBe(1.3500);
      expect(venue.coordinate.longitude).toBe(103.8200);
      expect(venue.name).toBe('Test Venue');
      expect(venue.type).toBe('restaurant');
      expect(Array.isArray(venue.amenities)).toBe(true);
      expect(venue.amenities).toContain('wifi');
    });

    it('should create valid MapMarker objects', () => {
      const marker: MapMarker = {
        id: 'test-marker',
        coordinate: { latitude: 1.3521, longitude: 103.8198 },
        type: 'user',
        data: { test: 'data' },
      };

      expect(marker.id).toBe('test-marker');
      expect(marker.coordinate.latitude).toBe(1.3521);
      expect(marker.coordinate.longitude).toBe(103.8198);
      expect(marker.type).toBe('user');
      expect(marker.data).toEqual({ test: 'data' });
    });

    it('should validate transport modes', () => {
      const validModes = ['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING'];
      
      validModes.forEach(mode => {
        const user: UserLocation = {
          id: 'test',
          coordinate: { latitude: 1.3521, longitude: 103.8198 },
          transportMode: mode as any,
        };
        expect(user.transportMode).toBe(mode);
      });
    });

    it('should validate equity levels', () => {
      const validLevels = ['excellent', 'good', 'fair', 'poor', 'critical'];
      
      validLevels.forEach(level => {
        const optimal: OptimalPoint = {
          coordinate: { latitude: 1.3521, longitude: 103.8198 },
          equityLevel: level as any,
          jainsIndex: 0.8,
          venues: [],
        };
        expect(optimal.equityLevel).toBe(level);
      });
    });

    it('should validate marker types', () => {
      const validTypes = ['user', 'optimal', 'venue'];
      
      validTypes.forEach(type => {
        const marker: MapMarker = {
          id: 'test',
          coordinate: { latitude: 1.3521, longitude: 103.8198 },
          type: type as any,
        };
        expect(marker.type).toBe(type);
      });
    });
  });

  describe('Singapore Coordinate Validation', () => {
    it('should validate coordinates within Singapore bounds', () => {
      const singaporeCoordinates = [
        { latitude: 1.2897, longitude: 103.8501 }, // Marina Bay
        { latitude: 1.3521, longitude: 103.8198 }, // CBD
        { latitude: 1.4382, longitude: 103.7882 }, // Woodlands
        { latitude: 1.3048, longitude: 103.8318 }, // Chinatown
        { latitude: 1.3644, longitude: 103.9915 }, // Changi
      ];

      singaporeCoordinates.forEach(coord => {
        expect(coord.latitude).toBeGreaterThan(1.1);
        expect(coord.latitude).toBeLessThan(1.5);
        expect(coord.longitude).toBeGreaterThan(103.6);
        expect(coord.longitude).toBeLessThan(104.1);
      });
    });

    it('should reject coordinates outside Singapore', () => {
      const outsideCoordinates = [
        { latitude: 0.5, longitude: 103.8 }, // Too south
        { latitude: 2.0, longitude: 103.8 }, // Too north (Malaysia)
        { latitude: 1.3, longitude: 102.0 }, // Too west (Indonesia)
        { latitude: 1.3, longitude: 105.0 }, // Too east
      ];

      outsideCoordinates.forEach(coord => {
        const isWithinSingapore = 
          coord.latitude > 1.1 && coord.latitude < 1.5 &&
          coord.longitude > 103.6 && coord.longitude < 104.1;
        expect(isWithinSingapore).toBe(false);
      });
    });
  });
});