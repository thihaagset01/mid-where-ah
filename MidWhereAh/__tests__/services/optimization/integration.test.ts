/**
 * Integration test for the complete LocationInput → Optimization → Results flow
 * Tests the entire user journey with real Jain's Fairness Index calculations
 */

import { startOptimization, OptimizationProgress } from '../../../src/services/optimization';
import { UserLocationInput } from '../../../src/components/location/types';

describe('MidWhereAh Integration Test: LocationInput → Optimization → Results', () => {
  
  describe('Complete User Journey', () => {
    it('should complete full optimization flow with Singapore test data', async () => {
      console.log('🚀 Starting MidWhereAh integration test...');
      
      // Step 1: Simulate user input from LocationInput component
      const userLocations: UserLocationInput[] = [
        {
          id: 'orchard',
          address: 'Orchard MRT Station, Singapore',
          coordinate: { latitude: 1.3048, longitude: 103.8318 },
          transportMode: 'TRANSIT',
          isValid: true
        },
        {
          id: 'marina',
          address: 'Marina Bay Sands, Singapore',
          coordinate: { latitude: 1.2834, longitude: 103.8607 },
          transportMode: 'WALKING',
          isValid: true
        },
        {
          id: 'changi',
          address: 'Changi Airport Terminal 3, Singapore',
          coordinate: { latitude: 1.3644, longitude: 103.9915 },
          transportMode: 'DRIVING',
          isValid: true
        }
      ];

      console.log(`📍 Testing with ${userLocations.length} locations across Singapore`);

      // Step 2: Track optimization progress
      const progressUpdates: OptimizationProgress[] = [];
      const onProgress = (progress: OptimizationProgress) => {
        progressUpdates.push(progress);
        console.log(`📊 ${progress.stage}: ${progress.progress}% - ${progress.message}`);
      };

      // Step 3: Start optimization (simulates OptimizationScreen behavior)
      const startTime = Date.now();
      const result = await startOptimization(userLocations, onProgress);
      const endTime = Date.now();

      console.log(`⚡ Optimization completed in ${endTime - startTime}ms`);

      // Step 4: Verify optimization result (simulates ResultsScreen display)
      expect(result).toBeDefined();
      expect(result.id).toMatch(/^opt_/);
      
      // Verify location optimization
      expect(result.optimalLocation.latitude).toBeCloseTo(1.32, 1);
      expect(result.optimalLocation.longitude).toBeCloseTo(103.87, 1);
      expect(result.optimalLocation.address).toBeTruthy();
      
      // Verify equity analysis using Jain's Fairness Index
      expect(result.equityAnalysis.fairnessIndex).toBeGreaterThan(0);
      expect(result.equityAnalysis.fairnessIndex).toBeLessThanOrEqual(1);
      expect(result.equityAnalysis.sampleSize).toBe(3);
      expect(result.equityAnalysis.meanTravelTime).toBeGreaterThan(0);
      expect(result.equityAnalysis.standardDeviation).toBeGreaterThanOrEqual(0);
      
      // Verify equity level classification
      expect(['excellent', 'good', 'fair', 'poor', 'critical']).toContain(result.equityLevel);
      expect(result.equityAssessment.title).toBeTruthy();
      expect(result.equityAssessment.description).toBeTruthy();
      expect(result.equityAssessment.recommendation).toBeTruthy();
      expect(result.equityAssessment.colorCode).toMatch(/^#[0-9A-Fa-f]{6}$/);
      
      // Verify travel times for each participant
      expect(result.participantTravelTimes).toHaveLength(3);
      result.participantTravelTimes.forEach((participant, index) => {
        expect(participant.id).toBe(userLocations[index].id);
        expect(participant.travelTimeMinutes).toBeGreaterThan(0);
        expect(participant.locationName).toBeTruthy();
      });
      
      // Verify performance requirements
      expect(result.calculationTime).toBeLessThan(2000); // <2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
      
      // Verify progress tracking
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('initializing');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
      
      // Verify confidence and improvement metrics
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.improvementVsBaseline).toBe('number');
      
      console.log(`🎯 Optimal location: ${result.optimalLocation.latitude.toFixed(4)}, ${result.optimalLocation.longitude.toFixed(4)}`);
      console.log(`⚖️ Fairness index: ${result.equityAnalysis.fairnessIndex.toFixed(3)} (${result.equityLevel})`);
      console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`🚀 Improvement vs baseline: ${result.improvementVsBaseline.toFixed(1)}%`);
      console.log(`⏱️ Average travel time: ${result.equityAnalysis.meanTravelTime.toFixed(1)} minutes`);
      
      console.log('✅ Complete integration test passed successfully!');
    });

    it('should handle edge case: minimum 2 locations', async () => {
      const userLocations: UserLocationInput[] = [
        {
          id: 'loc1',
          address: 'Sentosa Island, Singapore',
          coordinate: { latitude: 1.2494, longitude: 103.8303 },
          transportMode: 'DRIVING',
          isValid: true
        },
        {
          id: 'loc2',
          address: 'Jurong East MRT Station, Singapore', 
          coordinate: { latitude: 1.3329, longitude: 103.7436 },
          transportMode: 'TRANSIT',
          isValid: true
        }
      ];

      const result = await startOptimization(userLocations);
      
      expect(result.participantTravelTimes).toHaveLength(2);
      expect(result.equityAnalysis.sampleSize).toBe(2);
      expect(result.calculationTime).toBeLessThan(2000);
    });

    it('should handle edge case: maximum 10 locations', async () => {
      const singaporeLocations: UserLocationInput[] = [
        { id: '1', address: 'Orchard', coordinate: { latitude: 1.3048, longitude: 103.8318 }, transportMode: 'TRANSIT', isValid: true },
        { id: '2', address: 'Marina Bay', coordinate: { latitude: 1.2834, longitude: 103.8607 }, transportMode: 'WALKING', isValid: true },
        { id: '3', address: 'Changi', coordinate: { latitude: 1.3644, longitude: 103.9915 }, transportMode: 'DRIVING', isValid: true },
        { id: '4', address: 'Jurong East', coordinate: { latitude: 1.3329, longitude: 103.7436 }, transportMode: 'TRANSIT', isValid: true },
        { id: '5', address: 'Woodlands', coordinate: { latitude: 1.4382, longitude: 103.7890 }, transportMode: 'TRANSIT', isValid: true },
        { id: '6', address: 'Tampines', coordinate: { latitude: 1.3496, longitude: 103.9568 }, transportMode: 'CYCLING', isValid: true },
        { id: '7', address: 'Bishan', coordinate: { latitude: 1.351, longitude: 103.8485 }, transportMode: 'TRANSIT', isValid: true },
        { id: '8', address: 'Clementi', coordinate: { latitude: 1.3162, longitude: 103.7648 }, transportMode: 'WALKING', isValid: true },
        { id: '9', address: 'Punggol', coordinate: { latitude: 1.4040, longitude: 103.9012 }, transportMode: 'CYCLING', isValid: true },
        { id: '10', address: 'Tuas', coordinate: { latitude: 1.2966, longitude: 103.6360 }, transportMode: 'DRIVING', isValid: true }
      ];

      const result = await startOptimization(singaporeLocations);
      
      expect(result.participantTravelTimes).toHaveLength(10);
      expect(result.equityAnalysis.sampleSize).toBe(10);
      expect(result.calculationTime).toBeLessThan(2000);
      
      // With 10 diverse locations, we expect some variation in travel times
      const travelTimes = result.participantTravelTimes.map(p => p.travelTimeMinutes);
      const maxTime = Math.max(...travelTimes);
      const minTime = Math.min(...travelTimes);
      expect(maxTime - minTime).toBeGreaterThan(5); // Should have some variation
    });

    it('should demonstrate real equity scoring with different scenarios', async () => {
      // Scenario 1: Clustered locations (should have excellent equity)
      const clusteredLocations: UserLocationInput[] = [
        { id: '1', address: 'Marina Bay', coordinate: { latitude: 1.2834, longitude: 103.8607 }, transportMode: 'WALKING', isValid: true },
        { id: '2', address: 'CBD Raffles', coordinate: { latitude: 1.2845, longitude: 103.8520 }, transportMode: 'WALKING', isValid: true },
        { id: '3', address: 'Boat Quay', coordinate: { latitude: 1.2864, longitude: 103.8494 }, transportMode: 'WALKING', isValid: true }
      ];

      const clusteredResult = await startOptimization(clusteredLocations);
      
      // Scenario 2: Spread out locations (may have poorer equity)
      const spreadLocations: UserLocationInput[] = [
        { id: '1', address: 'Changi Airport', coordinate: { latitude: 1.3644, longitude: 103.9915 }, transportMode: 'DRIVING', isValid: true },
        { id: '2', address: 'Jurong West', coordinate: { latitude: 1.3404, longitude: 103.7090 }, transportMode: 'TRANSIT', isValid: true },
        { id: '3', address: 'Woodlands', coordinate: { latitude: 1.4382, longitude: 103.7890 }, transportMode: 'TRANSIT', isValid: true }
      ];

      const spreadResult = await startOptimization(spreadLocations);
      
      // Clustered locations should generally have better equity
      console.log(`Clustered equity: ${clusteredResult.equityAnalysis.fairnessIndex.toFixed(3)} (${clusteredResult.equityLevel})`);
      console.log(`Spread equity: ${spreadResult.equityAnalysis.fairnessIndex.toFixed(3)} (${spreadResult.equityLevel})`);
      
      // Both should be valid equity calculations
      expect(clusteredResult.equityAnalysis.fairnessIndex).toBeGreaterThan(0);
      expect(spreadResult.equityAnalysis.fairnessIndex).toBeGreaterThan(0);
      
      // Recommendations should be context-appropriate
      expect(clusteredResult.equityAssessment.recommendation).toBeTruthy();
      expect(spreadResult.equityAssessment.recommendation).toBeTruthy();
    });
  });

  describe('Error Handling in Complete Flow', () => {
    it('should gracefully handle invalid location data', async () => {
      const invalidLocations: UserLocationInput[] = [
        {
          id: 'invalid1',
          address: 'Invalid Location 1',
          transportMode: 'TRANSIT'
          // Missing coordinate - should trigger validation error
        },
        {
          id: 'invalid2',
          address: 'Invalid Location 2',
          transportMode: 'WALKING'
          // Missing coordinate - should trigger validation error
        }
      ];

      await expect(startOptimization(invalidLocations))
        .rejects
        .toThrow('locations have invalid coordinates');
    });

    it('should handle insufficient locations', async () => {
      const singleLocation: UserLocationInput[] = [
        {
          id: 'single',
          address: 'Single Location',
          coordinate: { latitude: 1.3048, longitude: 103.8318 },
          transportMode: 'TRANSIT',
          isValid: true
        }
      ];

      await expect(startOptimization(singleLocation))
        .rejects
        .toThrow('At least 2 locations are required');
    });
  });

  describe('Transport Mode Integration', () => {
    it('should correctly factor Singapore transport modes', async () => {
      const sameLocationDifferentModes: UserLocationInput[] = [
        {
          id: 'walking',
          address: 'Orchard Road',
          coordinate: { latitude: 1.3048, longitude: 103.8318 },
          transportMode: 'WALKING',
          isValid: true
        },
        {
          id: 'driving',
          address: 'Marina Bay',
          coordinate: { latitude: 1.2834, longitude: 103.8607 },
          transportMode: 'DRIVING', 
          isValid: true
        }
      ];

      const result = await startOptimization(sameLocationDifferentModes);
      
      const walkingTime = result.participantTravelTimes.find(p => p.id === 'walking')?.travelTimeMinutes;
      const drivingTime = result.participantTravelTimes.find(p => p.id === 'driving')?.travelTimeMinutes;
      
      // Walking should take longer for the same distance due to Singapore factors
      expect(walkingTime).toBeGreaterThan(drivingTime || 0);
      
      console.log(`Walking time: ${walkingTime?.toFixed(1)} min, Driving time: ${drivingTime?.toFixed(1)} min`);
    });
  });
});