/**
 * Unit tests for Jain's Fairness Index implementation.
 * 
 * Tests cover:
 * - Core algorithm correctness
 * - Edge cases and error handling
 * - Performance requirements
 * - TypeScript interface compliance
 */

import {
  calculateJainsIndex,
  calculateEquityAnalysis,
  createTravelTimeData,
  JainsFairnessIndexError,
  TravelTimeData,
  EquityResult
} from '../../../src/algorithms/equity/jainsIndex';

describe('calculateJainsIndex', () => {
  describe('Core Algorithm Tests', () => {
    test('should return 1.0 for perfect equity (all equal times)', () => {
      expect(calculateJainsIndex([10, 10, 10, 10])).toBe(1.0);
      expect(calculateJainsIndex([5, 5, 5])).toBe(1.0);
      expect(calculateJainsIndex([0, 0, 0, 0])).toBe(1.0);
    });

    test('should return 1.0 for single user (always fair)', () => {
      expect(calculateJainsIndex([15])).toBe(1.0);
      expect(calculateJainsIndex([0])).toBe(1.0);
      expect(calculateJainsIndex([100])).toBe(1.0);
    });

    test('should calculate correct fairness for mixed times', () => {
      // Test case: [5, 10, 15, 20]
      // Sum = 50, SumOfSquares = 25 + 100 + 225 + 400 = 750
      // Jain's Index = 50² / (4 × 750) = 2500 / 3000 = 0.8333...
      const result = calculateJainsIndex([5, 10, 15, 20]);
      expect(result).toBeCloseTo(0.8333, 4);
    });

    test('should return 1/n for maximum inequity (one person travels)', () => {
      // Case: [0, 0, 0, 60] - only one person travels
      // Expected: 1/4 = 0.25
      expect(calculateJainsIndex([0, 0, 0, 60])).toBe(0.25);
      
      // Case: [0, 0, 30] - only one person travels
      // Expected: 1/3 ≈ 0.3333
      expect(calculateJainsIndex([0, 0, 30])).toBeCloseTo(0.3333, 4);
    });

    test('should handle two-person scenarios', () => {
      // Equal times
      expect(calculateJainsIndex([10, 10])).toBe(1.0);
      
      // Different times: [5, 15]
      // Sum = 20, SumOfSquares = 25 + 225 = 250
      // Jain's Index = 400 / (2 × 250) = 400 / 500 = 0.8
      expect(calculateJainsIndex([5, 15])).toBe(0.8);
    });

    test('should maintain mathematical properties', () => {
      const times = [1, 4, 9, 16];
      const result = calculateJainsIndex(times);
      
      // Result should be between 0 and 1
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
      
      // For this specific case: Sum = 30, SumOfSquares = 1 + 16 + 81 + 256 = 354
      // Jain's Index = 900 / (4 × 354) = 900 / 1416 ≈ 0.6356
      expect(result).toBeCloseTo(0.6356, 4);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should throw error for empty array', () => {
      expect(() => calculateJainsIndex([])).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex([])).toThrow('Travel times array cannot be empty');
    });

    test('should throw error for non-array input', () => {
      expect(() => calculateJainsIndex(null as any)).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex(undefined as any)).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex('invalid' as any)).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex(123 as any)).toThrow(JainsFairnessIndexError);
    });

    test('should throw error for negative travel times', () => {
      expect(() => calculateJainsIndex([10, -5, 15])).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex([-1])).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex([0, 10, -0.1])).toThrow(JainsFairnessIndexError);
    });

    test('should throw error for invalid number types', () => {
      expect(() => calculateJainsIndex([10, NaN, 15])).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex([10, Infinity, 15])).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex([10, 'string' as any, 15])).toThrow(JainsFairnessIndexError);
      expect(() => calculateJainsIndex([10, null as any, 15])).toThrow(JainsFairnessIndexError);
    });

    test('should handle very small numbers', () => {
      const result = calculateJainsIndex([0.001, 0.002, 0.003]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    test('should handle very large numbers', () => {
      const result = calculateJainsIndex([1000000, 2000000, 3000000]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('Floating Point Precision', () => {
    test('should handle floating point precision correctly', () => {
      // Test with numbers that might cause precision issues
      const result = calculateJainsIndex([0.1, 0.2, 0.3]);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    test('should clamp results to valid range [0, 1]', () => {
      // Even with potential floating point errors, result should be in valid range
      const times = Array(100).fill(10); // Perfect equity with many users
      const result = calculateJainsIndex(times);
      expect(result).toBe(1.0);
    });
  });
});

describe('calculateEquityAnalysis', () => {
  const createTestData = (times: number[]): TravelTimeData[] => 
    times.map((time, index) => ({
      id: `user_${index}`,
      travelTimeMinutes: time,
      userId: `user_${index}`
    }));

  test('should return complete equity analysis', () => {
    const testData = createTestData([10, 15, 20]);
    const result = calculateEquityAnalysis(testData);

    expect(result).toMatchObject({
      fairnessIndex: expect.any(Number),
      sampleSize: 3,
      meanTravelTime: 15,
      standardDeviation: expect.any(Number),
      isPerfectEquity: false,
      calculatedAt: expect.any(Date)
    });

    expect(result.fairnessIndex).toBeGreaterThan(0);
    expect(result.fairnessIndex).toBeLessThanOrEqual(1);
  });

  test('should detect perfect equity', () => {
    const testData = createTestData([10, 10, 10, 10]);
    const result = calculateEquityAnalysis(testData);

    expect(result.fairnessIndex).toBe(1.0);
    expect(result.isPerfectEquity).toBe(true);
    expect(result.meanTravelTime).toBe(10);
    expect(result.standardDeviation).toBe(0);
  });

  test('should calculate statistics correctly', () => {
    const testData = createTestData([0, 10, 20]);
    const result = calculateEquityAnalysis(testData);

    expect(result.sampleSize).toBe(3);
    expect(result.meanTravelTime).toBe(10);
    
    // Standard deviation for [0, 10, 20] with mean 10
    // Variance = ((0-10)² + (10-10)² + (20-10)²) / 3 = (100 + 0 + 100) / 3 = 66.67
    // Standard deviation = √66.67 ≈ 8.165
    expect(result.standardDeviation).toBeCloseTo(8.165, 2);
  });

  test('should validate input data structure', () => {
    expect(() => calculateEquityAnalysis([])).toThrow(JainsFairnessIndexError);
    expect(() => calculateEquityAnalysis(null as any)).toThrow(JainsFairnessIndexError);
    
    const invalidData = [
      { id: '', travelTimeMinutes: 10 }, // Invalid id
      { id: 'valid', travelTimeMinutes: -5 }, // Negative time
      { id: 'valid2' } as any // Missing travelTimeMinutes
    ];
    
    expect(() => calculateEquityAnalysis(invalidData)).toThrow(JainsFairnessIndexError);
  });

  test('should include timestamp in results', () => {
    const testData = createTestData([5, 10, 15]);
    const beforeTime = new Date();
    const result = calculateEquityAnalysis(testData);
    const afterTime = new Date();

    expect(result.calculatedAt).toBeInstanceOf(Date);
    expect(result.calculatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(result.calculatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });
});

describe('createTravelTimeData', () => {
  test('should create valid TravelTimeData objects', () => {
    const times = [10, 15, 20];
    const userIds = ['user1', 'user2', 'user3'];
    const result = createTravelTimeData(times, userIds);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 'travel_0',
      travelTimeMinutes: 10,
      userId: 'user1'
    });
    expect(result[2]).toMatchObject({
      id: 'travel_2',
      travelTimeMinutes: 20,
      userId: 'user3'
    });
  });

  test('should auto-generate user IDs when not provided', () => {
    const times = [5, 10];
    const result = createTravelTimeData(times);

    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('user_0');
    expect(result[1].userId).toBe('user_1');
  });

  test('should validate input arrays', () => {
    expect(() => createTravelTimeData(null as any)).toThrow(JainsFairnessIndexError);
    expect(() => createTravelTimeData([1, 2], ['user1'])).toThrow(JainsFairnessIndexError);
  });
});

describe('Performance Tests', () => {
  test('should calculate fairness index for 10 users in under 100ms', () => {
    const times = Array.from({ length: 10 }, (_, i) => Math.random() * 60);
    
    const startTime = performance.now();
    const result = calculateJainsIndex(times);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(100); // Should be much faster than 100ms
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('should handle large datasets efficiently', () => {
    const times = Array.from({ length: 1000 }, (_, i) => i + 1);
    
    const startTime = performance.now();
    const result = calculateJainsIndex(times);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(100);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  test('should perform equity analysis for 10 users efficiently', () => {
    const testData = Array.from({ length: 10 }, (_, i) => ({
      id: `user_${i}`,
      travelTimeMinutes: Math.random() * 60,
      userId: `user_${i}`
    }));
    
    const startTime = performance.now();
    const result = calculateEquityAnalysis(testData);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(100);
    expect(result.fairnessIndex).toBeGreaterThan(0);
    expect(result.fairnessIndex).toBeLessThanOrEqual(1);
    expect(result.sampleSize).toBe(10);
  });
});

describe('TypeScript Interface Compliance', () => {
  test('TravelTimeData interface should be properly typed', () => {
    const validData: TravelTimeData = {
      id: 'test_id',
      travelTimeMinutes: 15.5,
      userId: 'user123',
      locationName: 'Central Station'
    };

    const minimalData: TravelTimeData = {
      id: 'minimal',
      travelTimeMinutes: 10
    };

    expect(validData.id).toBe('test_id');
    expect(validData.travelTimeMinutes).toBe(15.5);
    expect(minimalData.userId).toBeUndefined();
    expect(minimalData.locationName).toBeUndefined();
  });

  test('EquityResult interface should be properly typed', () => {
    const testData = createTravelTimeData([10, 15, 20]);
    const result: EquityResult = calculateEquityAnalysis(testData);

    // TypeScript should enforce these properties exist
    expect(typeof result.fairnessIndex).toBe('number');
    expect(typeof result.sampleSize).toBe('number');
    expect(typeof result.meanTravelTime).toBe('number');
    expect(typeof result.standardDeviation).toBe('number');
    expect(typeof result.isPerfectEquity).toBe('boolean');
    expect(result.calculatedAt).toBeInstanceOf(Date);
  });
});

describe('Mathematical Edge Cases', () => {
  test('should handle rounding edge cases correctly', () => {
    // Test with values that might cause rounding issues
    const result1 = calculateJainsIndex([1/3, 1/3, 1/3]);
    expect(result1).toBeCloseTo(1.0, 10);

    const result2 = calculateJainsIndex([0.1, 0.1, 0.1, 0.1, 0.1]);
    expect(result2).toBeCloseTo(1.0, 10);
  });

  test('should maintain consistency with mathematical formula', () => {
    const times = [2, 4, 6, 8];
    const n = times.length;
    const sum = times.reduce((a, b) => a + b, 0); // 20
    const sumOfSquares = times.reduce((a, b) => a + b * b, 0); // 120
    const expectedJain = (sum * sum) / (n * sumOfSquares); // 400 / 480 = 0.8333...

    const result = calculateJainsIndex(times);
    expect(result).toBeCloseTo(expectedJain, 10);
  });
});