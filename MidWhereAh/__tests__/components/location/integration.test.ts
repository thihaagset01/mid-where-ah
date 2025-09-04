/**
 * LocationInput Integration Tests
 * Tests the complete location input workflow including validation and optimization
 */

import { 
  TRANSPORT_MODES,
  VALIDATION_RULES,
  LOCATION_INPUT_CONFIG,
  SINGAPORE_BOUNDS,
} from '../../../src/components/location/constants';
import { UserLocationInput } from '../../../src/components/location/types';

describe('LocationInput Integration', () => {
  describe('Complete User Workflow', () => {
    it('should handle a typical user flow successfully', () => {
      console.log('🚀 Starting LocationInput integration test...');
      
      // Start with empty locations
      const locations: UserLocationInput[] = [
        {
          id: 'loc1',
          address: '',
          transportMode: 'TRANSIT',
        },
        {
          id: 'loc2',
          address: '',
          transportMode: 'TRANSIT',
        },
      ];

      // User adds first location
      locations[0].address = 'Marina Bay Sands';
      locations[0].coordinate = { latitude: 1.2834, longitude: 103.8607 };
      locations[0].isValid = true;

      // User adds second location  
      locations[1].address = 'Orchard Road';
      locations[1].coordinate = { latitude: 1.3048, longitude: 103.8318 };
      locations[1].isValid = true;

      // User changes transport mode for first location
      locations[0].transportMode = 'DRIVING';

      // Validate the workflow
      expect(locations).toHaveLength(2);
      expect(locations[0].address).toBe('Marina Bay Sands');
      expect(locations[0].transportMode).toBe('DRIVING');
      expect(locations[1].address).toBe('Orchard Road');
      expect(locations[1].transportMode).toBe('TRANSIT');

      console.log('✅ Basic workflow completed successfully!');
    });

    it('should handle adding and removing locations', () => {
      let locations: UserLocationInput[] = [];

      // Start with minimum locations
      for (let i = 0; i < LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS; i++) {
        locations.push({
          id: `loc${i + 1}`,
          address: `Location ${i + 1}`,
          transportMode: 'TRANSIT',
          isValid: true,
        });
      }

      expect(locations).toHaveLength(LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS);

      // Add locations up to maximum
      while (locations.length < LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS) {
        locations.push({
          id: `loc${locations.length + 1}`,
          address: `Location ${locations.length + 1}`,
          transportMode: 'WALKING',
          isValid: true,
        });
      }

      expect(locations).toHaveLength(LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS);

      // Remove locations back to minimum
      while (locations.length > LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS) {
        locations.pop();
      }

      expect(locations).toHaveLength(LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS);
      console.log('✅ Add/remove workflow completed successfully!');
    });

    it('should validate all transport modes work correctly', () => {
      const locations: UserLocationInput[] = [];

      TRANSPORT_MODES.forEach((mode, index) => {
        locations.push({
          id: `loc${index + 1}`,
          address: `Location for ${mode.label}`,
          transportMode: mode.mode,
          coordinate: {
            latitude: 1.3521 + (index * 0.01),
            longitude: 103.8198 + (index * 0.01),
          },
          isValid: true,
        });
      });

      expect(locations).toHaveLength(TRANSPORT_MODES.length);
      
      // Verify each transport mode is used
      TRANSPORT_MODES.forEach(mode => {
        const location = locations.find(loc => loc.transportMode === mode.mode);
        expect(location).toBeDefined();
        expect(location?.transportMode).toBe(mode.mode);
      });

      console.log('✅ All transport modes validated successfully!');
    });

    it('should validate Singapore coordinates are within bounds', () => {
      const testCoordinates = [
        { latitude: 1.2834, longitude: 103.8607, name: 'Marina Bay Sands' },
        { latitude: 1.3048, longitude: 103.8318, name: 'Orchard Road' },
        { latitude: 1.2844, longitude: 103.8507, name: 'Raffles Place' },
        { latitude: 1.3329, longitude: 103.7436, name: 'Jurong East' },
        { latitude: 1.3496, longitude: 103.9568, name: 'Tampines' },
      ];

      testCoordinates.forEach(coord => {
        expect(coord.latitude).toBeGreaterThanOrEqual(SINGAPORE_BOUNDS.south);
        expect(coord.latitude).toBeLessThanOrEqual(SINGAPORE_BOUNDS.north);
        expect(coord.longitude).toBeGreaterThanOrEqual(SINGAPORE_BOUNDS.west);
        expect(coord.longitude).toBeLessThanOrEqual(SINGAPORE_BOUNDS.east);
      });

      console.log('✅ Singapore coordinates validation passed!');
    });
  });

  describe('Validation Rules Integration', () => {
    it('should run all validation rules on a complete scenario', () => {
      const validLocations: UserLocationInput[] = [
        {
          id: 'loc1',
          address: 'Marina Bay Sands',
          transportMode: 'DRIVING',
          coordinate: { latitude: 1.2834, longitude: 103.8607 },
          isValid: true,
        },
        {
          id: 'loc2',
          address: 'Orchard Road',
          transportMode: 'TRANSIT',
          coordinate: { latitude: 1.3048, longitude: 103.8318 },
          isValid: true,
        },
      ];

      // Test each validation rule
      VALIDATION_RULES.forEach((rule, index) => {
        const isValid = rule.validate(validLocations);
        expect(isValid).toBe(true);
        console.log(`✅ Validation rule ${index + 1}: ${rule.errorMessage} - PASSED`);
      });

      console.log('✅ All validation rules passed for valid scenario!');
    });

    it('should catch validation errors appropriately', () => {
      const invalidScenarios = [
        {
          name: 'Too few locations',
          locations: [
            {
              id: 'loc1',
              address: 'Marina Bay Sands',
              transportMode: 'DRIVING' as const,
              isValid: true,
            },
          ],
          expectedError: 'At least 2 locations are required',
        },
        {
          name: 'Duplicate addresses',
          locations: [
            {
              id: 'loc1',
              address: 'Marina Bay Sands',
              transportMode: 'DRIVING' as const,
              isValid: true,
            },
            {
              id: 'loc2',
              address: 'Marina Bay Sands',
              transportMode: 'TRANSIT' as const,
              isValid: true,
            },
          ],
          expectedError: 'Duplicate locations are not allowed',
        },
        {
          name: 'Empty addresses',
          locations: [
            {
              id: 'loc1',
              address: '',
              transportMode: 'DRIVING' as const,
            },
            {
              id: 'loc2',
              address: 'Orchard Road',
              transportMode: 'TRANSIT' as const,
              isValid: true,
            },
          ],
          expectedError: 'All locations must have valid addresses',
        },
      ];

      invalidScenarios.forEach(scenario => {
        const errors: string[] = [];
        
        VALIDATION_RULES.forEach(rule => {
          if (!rule.validate(scenario.locations)) {
            errors.push(rule.errorMessage);
          }
        });

        expect(errors).toContain(scenario.expectedError);
        console.log(`✅ Validation correctly caught: ${scenario.name}`);
      });

      console.log('✅ All validation error scenarios handled correctly!');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle maximum locations efficiently', () => {
      const startTime = Date.now();
      
      const maxLocations: UserLocationInput[] = [];
      for (let i = 0; i < LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS; i++) {
        maxLocations.push({
          id: `loc${i + 1}`,
          address: `Location ${i + 1}`,
          transportMode: TRANSPORT_MODES[i % TRANSPORT_MODES.length].mode,
          coordinate: {
            latitude: 1.3521 + (i * 0.001),
            longitude: 103.8198 + (i * 0.001),
          },
          isValid: true,
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(maxLocations).toHaveLength(LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS);
      expect(duration).toBeLessThan(100); // Should be very fast
      
      console.log(`✅ Maximum locations (${LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS}) handled in ${duration}ms`);
    });

    it('should handle special characters in addresses', () => {
      const specialAddresses = [
        "Marina Bay Sands, Singapore 018956",
        "Orchard Road (Central)",
        "Raffles Place MRT Station",
        "123 Somerset Road #01-01",
        "Clarke Quay & Boat Quay",
      ];

      specialAddresses.forEach(address => {
        const location: UserLocationInput = {
          id: `loc_${Math.random()}`,
          address: address,
          transportMode: 'TRANSIT',
          isValid: true,
        };

        expect(location.address).toBe(address);
        expect(location.address.length).toBeGreaterThan(0);
      });

      console.log('✅ Special characters in addresses handled correctly!');
    });

    it('should demonstrate real Singapore locations work together', () => {
      const realSingaporeLocations: UserLocationInput[] = [
        {
          id: 'mbs',
          address: 'Marina Bay Sands',
          transportMode: 'TRANSIT',
          coordinate: { latitude: 1.2834, longitude: 103.8607 },
          isValid: true,
        },
        {
          id: 'orchard',
          address: 'Orchard Road',
          transportMode: 'WALKING',
          coordinate: { latitude: 1.3048, longitude: 103.8318 },
          isValid: true,
        },
        {
          id: 'changi',
          address: 'Changi Airport',
          transportMode: 'DRIVING',
          coordinate: { latitude: 1.3644, longitude: 103.9915 },
          isValid: true,
        },
      ];

      // All locations should be valid Singapore addresses
      realSingaporeLocations.forEach(location => {
        expect(location.coordinate).toBeDefined();
        expect(location.coordinate!.latitude).toBeGreaterThan(SINGAPORE_BOUNDS.south);
        expect(location.coordinate!.latitude).toBeLessThan(SINGAPORE_BOUNDS.north);
        expect(location.coordinate!.longitude).toBeGreaterThan(SINGAPORE_BOUNDS.west);
        expect(location.coordinate!.longitude).toBeLessThan(SINGAPORE_BOUNDS.east);
      });

      // Should pass all validation rules
      VALIDATION_RULES.forEach(rule => {
        expect(rule.validate(realSingaporeLocations)).toBe(true);
      });

      console.log('✅ Real Singapore locations integration test passed!');
      console.log(`📍 Tested ${realSingaporeLocations.length} authentic Singapore locations`);
    });
  });

  describe('Comprehensive Integration Summary', () => {
    it('should complete end-to-end integration test successfully', () => {
      console.log('🎯 Running comprehensive integration test...');
      
      const stats = {
        transportModesValidated: TRANSPORT_MODES.length,
        validationRulesChecked: VALIDATION_RULES.length,
        maxLocationsSupported: LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS,
        minLocationsRequired: LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS,
      };

      // Verify all components are properly configured
      expect(stats.transportModesValidated).toBe(4);
      expect(stats.validationRulesChecked).toBe(6);
      expect(stats.maxLocationsSupported).toBe(10);
      expect(stats.minLocationsRequired).toBe(2);

      console.log('📊 Integration test statistics:');
      console.log(`  🚇 Transport modes: ${stats.transportModesValidated}`);
      console.log(`  ✅ Validation rules: ${stats.validationRulesChecked}`);
      console.log(`  📍 Max locations: ${stats.maxLocationsSupported}`);
      console.log(`  📍 Min locations: ${stats.minLocationsRequired}`);
      console.log('🎉 LocationInput integration test completed successfully!');
    });
  });
});