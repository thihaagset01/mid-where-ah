/**
 * LocationInput Types and Configuration Tests
 * Tests the TypeScript interfaces and configuration constants
 */

import { 
  TRANSPORT_MODES,
  LOCATION_INPUT_CONFIG,
  SINGAPORE_PLACES_CONFIG,
  VALIDATION_RULES,
  SINGAPORE_BOUNDS,
  ERROR_MESSAGES,
} from '../../../src/components/location/constants';

describe('LocationInput Types and Configuration', () => {
  describe('Transport Modes Configuration', () => {
    it('should have all required transport modes', () => {
      const expectedModes = ['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING'];
      const actualModes = TRANSPORT_MODES.map(mode => mode.mode);
      
      expect(actualModes).toEqual(expect.arrayContaining(expectedModes));
      expect(actualModes).toHaveLength(4);
    });

    it('should have correct transport mode configurations', () => {
      const drivingMode = TRANSPORT_MODES.find(mode => mode.mode === 'DRIVING');
      expect(drivingMode).toEqual({
        mode: 'DRIVING',
        label: 'Drive',
        icon: '🚗',
        color: '#6B7280',
        description: 'Private vehicle'
      });

      const transitMode = TRANSPORT_MODES.find(mode => mode.mode === 'TRANSIT');
      expect(transitMode).toEqual({
        mode: 'TRANSIT',
        label: 'MRT/Bus',
        icon: '🚇',
        color: '#0066CC',
        description: 'Public transport'
      });
    });

    it('should have valid color codes for all transport modes', () => {
      TRANSPORT_MODES.forEach(mode => {
        expect(mode.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('Location Input Configuration', () => {
    it('should have correct default values', () => {
      expect(LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS).toBe(2);
      expect(LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS).toBe(10);
      expect(LOCATION_INPUT_CONFIG.ANIMATION_DURATION).toBe(300);
      expect(LOCATION_INPUT_CONFIG.DEBOUNCE_DELAY).toBe(500);
    });

    it('should have reasonable configuration values', () => {
      expect(LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS).toBeGreaterThan(1);
      expect(LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS).toBeLessThan(20);
      expect(LOCATION_INPUT_CONFIG.ANIMATION_DURATION).toBeGreaterThan(0);
      expect(LOCATION_INPUT_CONFIG.DEBOUNCE_DELAY).toBeGreaterThan(0);
    });
  });

  describe('Singapore Places Configuration', () => {
    it('should have Singapore-specific configuration', () => {
      expect(SINGAPORE_PLACES_CONFIG.language).toBe('en');
      expect(SINGAPORE_PLACES_CONFIG.components).toBe('country:sg');
      expect(SINGAPORE_PLACES_CONFIG.strictbounds).toBe(true);
    });

    it('should have Singapore coordinates in location string', () => {
      expect(SINGAPORE_PLACES_CONFIG.location).toContain('1.3521');
      expect(SINGAPORE_PLACES_CONFIG.location).toContain('103.8198');
    });

    it('should have reasonable radius for Singapore', () => {
      expect(SINGAPORE_PLACES_CONFIG.radius).toBe(50000); // 50km
      expect(SINGAPORE_PLACES_CONFIG.radius).toBeGreaterThan(10000);
      expect(SINGAPORE_PLACES_CONFIG.radius).toBeLessThan(100000);
    });
  });

  describe('Validation Rules', () => {
    it('should have all required validation rules', () => {
      expect(VALIDATION_RULES).toHaveLength(6);
      
      const expectedRules = [
        'At least 2 locations are required',
        'Maximum 10 locations allowed',
        'All locations must have valid addresses',
        'All locations must have selected transport mode',
        'Duplicate locations are not allowed',
        'All locations must be valid Singapore addresses'
      ];

      const actualRuleMessages = VALIDATION_RULES.map(rule => rule.errorMessage);
      expect(actualRuleMessages).toEqual(expect.arrayContaining(expectedRules));
    });

    it('should have validation functions for each rule', () => {
      VALIDATION_RULES.forEach(rule => {
        expect(typeof rule.validate).toBe('function');
        expect(typeof rule.errorMessage).toBe('string');
      });
    });
  });

  describe('Singapore Bounds', () => {
    it('should have correct Singapore geographical bounds', () => {
      // Singapore is roughly between these coordinates
      expect(SINGAPORE_BOUNDS.north).toBe(1.4764);
      expect(SINGAPORE_BOUNDS.south).toBe(1.1496);
      expect(SINGAPORE_BOUNDS.east).toBe(104.0270);
      expect(SINGAPORE_BOUNDS.west).toBe(103.6057);
    });

    it('should have logical bound relationships', () => {
      expect(SINGAPORE_BOUNDS.north).toBeGreaterThan(SINGAPORE_BOUNDS.south);
      expect(SINGAPORE_BOUNDS.east).toBeGreaterThan(SINGAPORE_BOUNDS.west);
    });

    it('should cover reasonable area for Singapore', () => {
      const latRange = SINGAPORE_BOUNDS.north - SINGAPORE_BOUNDS.south;
      const lngRange = SINGAPORE_BOUNDS.east - SINGAPORE_BOUNDS.west;
      
      expect(latRange).toBeGreaterThan(0.2);
      expect(latRange).toBeLessThan(1);
      expect(lngRange).toBeGreaterThan(0.3);
      expect(lngRange).toBeLessThan(1);
    });
  });

  describe('Error Messages', () => {
    it('should have error messages for all scenarios', () => {
      const requiredMessages = [
        'LOCATION_PERMISSION_DENIED',
        'LOCATION_UNAVAILABLE',
        'GEOCODING_FAILED',
        'INVALID_SINGAPORE_ADDRESS',
        'NETWORK_ERROR',
        'UNKNOWN_ERROR'
      ];

      requiredMessages.forEach(messageKey => {
        expect(ERROR_MESSAGES[messageKey as keyof typeof ERROR_MESSAGES]).toBeDefined();
        expect(typeof ERROR_MESSAGES[messageKey as keyof typeof ERROR_MESSAGES]).toBe('string');
      });
    });

    it('should have non-empty error messages', () => {
      Object.values(ERROR_MESSAGES).forEach(message => {
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });
});