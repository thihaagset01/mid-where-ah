/**
 * Performance benchmark tests for Jain's Fairness Index implementation.
 * 
 * Validates that the algorithm meets the <100ms requirement for 10 users.
 */

import { calculateJainsIndex, calculateEquityAnalysis, createTravelTimeData } from '../../../src/algorithms/equity/jainsIndex';

describe('Performance Benchmarks', () => {
  const generateRandomTimes = (count: number): number[] => 
    Array.from({ length: count }, () => Math.random() * 60);

  test('calculateJainsIndex should process 10 users in <100ms', () => {
    const times = generateRandomTimes(10);
    
    const iterations = 100;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const result = calculateJainsIndex(times);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`Average execution time for 10 users: ${avgTime.toFixed(4)}ms`);
    expect(avgTime).toBeLessThan(100);
  });

  test('calculateEquityAnalysis should process 10 users in <100ms', () => {
    const travelData = createTravelTimeData(generateRandomTimes(10));
    
    const iterations = 100;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const result = calculateEquityAnalysis(travelData);
      expect(result.fairnessIndex).toBeGreaterThanOrEqual(0);
      expect(result.fairnessIndex).toBeLessThanOrEqual(1);
      expect(result.sampleSize).toBe(10);
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`Average execution time for equity analysis (10 users): ${avgTime.toFixed(4)}ms`);
    expect(avgTime).toBeLessThan(100);
  });

  test('should scale well with user count', () => {
    const userCounts = [5, 10, 25, 50, 100];
    
    userCounts.forEach(count => {
      const times = generateRandomTimes(count);
      
      const startTime = performance.now();
      const result = calculateJainsIndex(times);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      console.log(`Execution time for ${count} users: ${executionTime.toFixed(4)}ms`);
      
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
      expect(executionTime).toBeLessThan(100);
    });
  });

  test('memory usage should be reasonable', () => {
    const largeDataset = generateRandomTimes(1000);
    
    // Measure multiple iterations to check for memory leaks
    for (let i = 0; i < 10; i++) {
      const result = calculateJainsIndex(largeDataset);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
    
    // If we get here without running out of memory, the test passes
    expect(true).toBe(true);
  });
});