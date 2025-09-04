/**
 * Performance benchmark tests for Equity Level Classification System.
 * 
 * Validates that all equity level operations meet the <10ms performance requirement.
 * Tests various scenarios including edge cases and large datasets.
 */

import {
  assessEquityLevel,
  classifyEquityLevel,
  calculateConfidence,
  createEquityContext,
  EquityContext
} from '../../../src/algorithms/equity/equityLevel';

import {
  calculateEquityAnalysis,
  createTravelTimeData,
  EquityResult
} from '../../../src/algorithms/equity/jainsIndex';

describe('Equity Level Performance Benchmarks', () => {
  const PERFORMANCE_TARGET_MS = 10; // Target: <10ms as specified
  const WARM_UP_RUNS = 5; // Warm up JIT compiler
  const BENCHMARK_RUNS = 100; // Number of runs for averaging

  const measurePerformance = (operation: () => void, warmUpRuns = WARM_UP_RUNS): number => {
    // Warm up
    for (let i = 0; i < warmUpRuns; i++) {
      operation();
    }

    // Measure
    const start = process.hrtime.bigint();
    operation();
    const end = process.hrtime.bigint();
    
    return Number(end - start) / 1_000_000; // Convert to milliseconds
  };

  const measureAveragePerformance = (operation: () => void, runs = BENCHMARK_RUNS): number => {
    const times: number[] = [];
    
    // Warm up
    for (let i = 0; i < WARM_UP_RUNS; i++) {
      operation();
    }

    // Measure multiple runs
    for (let i = 0; i < runs; i++) {
      const start = process.hrtime.bigint();
      operation();
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1_000_000);
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  };

  describe('Core Classification Performance', () => {
    test('classifyEquityLevel should execute in <10ms consistently', () => {
      const testCases = [0.95, 0.85, 0.75, 0.55, 0.35, 0.15];
      
      testCases.forEach(fairnessIndex => {
        const avgTime = measureAveragePerformance(() => {
          classifyEquityLevel(fairnessIndex);
        });
        
        expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
        console.log(`Classification for index ${fairnessIndex}: ${avgTime.toFixed(4)}ms`);
      });
    });

    test('classifyEquityLevel should handle boundary values efficiently', () => {
      const boundaryValues = [0.9, 0.8, 0.6, 0.4, 0.0, 1.0];
      
      const avgTime = measureAveragePerformance(() => {
        boundaryValues.forEach(value => classifyEquityLevel(value));
      });
      
      expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      console.log(`Boundary value classification: ${avgTime.toFixed(4)}ms`);
    });
  });

  describe('Confidence Calculation Performance', () => {
    test('calculateConfidence should execute efficiently for various group sizes', () => {
      const testScenarios = [
        { size: 5, stdDev: 3.0, mean: 20.0 },
        { size: 10, stdDev: 5.0, mean: 25.0 },
        { size: 25, stdDev: 8.0, mean: 30.0 },
        { size: 50, stdDev: 12.0, mean: 35.0 },
        { size: 100, stdDev: 15.0, mean: 40.0 }
      ];

      testScenarios.forEach(scenario => {
        const avgTime = measureAveragePerformance(() => {
          calculateConfidence(scenario.size, scenario.stdDev, scenario.mean);
        });
        
        expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
        console.log(`Confidence calculation for ${scenario.size} users: ${avgTime.toFixed(4)}ms`);
      });
    });

    test('calculateConfidence should handle extreme values efficiently', () => {
      const extremeCases = [
        () => calculateConfidence(1000, 50.0, 100.0), // Very large group
        () => calculateConfidence(1, 0.0, 10.0), // Single user, no variance
        () => calculateConfidence(10, 0.0, 30.0), // Perfect equity
        () => calculateConfidence(10, 100.0, 20.0), // Extreme variance
      ];

      extremeCases.forEach((operation, index) => {
        const avgTime = measureAveragePerformance(operation);
        expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
        console.log(`Extreme case ${index + 1}: ${avgTime.toFixed(4)}ms`);
      });
    });
  });

  describe('Context Creation Performance', () => {
    test('createEquityContext should be instantaneous', () => {
      const avgTime = measureAveragePerformance(() => {
        createEquityContext(
          8,
          ['mrt', 'bus', 'walking'],
          25.5,
          12.0,
          'morning'
        );
      });

      expect(avgTime).toBeLessThan(1); // Should be sub-millisecond
      console.log(`Context creation: ${avgTime.toFixed(4)}ms`);
    });

    test('createEquityContext with large transport mode arrays', () => {
      const largeModeArray = [
        'mrt', 'bus', 'walking', 'cycling', 'grab', 'taxi', 'driving',
        'scooter', 'motorcycle', 'ferry', 'train', 'shuttle'
      ];

      const avgTime = measureAveragePerformance(() => {
        createEquityContext(50, largeModeArray, 35.0, 20.0);
      });

      expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      console.log(`Large transport modes context creation: ${avgTime.toFixed(4)}ms`);
    });
  });

  describe('Complete Assessment Performance', () => {
    let sampleEquityResult: EquityResult;
    let sampleContext: EquityContext;

    beforeAll(() => {
      sampleEquityResult = {
        fairnessIndex: 0.75,
        sampleSize: 10,
        meanTravelTime: 25.0,
        standardDeviation: 6.0,
        isPerfectEquity: false,
        calculatedAt: new Date()
      };

      sampleContext = createEquityContext(
        10,
        ['mrt', 'bus'],
        25.0,
        15.0,
        'morning'
      );
    });

    test('assessEquityLevel should execute in <10ms for typical scenarios', () => {
      const avgTime = measureAveragePerformance(() => {
        assessEquityLevel(sampleEquityResult, sampleContext);
      });

      expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      console.log(`Complete assessment: ${avgTime.toFixed(4)}ms`);
    });

    test('assessEquityLevel with complex recommendations', () => {
      const complexContext = createEquityContext(
        25, // Large group
        ['mrt', 'bus', 'walking', 'grab', 'cycling'], // Many transport modes
        45.0, // Long average time
        35.0, // Large range
        'morning' // Peak hour
      );

      const poorEquityResult = { ...sampleEquityResult, fairnessIndex: 0.55 };

      const avgTime = measureAveragePerformance(() => {
        assessEquityLevel(poorEquityResult, complexContext);
      });

      expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      console.log(`Complex assessment: ${avgTime.toFixed(4)}ms`);
    });
  });

  describe('Integrated Performance with Jain\'s Index', () => {
    test('full equity analysis pipeline should be fast', () => {
      const travelTimes = Array.from({ length: 20 }, (_, i) => 15 + Math.random() * 20);
      const travelData = createTravelTimeData(travelTimes);

      const avgTime = measureAveragePerformance(() => {
        const equityResult = calculateEquityAnalysis(travelData);
        const context = createEquityContext(
          travelData.length,
          ['mrt', 'bus'],
          equityResult.meanTravelTime,
          Math.max(...travelTimes) - Math.min(...travelTimes),
          'afternoon'
        );
        assessEquityLevel(equityResult, context);
      });

      expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      console.log(`Full pipeline (20 users): ${avgTime.toFixed(4)}ms`);
    });

    test('performance scaling with user count', () => {
      const userCounts = [5, 10, 25, 50, 100];

      userCounts.forEach(userCount => {
        const travelTimes = Array.from({ length: userCount }, (_, i) => 
          10 + (i / userCount) * 30 // Spread from 10-40 minutes
        );
        const travelData = createTravelTimeData(travelTimes);

        const avgTime = measureAveragePerformance(() => {
          const equityResult = calculateEquityAnalysis(travelData);
          const context = createEquityContext(
            userCount,
            ['mrt'],
            equityResult.meanTravelTime,
            30.0 // Fixed range for comparison
          );
          assessEquityLevel(equityResult, context);
        }, 50); // Fewer runs for larger datasets

        expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
        console.log(`Full pipeline (${userCount} users): ${avgTime.toFixed(4)}ms`);
      });
    });
  });

  describe('Singapore Scenario Performance', () => {
    test('CBD to outlying areas scenario performance', () => {
      // Simulate realistic Singapore scenario: CBD meeting with users from various locations
      const singaporeScenario = createTravelTimeData([
        12, 15, 18, 22, 45, 48, 35, 25, 20, 42 // Mix of central and outlying travel times
      ]);

      const avgTime = measureAveragePerformance(() => {
        const equityResult = calculateEquityAnalysis(singaporeScenario);
        const context = createEquityContext(
          10,
          ['mrt', 'bus', 'walking'],
          equityResult.meanTravelTime,
          36, // Large range (48-12)
          'morning'
        );
        const assessment = assessEquityLevel(equityResult, context);
        
        // Ensure the recommendation is generated (forces string operations)
        expect(assessment.recommendation.length).toBeGreaterThan(0);
      });

      expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      console.log(`Singapore CBD scenario: ${avgTime.toFixed(4)}ms`);
    });

    test('peak hour context performance', () => {
      const peakHourScenarios = ['morning', 'evening', 'afternoon', undefined];
      
      peakHourScenarios.forEach(timeOfDay => {
        const avgTime = measureAveragePerformance(() => {
          const context = createEquityContext(
            8,
            ['mrt', 'bus'],
            28.0,
            15.0,
            timeOfDay
          );
          
          const equityResult = {
            fairnessIndex: 0.82,
            sampleSize: 8,
            meanTravelTime: 28.0,
            standardDeviation: 5.5,
            isPerfectEquity: false,
            calculatedAt: new Date()
          };
          
          assessEquityLevel(equityResult, context);
        });

        expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
        console.log(`Peak hour scenario (${timeOfDay || 'none'}): ${avgTime.toFixed(4)}ms`);
      });
    });
  });

  describe('Memory Performance', () => {
    test('should not create excessive object allocations', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const equityResult = {
          fairnessIndex: 0.75 + Math.random() * 0.2,
          sampleSize: 10,
          meanTravelTime: 25.0,
          standardDeviation: 5.0,
          isPerfectEquity: false,
          calculatedAt: new Date()
        };
        
        const context = createEquityContext(10, ['mrt'], 25.0, 10.0);
        assessEquityLevel(equityResult, context);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      // Should not use excessive memory (less than 10MB for 1000 operations)
      expect(memoryIncrease).toBeLessThan(10);
      console.log(`Memory increase for 1000 operations: ${memoryIncrease.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Performance', () => {
    test('should handle concurrent assessments efficiently', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => {
        return new Promise<number>((resolve) => {
          const start = process.hrtime.bigint();
          
          const equityResult = {
            fairnessIndex: 0.5 + (i / 100), // Vary fairness index
            sampleSize: 5 + (i % 10),
            meanTravelTime: 20.0 + (i % 20),
            standardDeviation: 3.0 + (i % 5),
            isPerfectEquity: false,
            calculatedAt: new Date()
          };
          
          const context = createEquityContext(
            5 + (i % 10),
            ['mrt', 'bus'],
            equityResult.meanTravelTime,
            10.0 + (i % 15)
          );
          
          assessEquityLevel(equityResult, context);
          
          const end = process.hrtime.bigint();
          resolve(Number(end - start) / 1_000_000);
        });
      });

      const times = await Promise.all(promises);
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS);
      expect(maxTime).toBeLessThan(PERFORMANCE_TARGET_MS * 2); // Allow some variance for concurrent execution
      
      console.log(`Concurrent average: ${avgTime.toFixed(4)}ms, max: ${maxTime.toFixed(4)}ms`);
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain consistent performance across equity levels', () => {
      const equityLevels = [0.95, 0.85, 0.75, 0.55, 0.35]; // One for each level
      const times: number[] = [];

      equityLevels.forEach(fairnessIndex => {
        const time = measureAveragePerformance(() => {
          const equityResult = {
            fairnessIndex,
            sampleSize: 10,
            meanTravelTime: 25.0,
            standardDeviation: 5.0,
            isPerfectEquity: false,
            calculatedAt: new Date()
          };
          
          const context = createEquityContext(10, ['mrt'], 25.0, 10.0);
          assessEquityLevel(equityResult, context);
        });
        
        times.push(time);
        expect(time).toBeLessThan(PERFORMANCE_TARGET_MS);
      });

      // Variance between different equity levels should be minimal
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      expect(stdDev).toBeLessThan(avgTime * 0.2); // Standard deviation should be <20% of average
      console.log(`Performance consistency - avg: ${avgTime.toFixed(4)}ms, stddev: ${stdDev.toFixed(4)}ms`);
    });
  });
});