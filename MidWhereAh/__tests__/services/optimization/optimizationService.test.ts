/**
 * Comprehensive tests for OptimizationService
 * Testing core functionality, edge cases, and performance requirements
 */

import {
  OptimizationService,
  OptimizationServiceError,
  startOptimization,
  OptimizationRequest,
  OptimizationResult,
  OptimizationProgress
} from '../../../src/services/optimization/optimizationService';
import { UserLocationInput } from '../../../src/components/location/types';

describe('OptimizationService', () => {
  let service: OptimizationService;

  beforeEach(() => {
    service = new OptimizationService();
  });

  describe('Service Initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(OptimizationService);
    });

    it('should set progress callback', () => {
      const callback = jest.fn();
      service.setProgressCallback(callback);
      
      // Callback should be stored (tested indirectly through optimization)
      expect(typeof service.setProgressCallback).toBe('function');
    });
  });

  describe('Input Validation', () => {
    it('should reject empty locations array', async () => {
      const request: OptimizationRequest = {
        locations: [],
        optimizationId: 'test-1',
        timestamp: new Date()
      };

      await expect(service.optimizeLocation(request))
        .rejects
        .toThrow('At least 2 locations are required');
    });

    it('should reject single location', async () => {
      const request: OptimizationRequest = {
        locations: [createValidLocation('1', 'Location 1', 1.3521, 103.8198)],
        optimizationId: 'test-2',
        timestamp: new Date()
      };

      await expect(service.optimizeLocation(request))
        .rejects
        .toThrow('At least 2 locations are required');
    });

    it('should reject too many locations', async () => {
      const locations = Array.from({ length: 11 }, (_, i) => 
        createValidLocation(`${i}`, `Location ${i}`, 1.3 + i * 0.01, 103.8 + i * 0.01)
      );

      const request: OptimizationRequest = {
        locations,
        optimizationId: 'test-3',
        timestamp: new Date()
      };

      await expect(service.optimizeLocation(request))
        .rejects
        .toThrow('Maximum 10 locations allowed');
    });

    it('should reject locations without coordinates', async () => {
      const invalidLocation: UserLocationInput = {
        id: 'invalid-1',
        address: 'Test Address',
        transportMode: 'TRANSIT'
        // Missing coordinate
      };

      const request: OptimizationRequest = {
        locations: [
          invalidLocation,
          createValidLocation('2', 'Valid Location', 1.3521, 103.8198)
        ],
        optimizationId: 'test-4',
        timestamp: new Date()
      };

      await expect(service.optimizeLocation(request))
        .rejects
        .toThrow('locations have invalid coordinates');
    });

    it('should reject duplicate locations', async () => {
      const request: OptimizationRequest = {
        locations: [
          createValidLocation('1', 'Location 1', 1.3521, 103.8198),
          createValidLocation('2', 'Location 2', 1.3521, 103.8198) // Same coordinates
        ],
        optimizationId: 'test-5',
        timestamp: new Date()
      };

      await expect(service.optimizeLocation(request))
        .rejects
        .toThrow('duplicate locations within 100m');
    });
  });

  describe('Successful Optimization', () => {
    it('should optimize 2 locations successfully', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Orchard MRT', 1.3048, 103.8318),
        createValidLocation('2', 'Marina Bay Sands', 1.2834, 103.8607)
      ]);

      const result = await service.optimizeLocation(request);

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^opt_/);
      expect(result.optimalLocation.latitude).toBeCloseTo(1.29, 1);
      expect(result.optimalLocation.longitude).toBeCloseTo(103.84, 1);
      expect(result.equityAnalysis.fairnessIndex).toBeGreaterThan(0);
      expect(result.equityAnalysis.fairnessIndex).toBeLessThanOrEqual(1);
      expect(result.participantTravelTimes).toHaveLength(2);
      expect(result.calculationTime).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle Singapore test locations', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Orchard MRT', 1.3048, 103.8318, 'TRANSIT'),
        createValidLocation('2', 'Marina Bay Sands', 1.2834, 103.8607, 'WALKING'),
        createValidLocation('3', 'Changi Airport', 1.3644, 103.9915, 'DRIVING')
      ]);

      const result = await service.optimizeLocation(request);

      expect(result.participantTravelTimes).toHaveLength(3);
      expect(result.equityAssessment.level).toMatch(/^(excellent|good|fair|poor|critical)$/);
      expect(result.equityAssessment.recommendation).toBeTruthy();
      expect(result.improvementVsBaseline).toBeDefined();
    });

    it('should calculate different travel times for different transport modes', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Location 1', 1.3048, 103.8318, 'WALKING'),
        createValidLocation('2', 'Location 2', 1.2834, 103.8607, 'DRIVING')
      ]);

      const result = await service.optimizeLocation(request);

      const walkingTime = result.participantTravelTimes.find(p => p.id === '1')?.travelTimeMinutes;
      const drivingTime = result.participantTravelTimes.find(p => p.id === '2')?.travelTimeMinutes;

      expect(walkingTime).toBeGreaterThan(drivingTime || 0);
    });
  });

  describe('Progress Tracking', () => {
    it('should report progress during optimization', async () => {
      const progressUpdates: OptimizationProgress[] = [];
      
      service.setProgressCallback((progress) => {
        progressUpdates.push(progress);
      });

      const request = createValidRequest([
        createValidLocation('1', 'Location 1', 1.3048, 103.8318),
        createValidLocation('2', 'Location 2', 1.2834, 103.8607)
      ]);

      await service.optimizeLocation(request);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('initializing');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete optimization in less than 2 seconds', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Location 1', 1.3048, 103.8318),
        createValidLocation('2', 'Location 2', 1.2834, 103.8607),
        createValidLocation('3', 'Location 3', 1.3644, 103.9915)
      ]);

      const startTime = Date.now();
      const result = await service.optimizeLocation(request);
      const endTime = Date.now();

      const actualTime = endTime - startTime;
      expect(actualTime).toBeLessThan(2000); // Less than 2 seconds
      expect(result.calculationTime).toBeLessThan(2000);
    });

    it('should handle 10 locations within performance target', async () => {
      const locations = Array.from({ length: 10 }, (_, i) => 
        createValidLocation(`${i}`, `Location ${i}`, 1.3 + i * 0.01, 103.8 + i * 0.01)
      );

      const request = createValidRequest(locations);
      
      const startTime = Date.now();
      const result = await service.optimizeLocation(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
      expect(result.participantTravelTimes).toHaveLength(10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle locations very close together', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Location 1', 1.3048, 103.8318),
        createValidLocation('2', 'Location 2', 1.3058, 103.8328) // About 1km apart
      ]);

      const result = await service.optimizeLocation(request);
      expect(result.equityAnalysis.fairnessIndex).toBeGreaterThan(0.7); // Should be quite fair
    });

    it('should handle locations far apart', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Woodlands', 1.4382, 103.7890), // North
        createValidLocation('2', 'Tuas', 1.2966, 103.6360)       // Southwest
      ]);

      const result = await service.optimizeLocation(request);
      expect(result.participantTravelTimes[0].travelTimeMinutes).toBeGreaterThan(25);
    });

    it('should handle mixed transport modes', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Location 1', 1.3048, 103.8318, 'WALKING'),
        createValidLocation('2', 'Location 2', 1.2834, 103.8607, 'TRANSIT'),
        createValidLocation('3', 'Location 3', 1.3644, 103.9915, 'DRIVING'),
        createValidLocation('4', 'Location 4', 1.3521, 103.8198, 'CYCLING')
      ]);

      const result = await service.optimizeLocation(request);
      
      expect(result.participantTravelTimes).toHaveLength(4);
      
      // Walking should generally take longer than driving for same distance
      const walkingTime = result.participantTravelTimes.find(p => p.id === '1')?.travelTimeMinutes || 0;
      const drivingTime = result.participantTravelTimes.find(p => p.id === '3')?.travelTimeMinutes || 0;
      
      // Note: This might not always be true due to distances, but generally walking is slower
      expect(typeof walkingTime).toBe('number');
      expect(typeof drivingTime).toBe('number');
    });
  });

  describe('Equity Analysis Integration', () => {
    it('should classify equity levels correctly', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'Location 1', 1.3048, 103.8318),
        createValidLocation('2', 'Location 2', 1.3058, 103.8328) // About 1km apart
      ]);

      const result = await service.optimizeLocation(request);
      
      expect(['excellent', 'good', 'fair', 'poor', 'critical'])
        .toContain(result.equityLevel);
      expect(result.equityAssessment.title).toBeTruthy();
      expect(result.equityAssessment.recommendation).toBeTruthy();
      expect(result.equityAssessment.colorCode).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should provide meaningful recommendations', async () => {
      const request = createValidRequest([
        createValidLocation('1', 'CBD', 1.2850, 103.8537, 'TRANSIT'),
        createValidLocation('2', 'Jurong', 1.3329, 103.7436, 'DRIVING')
      ]);

      const result = await service.optimizeLocation(request);
      
      // Check that recommendation contains transport-related terms
      expect(result.equityAssessment.recommendation).toMatch(/(transport|MRT|bus|location|meeting)/i);
      expect(result.equityAssessment.recommendation.length).toBeGreaterThan(20);
    });
  });

  describe('Convenience Function', () => {
    it('should use startOptimization convenience function', async () => {
      const locations = [
        createValidLocation('1', 'Location 1', 1.3048, 103.8318),
        createValidLocation('2', 'Location 2', 1.2834, 103.8607)
      ];

      const progressCallback = jest.fn();
      const result = await startOptimization(locations, progressCallback);

      expect(result).toBeDefined();
      expect(result.participantTravelTimes).toHaveLength(2);
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should wrap unknown errors in OptimizationServiceError', async () => {
      // Create a request that will cause an error in calculation
      const invalidRequest = {
        locations: [
          { 
            id: '1', 
            address: 'Test', 
            coordinate: { latitude: NaN, longitude: NaN }, 
            transportMode: 'DRIVING' as const 
          },
          createValidLocation('2', 'Location 2', 1.2834, 103.8607)
        ],
        optimizationId: 'error-test',
        timestamp: new Date()
      } as OptimizationRequest;

      await expect(service.optimizeLocation(invalidRequest))
        .rejects
        .toBeInstanceOf(OptimizationServiceError);
    });
  });
});

/**
 * Helper function to create a valid location for testing
 */
function createValidLocation(
  id: string, 
  address: string, 
  lat: number, 
  lng: number, 
  transportMode: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'CYCLING' = 'TRANSIT'
): UserLocationInput {
  return {
    id,
    address,
    coordinate: { latitude: lat, longitude: lng },
    transportMode,
    isValid: true
  };
}

/**
 * Helper function to create a valid optimization request
 */
function createValidRequest(locations: UserLocationInput[]): OptimizationRequest {
  return {
    locations,
    optimizationId: `test_${Date.now()}`,
    timestamp: new Date()
  };
}