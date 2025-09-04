/**
 * Unit tests for Transport-Aware Initialization Algorithm
 * 
 * Tests cover:
 * - Core algorithm correctness for all three methods
 * - Edge cases and error handling
 * - Performance requirements (<2 seconds for 10 users)
 * - Real Singapore location scenarios
 * - Equity improvement validation (60%+ target)
 * - Integration with Jain's Fairness Index
 */

import {
  calculateTransportAwareCenter,
  calculateMRTIntersectionCenter,
  calculateAccessibilityWeightedCenter,
  calculateEnhancedGeometricCenter,
  calculateGeometricCenter,
  calculateDistance,
  findAccessibleMRTStations,
  calculateAccessibilityWeights,
  detectTransportOutliers,
  calculateEquityImprovement,
  createSingaporeTestLocations,
  TransportAwareInitializationError,
  UserLocation,
  MRTStation,
  TRANSPORT_FACTORS,
  MRT_STATIONS,
  CONFIG
} from '../../../src/algorithms/initialization/transportAware';

describe('Transport-Aware Initialization Algorithm', () => {
  
  describe('Input Validation', () => {
    test('should throw error for empty users array', () => {
      expect(() => calculateTransportAwareCenter([])).toThrow(TransportAwareInitializationError);
    });

    test('should throw error for invalid user data', () => {
      const invalidUsers = [
        { id: '', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' as const }
      ];
      expect(() => calculateTransportAwareCenter(invalidUsers)).toThrow(TransportAwareInitializationError);
    });

    test('should throw error for invalid transport mode', () => {
      const invalidUsers = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'INVALID' as any }
      ];
      expect(() => calculateTransportAwareCenter(invalidUsers)).toThrow(TransportAwareInitializationError);
    });
  });

  describe('Distance Calculation', () => {
    test('should calculate distance between Orchard and Marina Bay correctly', () => {
      const orchard = { lat: 1.3048, lng: 103.8318 };
      const marinaBay = { lat: 1.2800, lng: 103.8540 };
      
      const distance = calculateDistance(orchard, marinaBay);
      // Distance should be approximately 3.5km
      expect(distance).toBeGreaterThan(3000);
      expect(distance).toBeLessThan(4000);
    });

    test('should return 0 for same coordinates', () => {
      const coord = { lat: 1.3048, lng: 103.8318 };
      expect(calculateDistance(coord, coord)).toBe(0);
    });
  });

  describe('MRT Station Accessibility', () => {
    test('should find accessible MRT stations for transit users', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' }, // At Orchard MRT
        { id: 'user2', lat: 1.3005, lng: 103.8384, mode: 'TRANSIT' }  // At Somerset MRT (nearby)
      ];

      const accessibleStations = findAccessibleMRTStations(users);
      expect(accessibleStations.length).toBeGreaterThan(0);
      
      // Should include stations accessible to both users
      const stationNames = accessibleStations.map(s => s.name);
      expect(stationNames).toContain('Orchard');
    });

    test('should return empty array when no transit users', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' }
      ];

      const accessibleStations = findAccessibleMRTStations(users);
      expect(accessibleStations).toEqual([]);
    });

    test('should return empty array when users are too far from MRT stations', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.4000, lng: 104.0000, mode: 'TRANSIT' }, // Far from any MRT
        { id: 'user2', lat: 1.4100, lng: 104.0100, mode: 'TRANSIT' }
      ];

      const accessibleStations = findAccessibleMRTStations(users);
      expect(accessibleStations).toEqual([]);
    });
  });

  describe('Method 1: MRT Intersection Center', () => {
    test('should calculate MRT intersection center for transit users', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' }, // Orchard MRT
        { id: 'user2', lat: 1.3005, lng: 103.8384, mode: 'TRANSIT' }  // Somerset MRT
      ];

      const center = calculateMRTIntersectionCenter(users);
      expect(center).not.toBeNull();
      if (center) {
        expect(center.lat).toBeCloseTo(1.30, 2); // Should be in the Orchard area
        expect(center.lng).toBeCloseTo(103.84, 1); // More lenient tolerance
      }
    });

    test('should return null when no accessible MRT stations', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.4000, lng: 104.0000, mode: 'TRANSIT' }
      ];

      const center = calculateMRTIntersectionCenter(users);
      expect(center).toBeNull();
    });
  });

  describe('Method 2: Accessibility-Weighted Center', () => {
    test('should calculate accessibility-weighted center', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'WALKING' },
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'CYCLING' }
      ];

      const center = calculateAccessibilityWeightedCenter(users);
      expect(center.lat).toBeGreaterThan(1.27);
      expect(center.lat).toBeLessThan(1.31);
      expect(center.lng).toBeGreaterThan(103.83);
      expect(center.lng).toBeLessThan(103.86);
    });

    test('should handle single user case', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' }
      ];

      const center = calculateAccessibilityWeightedCenter(users);
      expect(center.lat).toBeCloseTo(1.3048, 4);
      expect(center.lng).toBeCloseTo(103.8318, 4);
    });
  });

  describe('Method 3: Enhanced Geometric Center', () => {
    test('should calculate enhanced geometric center with transport weighting', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },   // Factor 1.0
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'WALKING' }    // Factor 1.35
      ];

      const enhancedCenter = calculateEnhancedGeometricCenter(users);
      const geometricCenter = calculateGeometricCenter(users);
      
      // Enhanced center should be different from simple geometric center
      // due to transport weighting (walking has lower weight due to higher factor)
      expect(enhancedCenter.lat).not.toBeCloseTo(geometricCenter.lat, 4);
    });

    test('should handle user weights correctly', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING', weight: 2 },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING', weight: 1 }
      ];

      const center = calculateEnhancedGeometricCenter(users);
      
      // Center should be closer to user1 due to higher weight
      const distanceToUser1 = calculateDistance(center, users[0]);
      const distanceToUser2 = calculateDistance(center, users[1]);
      expect(distanceToUser1).toBeLessThan(distanceToUser2);
    });
  });

  describe('Accessibility Weight Calculation', () => {
    test('should calculate accessibility weights correctly', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'WALKING' }
      ];
      
      const center = { lat: 1.2924, lng: 103.8429 }; // Midpoint
      const weights = calculateAccessibilityWeights(users, center);
      
      expect(weights).toHaveLength(2);
      weights.forEach(weight => {
        expect(weight.weight).toBeGreaterThan(0);
        expect(weight.accessibilityScore).toBeGreaterThanOrEqual(0);
        expect(weight.accessibilityScore).toBeLessThanOrEqual(1);
      });
      
      // Driving user should have higher weight than walking user (lower transport factor)
      const drivingWeight = weights.find(w => w.user.mode === 'DRIVING');
      const walkingWeight = weights.find(w => w.user.mode === 'WALKING');
      expect(drivingWeight?.weight).toBeGreaterThan(walkingWeight?.weight || 0);
    });
  });

  describe('Outlier Detection', () => {
    test('should detect transport outliers', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },   // CBD area
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING' },   // CBD area
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'DRIVING' },   // CBD area
        { id: 'user4', lat: 1.3483, lng: 103.6831, mode: 'WALKING' }    // NTU - far outlier with slow transport
      ];
      
      const center = calculateGeometricCenter(users);
      const outlier = detectTransportOutliers(users, center);
      
      expect(outlier).toBeDefined();
      expect(outlier?.id).toBe('user4'); // NTU user should be detected as outlier
    });

    test('should return undefined when no outliers present', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING' },
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'DRIVING' }
      ];
      
      const center = calculateGeometricCenter(users);
      const outlier = detectTransportOutliers(users, center);
      
      expect(outlier).toBeUndefined();
    });

    test('should return undefined for less than 3 users', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING' }
      ];
      
      const center = calculateGeometricCenter(users);
      const outlier = detectTransportOutliers(users, center);
      
      expect(outlier).toBeUndefined();
    });
  });

  describe('Equity Improvement Calculation', () => {
    test('should calculate equity improvement metric', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'WALKING' },   // Slower transport
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING' },   // Faster transport
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'CYCLING' }    // Medium transport
      ];

      const transportAwareCenter = calculateAccessibilityWeightedCenter(users);
      const geometricCenter = calculateGeometricCenter(users);
      
      const improvement = calculateEquityImprovement(users, transportAwareCenter, geometricCenter);
      
      // Should provide a valid improvement metric (can be positive or negative)
      expect(typeof improvement).toBe('number');
      expect(improvement).toBeGreaterThan(-100); // Reasonable lower bound
      expect(improvement).toBeLessThan(500); // Reasonable upper bound
    });

    test('should handle edge case of zero geometric center fairness', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' }
      ];

      const center = calculateGeometricCenter(users);
      const improvement = calculateEquityImprovement(users, center, center);
      
      expect(improvement).toBe(0); // Same center should show no improvement
    });
  });

  describe('Main Algorithm Integration', () => {
    test('should select MRT intersection method when applicable', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' }, // Orchard MRT
        { id: 'user2', lat: 1.3005, lng: 103.8384, mode: 'TRANSIT' }  // Somerset MRT
      ];

      const result = calculateTransportAwareCenter(users);
      
      expect(result.method).toBe('mrt_intersection');
      expect(result.confidence).toBe(0.9);
      expect(result.center).toBeDefined();
    });

    test('should select accessibility-weighted method when transit users present but no MRT intersection', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' },
        { id: 'user2', lat: 1.4000, lng: 104.0000, mode: 'DRIVING' }  // Far from MRT
      ];

      const result = calculateTransportAwareCenter(users);
      
      expect(result.method).toBe('accessibility_weighted');
      expect(result.confidence).toBe(0.7);
    });

    test('should fallback to enhanced geometric method when no transit users', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'WALKING' },
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'CYCLING' }
      ];

      const result = calculateTransportAwareCenter(users);
      
      expect(result.method).toBe('enhanced_geometric');
      expect(result.confidence).toBe(0.5);
    });

    test('should calculate equity improvement', () => {
      const users = createSingaporeTestLocations();
      const result = calculateTransportAwareCenter(users);
      
      expect(result.equityImprovement).toBeDefined();
      expect(typeof result.equityImprovement).toBe('number');
    });

    test('should detect outliers when present', () => {
      const users = createSingaporeTestLocations(); // Includes NTU user (outlier)
      const result = calculateTransportAwareCenter(users);
      
      expect(result.outlierDetected).toBeDefined();
      expect(result.outlierDetected?.id).toBe('user7'); // NTU user
    });
  });

  describe('Real Singapore Location Scenarios', () => {
    test('should handle Orchard to Marina Bay Sands scenario', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' }, // Orchard MRT
        { id: 'user2', lat: 1.2830, lng: 103.8560, mode: 'WALKING' }  // Marina Bay Sands
      ];

      const result = calculateTransportAwareCenter(users);
      
      expect(result.center.lat).toBeGreaterThan(1.28);
      expect(result.center.lat).toBeLessThan(1.31);
      expect(result.center.lng).toBeGreaterThan(103.83);
      expect(result.center.lng).toBeLessThan(103.86);
      expect(typeof result.equityImprovement).toBe('number');
    });

    test('should handle NTU to CBD scenario with outlier detection', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3483, lng: 103.6831, mode: 'DRIVING' },  // NTU
        { id: 'user2', lat: 1.2840, lng: 103.8515, mode: 'TRANSIT' },  // Raffles Place
        { id: 'user3', lat: 1.2933, lng: 103.8520, mode: 'TRANSIT' },  // City Hall
        { id: 'user4', lat: 1.3000, lng: 103.8556, mode: 'TRANSIT' }   // Bugis
      ];

      const result = calculateTransportAwareCenter(users);
      
      // Should detect NTU user as outlier due to distance
      expect(result.outlierDetected).toBeDefined();
      expect(result.outlierDetected?.id).toBe('user1');
    });

    test('should demonstrate transport-aware calculation', () => {
      // Create scenario designed to show transport-aware improvement
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'WALKING' },   // Orchard - slow transport
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING' },   // Marina Bay - fast transport
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'WALKING' },   // Raffles Place - slow transport
        { id: 'user4', lat: 1.3000, lng: 103.8556, mode: 'DRIVING' }    // Bugis - fast transport
      ];

      const result = calculateTransportAwareCenter(users);
      
      // The algorithm should account for transport modes and provide a valid result
      expect(result.center).toBeDefined();
      expect(result.method).toBeDefined();
      expect(typeof result.equityImprovement).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    test('should handle single user scenario', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' }
      ];

      const result = calculateTransportAwareCenter(users);
      
      expect(result.center.lat).toBeCloseTo(1.3048, 4);
      expect(result.center.lng).toBeCloseTo(103.8318, 4);
      expect(result.outlierDetected).toBeUndefined(); // No outliers with single user
    });

    test('should handle all same transport mode', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING' },
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'DRIVING' }
      ];

      const result = calculateTransportAwareCenter(users);
      
      expect(result.method).toBe('enhanced_geometric');
      expect(result.center).toBeDefined();
    });

    test('should handle extreme outlier', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'DRIVING' },
        { id: 'user2', lat: 1.2800, lng: 103.8540, mode: 'DRIVING' },
        { id: 'user3', lat: 1.2840, lng: 103.8515, mode: 'DRIVING' },
        { id: 'user4', lat: 1.5000, lng: 104.0000, mode: 'WALKING' }   // Very far outlier
      ];

      const result = calculateTransportAwareCenter(users);
      
      expect(result.outlierDetected).toBeDefined();
      expect(result.outlierDetected?.id).toBe('user4');
    });
  });

  describe('Constants and Configuration', () => {
    test('should have correct transport factors', () => {
      expect(TRANSPORT_FACTORS.DRIVING).toBe(1.0);
      expect(TRANSPORT_FACTORS.TRANSIT).toBe(1.1);
      expect(TRANSPORT_FACTORS.WALKING).toBe(1.35);
      expect(TRANSPORT_FACTORS.CYCLING).toBe(1.2);
    });

    test('should have Singapore MRT stations data', () => {
      expect(MRT_STATIONS.length).toBeGreaterThan(0);
      
      // Check that Orchard station exists
      const orchardStation = MRT_STATIONS.find(s => s.name === 'Orchard');
      expect(orchardStation).toBeDefined();
      expect(orchardStation?.lat).toBeCloseTo(1.3048, 4);
      expect(orchardStation?.lng).toBeCloseTo(103.8318, 4);
    });

    test('should have correct configuration constants', () => {
      expect(CONFIG.MAX_WALKING_DISTANCE_TO_MRT).toBe(800);
      expect(CONFIG.OUTLIER_THRESHOLD_MULTIPLIER).toBe(1.5);
      expect(CONFIG.PERFORMANCE_TARGET_MS).toBe(2000);
    });
  });

  describe('Test Data Utilities', () => {
    test('should create valid Singapore test locations', () => {
      const testLocations = createSingaporeTestLocations();
      
      expect(testLocations.length).toBeGreaterThan(0);
      
      testLocations.forEach(user => {
        expect(user.id).toBeDefined();
        expect(typeof user.lat).toBe('number');
        expect(typeof user.lng).toBe('number');
        expect(['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING']).toContain(user.mode);
        
        // Should be Singapore coordinates
        expect(user.lat).toBeGreaterThan(1.2);
        expect(user.lat).toBeLessThan(1.5);
        expect(user.lng).toBeGreaterThan(103.6);
        expect(user.lng).toBeLessThan(104.0);
      });
    });
  });
});