/**
 * Core Equity Scoring - Jain's Fairness Index Implementation
 * The mathematical foundation of MidWhereAh's transport-aware optimization
 */

export interface EquityMetrics {
  jainsIndex: number;        // 0-1, higher = more equitable
  timeRange: number;         // max - min travel time (minutes)
  averageTime: number;       // mean travel time (minutes)
  equityScore: number;       // composite score (lower = better)
}

export type EquityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Calculate Jain's Fairness Index - core equity measurement
 * Formula: (Σxi)² / (n × Σxi²)
 * Range: 0-1, where 1.0 = perfectly equitable
 */
export function calculateJainsIndex(travelTimes: number[]): number {
  if (travelTimes.length === 0) return 0;
  
  const sum = travelTimes.reduce((a, b) => a + b, 0);
  const sumSquares = travelTimes.reduce((total, time) => total + time * time, 0);
  
  return sumSquares > 0 ? (sum * sum) / (travelTimes.length * sumSquares) : 0;
}

/**
 * Get equity level based on Jain's Index value
 */
export function getEquityLevel(jainsIndex: number): EquityLevel {
  if (jainsIndex > 0.9) return 'excellent';  // Very fair
  if (jainsIndex > 0.8) return 'good';       // Reasonably fair
  if (jainsIndex > 0.6) return 'fair';       // Some unfairness
  if (jainsIndex > 0.4) return 'poor';       // Significant unfairness
  return 'critical';                         // Very unfair
}

/**
 * Calculate comprehensive equity metrics
 */
export function calculateEquityMetrics(travelTimes: number[]): EquityMetrics {
  const jainsIndex = calculateJainsIndex(travelTimes);
  const timeRange = travelTimes.length > 0 ? 
    Math.max(...travelTimes) - Math.min(...travelTimes) : 0;
  const averageTime = travelTimes.length > 0 ? 
    travelTimes.reduce((a, b) => a + b, 0) / travelTimes.length : 0;
  
  // Composite equity score (lower = more equitable)
  const equityScore = (1 - jainsIndex) * 0.6 + (timeRange / 60) * 0.4;
  
  return {
    jainsIndex,
    timeRange,
    averageTime,
    equityScore
  };
}
