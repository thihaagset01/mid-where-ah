/**
 * Test that runs the example to ensure it works correctly.
 */

import {
  calculateJainsIndex,
  calculateEquityAnalysis,
  createTravelTimeData,
  TravelTimeData
} from '../../src/algorithms/equity';

describe('Example Integration Test', () => {
  test('should demonstrate example usage scenarios', () => {
    // Scenario 1: Perfect equity
    const perfectEquityTimes = [15, 15, 15, 15];
    const perfectEquityScore = calculateJainsIndex(perfectEquityTimes);
    expect(perfectEquityScore).toBe(1.0);

    // Scenario 2: Moderate equity
    const realisticTimes = [12, 18, 15, 21];
    const realisticScore = calculateJainsIndex(realisticTimes);
    expect(realisticScore).toBeGreaterThan(0.8);
    expect(realisticScore).toBeLessThan(1.0);

    // Scenario 3: Poor equity
    const poorEquityTimes = [5, 8, 6, 45];
    const poorEquityScore = calculateJainsIndex(poorEquityTimes);
    expect(poorEquityScore).toBeLessThan(0.6);

    // Comprehensive analysis
    const userData: TravelTimeData[] = [
      { id: 'location_1', travelTimeMinutes: 12, userId: 'alice', locationName: 'Home' },
      { id: 'location_2', travelTimeMinutes: 18, userId: 'bob', locationName: 'Office' },
      { id: 'location_3', travelTimeMinutes: 15, userId: 'charlie', locationName: 'School' },
      { id: 'location_4', travelTimeMinutes: 21, userId: 'diana', locationName: 'Gym' }
    ];

    const analysis = calculateEquityAnalysis(userData);
    expect(analysis.fairnessIndex).toBeGreaterThan(0);
    expect(analysis.fairnessIndex).toBeLessThanOrEqual(1);
    expect(analysis.sampleSize).toBe(4);
    expect(analysis.meanTravelTime).toBe(16.5);
    expect(analysis.isPerfectEquity).toBe(false);

    // Performance test
    const largeTravelTimes = Array.from({ length: 100 }, (_, i) => Math.random() * 60);
    const startTime = performance.now();
    const largeGroupScore = calculateJainsIndex(largeTravelTimes);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    expect(executionTime).toBeLessThan(100);
    expect(largeGroupScore).toBeGreaterThan(0);
    expect(largeGroupScore).toBeLessThanOrEqual(1);

    console.log('✅ All example scenarios work correctly!');
    console.log(`Perfect equity score: ${perfectEquityScore}`);
    console.log(`Realistic scenario score: ${realisticScore.toFixed(4)}`);
    console.log(`Poor equity score: ${poorEquityScore.toFixed(4)}`);
    console.log(`Large group processed in: ${executionTime.toFixed(4)}ms`);
  });
});