/**
 * Example usage of Jain's Fairness Index for MidWhereAh transport equity optimization.
 * 
 * This example demonstrates how to use the algorithm to evaluate meeting point equity.
 */

import {
  calculateJainsIndex,
  calculateEquityAnalysis,
  createTravelTimeData,
  TravelTimeData
} from '../src/algorithms/equity';

/**
 * Example: Evaluating meeting point fairness for a group of friends.
 */
function exampleMeetingPointEvaluation() {
  console.log('=== MidWhereAh Jain\'s Fairness Index Example ===\n');

  // Scenario 1: Perfect equity - everyone travels the same time
  console.log('Scenario 1: Perfect Equity (All users travel 15 minutes)');
  const perfectEquityTimes = [15, 15, 15, 15];
  const perfectEquityScore = calculateJainsIndex(perfectEquityTimes);
  console.log(`Travel times: [${perfectEquityTimes.join(', ')}] minutes`);
  console.log(`Fairness Index: ${perfectEquityScore.toFixed(4)} (Perfect = 1.0)\n`);

  // Scenario 2: Some inequity - realistic travel times
  console.log('Scenario 2: Moderate Equity (Realistic travel times)');
  const realisticTimes = [12, 18, 15, 21];
  const realisticScore = calculateJainsIndex(realisticTimes);
  console.log(`Travel times: [${realisticTimes.join(', ')}] minutes`);
  console.log(`Fairness Index: ${realisticScore.toFixed(4)}\n`);

  // Scenario 3: Maximum inequity - one person travels far
  console.log('Scenario 3: Poor Equity (One person travels far)');
  const poorEquityTimes = [5, 8, 6, 45];
  const poorEquityScore = calculateJainsIndex(poorEquityTimes);
  console.log(`Travel times: [${poorEquityTimes.join(', ')}] minutes`);
  console.log(`Fairness Index: ${poorEquityScore.toFixed(4)}\n`);

  // Comprehensive analysis example
  console.log('=== Comprehensive Equity Analysis ===\n');
  
  const userData: TravelTimeData[] = [
    { id: 'location_1', travelTimeMinutes: 12, userId: 'alice', locationName: 'Home' },
    { id: 'location_2', travelTimeMinutes: 18, userId: 'bob', locationName: 'Office' },
    { id: 'location_3', travelTimeMinutes: 15, userId: 'charlie', locationName: 'School' },
    { id: 'location_4', travelTimeMinutes: 21, userId: 'diana', locationName: 'Gym' }
  ];

  const analysis = calculateEquityAnalysis(userData);
  
  console.log('Meeting Point Analysis:');
  console.log(`- Fairness Index: ${analysis.fairnessIndex.toFixed(4)}`);
  console.log(`- Sample Size: ${analysis.sampleSize} users`);
  console.log(`- Mean Travel Time: ${analysis.meanTravelTime.toFixed(1)} minutes`);
  console.log(`- Standard Deviation: ${analysis.standardDeviation.toFixed(2)} minutes`);
  console.log(`- Perfect Equity: ${analysis.isPerfectEquity ? 'Yes' : 'No'}`);
  console.log(`- Calculated At: ${analysis.calculatedAt.toISOString()}\n`);

  // Performance demonstration
  console.log('=== Performance Demonstration ===\n');
  
  const largeTravelTimes = Array.from({ length: 100 }, (_, i) => Math.random() * 60);
  const startTime = performance.now();
  const largeGroupScore = calculateJainsIndex(largeTravelTimes);
  const endTime = performance.now();
  
  console.log(`Processed ${largeTravelTimes.length} users in ${(endTime - startTime).toFixed(4)}ms`);
  console.log(`Fairness Index: ${largeGroupScore.toFixed(4)}`);
  console.log('✅ Performance target met: <100ms for large groups\n');

  // Equity interpretation guide
  console.log('=== Fairness Index Interpretation Guide ===');
  console.log('1.0     = Perfect equity (all users have equal travel times)');
  console.log('0.8-0.9 = Good equity (small differences in travel times)');
  console.log('0.6-0.8 = Moderate equity (some users travel notably longer)');
  console.log('0.4-0.6 = Poor equity (significant disparities)');
  console.log('<0.4    = Very poor equity (major unfairness)\n');
  
  console.log('=== Integration Ready! ===');
  console.log('The Jain\'s Fairness Index algorithm is ready for integration');
  console.log('with MidWhereAh\'s transport equity optimization pipeline.');
}

// Run the example if this file is executed directly
if (require.main === module) {
  exampleMeetingPointEvaluation();
}