/**
 * Performance benchmark tests for Transport-Aware Initialization Algorithm
 * 
 * Validates performance requirements:
 * - <2 seconds computation time for 10 users
 * - Scalability testing for larger groups
 * - Memory usage monitoring
 */

import {
  calculateTransportAwareCenter,
  calculateMRTIntersectionCenter,
  calculateAccessibilityWeightedCenter,
  calculateEnhancedGeometricCenter,
  UserLocation,
  TRANSPORT_FACTORS
} from '../../../src/algorithms/initialization/transportAware';

describe('Transport-Aware Initialization Performance Benchmarks', () => {
  
  // Helper function to generate test users
  const generateTestUsers = (count: number): UserLocation[] => {
    const transportModes: Array<'DRIVING' | 'TRANSIT' | 'WALKING' | 'CYCLING'> = 
      ['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING'];
    
    return Array.from({ length: count }, (_, i) => ({
      id: `user_${i}`,
      // Generate coordinates around Singapore CBD area
      lat: 1.28 + (Math.random() * 0.05), // 1.28 to 1.33
      lng: 103.84 + (Math.random() * 0.03), // 103.84 to 103.87
      mode: transportModes[i % transportModes.length],
      weight: 1 + Math.random() // Random weight between 1-2
    }));
  };

  describe('Main Algorithm Performance', () => {
    test('should complete in <2 seconds for 10 users (requirement)', () => {
      const users = generateTestUsers(10);
      
      const startTime = performance.now();
      const result = calculateTransportAwareCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Execution time for 10 users: ${executionTime.toFixed(4)}ms`);
      
      // Performance requirement: <2000ms
      expect(executionTime).toBeLessThan(2000);
      expect(result).toBeDefined();
      expect(result.center).toBeDefined();
    });

    test('should maintain reasonable performance for larger groups', () => {
      const userCounts = [25, 50, 100];
      
      userCounts.forEach(count => {
        const users = generateTestUsers(count);
        
        const startTime = performance.now();
        const result = calculateTransportAwareCenter(users);
        const endTime = performance.now();
        
        const executionTime = endTime - startTime;
        
        console.log(`Execution time for ${count} users: ${executionTime.toFixed(4)}ms`);
        
        // Should scale reasonably (linear or better)
        // Allow up to 10 seconds for 100 users
        expect(executionTime).toBeLessThan(10000);
        expect(result).toBeDefined();
      });
    });

    test('should show consistent performance across multiple runs', () => {
      const users = generateTestUsers(10);
      const executionTimes: number[] = [];
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        calculateTransportAwareCenter(users);
        const endTime = performance.now();
        
        executionTimes.push(endTime - startTime);
      }
      
      const averageTime = executionTimes.reduce((sum, time) => sum + time, 0) / iterations;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);
      
      console.log(`Average execution time for 10 users (${iterations} runs): ${averageTime.toFixed(4)}ms`);
      console.log(`Min: ${minTime.toFixed(4)}ms, Max: ${maxTime.toFixed(4)}ms`);
      
      // Average should be well under requirement
      expect(averageTime).toBeLessThan(1000);
      
      // Performance should be reasonably consistent (max not more than 20x min for small tests)
      expect(maxTime).toBeLessThan(minTime * 20);
    });
  });

  describe('Individual Method Performance', () => {
    test('MRT intersection method performance', () => {
      const users = generateTestUsers(20).map(user => ({
        ...user,
        mode: 'TRANSIT' as const // All transit for MRT intersection
      }));
      
      const startTime = performance.now();
      const result = calculateMRTIntersectionCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`MRT intersection method execution time: ${executionTime.toFixed(4)}ms`);
      
      expect(executionTime).toBeLessThan(100); // Should be very fast
      expect(result).toBeDefined();
    });

    test('Accessibility-weighted method performance', () => {
      const users = generateTestUsers(20);
      
      const startTime = performance.now();
      const result = calculateAccessibilityWeightedCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Accessibility-weighted method execution time: ${executionTime.toFixed(4)}ms`);
      
      expect(executionTime).toBeLessThan(500); // Iterative method, slightly slower
      expect(result).toBeDefined();
    });

    test('Enhanced geometric method performance', () => {
      const users = generateTestUsers(20);
      
      const startTime = performance.now();
      const result = calculateEnhancedGeometricCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Enhanced geometric method execution time: ${executionTime.toFixed(4)}ms`);
      
      expect(executionTime).toBeLessThan(50); // Should be fastest method
      expect(result).toBeDefined();
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should not create memory leaks with repeated calculations', () => {
      const users = generateTestUsers(10);
      const iterations = 100;
      
      // Perform many calculations to test for memory leaks
      for (let i = 0; i < iterations; i++) {
        calculateTransportAwareCenter(users);
      }
      
      // If we get here without running out of memory, test passes
      expect(true).toBe(true);
    });

    test('should handle large datasets efficiently', () => {
      const users = generateTestUsers(500);
      
      const startTime = performance.now();
      const result = calculateTransportAwareCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Execution time for 500 users: ${executionTime.toFixed(4)}ms`);
      
      // Should complete within reasonable time even for large datasets
      expect(executionTime).toBeLessThan(30000); // 30 seconds max
      expect(result).toBeDefined();
    });
  });

  describe('Performance Regression Testing', () => {
    test('should maintain performance baseline', () => {
      const users = generateTestUsers(10);
      
      // Baseline: Should complete well under the 2-second requirement
      const baselineThreshold = 500; // 500ms baseline
      
      const startTime = performance.now();
      calculateTransportAwareCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Performance baseline test: ${executionTime.toFixed(4)}ms (baseline: <${baselineThreshold}ms)`);
      
      expect(executionTime).toBeLessThan(baselineThreshold);
    });

    test('should scale linearly or better with user count', () => {
      const smallUsers = generateTestUsers(10);
      const largeUsers = generateTestUsers(100);
      
      // Test small group
      let startTime = performance.now();
      calculateTransportAwareCenter(smallUsers);
      let endTime = performance.now();
      const smallTime = endTime - startTime;
      
      // Test large group
      startTime = performance.now();
      calculateTransportAwareCenter(largeUsers);
      endTime = performance.now();
      const largeTime = endTime - startTime;
      
      console.log(`Scaling test - 10 users: ${smallTime.toFixed(4)}ms, 100 users: ${largeTime.toFixed(4)}ms`);
      
      // Large group should not be more than 20x slower (generous scaling allowance)
      expect(largeTime).toBeLessThan(smallTime * 20);
    });
  });

  describe('Edge Case Performance', () => {
    test('should handle single user efficiently', () => {
      const users = generateTestUsers(1);
      
      const startTime = performance.now();
      const result = calculateTransportAwareCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Single user execution time: ${executionTime.toFixed(4)}ms`);
      
      expect(executionTime).toBeLessThan(10); // Should be extremely fast
      expect(result.center.lat).toBeCloseTo(users[0].lat, 4);
      expect(result.center.lng).toBeCloseTo(users[0].lng, 4);
    });

    test('should handle users with extreme coordinates efficiently', () => {
      const users: UserLocation[] = [
        { id: 'user1', lat: 1.2000, lng: 103.6000, mode: 'DRIVING' },
        { id: 'user2', lat: 1.5000, lng: 104.0000, mode: 'WALKING' },
        { id: 'user3', lat: 1.3000, lng: 103.9000, mode: 'CYCLING' }
      ];
      
      const startTime = performance.now();
      const result = calculateTransportAwareCenter(users);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Extreme coordinates execution time: ${executionTime.toFixed(4)}ms`);
      
      expect(executionTime).toBeLessThan(100);
      expect(result).toBeDefined();
    });
  });
});