/**
 * Core equity scoring using Jain's Fairness Index
 * This is the mathematical foundation of MidWhereAh's value proposition
 */

export interface EquityMetrics {
    jainsIndex: number;         // 0-1, higher = more equitable
    timeRange: number;          // max - min travel time (minutes)
    averageTime: number;        // mean travel time (minutes)
    standardDeviation: number;  // travel time variance
    equityScore: number;        // composite score (lower = better)
  }
  
  export function calculateJainsIndex(travelTimes: number[]): number {
    if (travelTimes.length === 0) return 0;
    if (travelTimes.length === 1) return 1;
    
    const sum = travelTimes.reduce((a, b) => a + b);
    const sumSquares = travelTimes.reduce((total, time) => total + time * time);
    
    if (sumSquares === 0) return 0;
    
    return (sum * sum) / (travelTimes.length * sumSquares);
  }
  
  export function calculateEquityMetrics(
    travelTimes: number[],
    transportModes: string[],
    context?: {
      departureTime?: Date;
      weather?: 'sunny' | 'rainy' | 'hot';
    }
  ): EquityMetrics {
    const jainsIndex = calculateJainsIndex(travelTimes);
    const timeRange = Math.max(...travelTimes) - Math.min(...travelTimes);
    const averageTime = travelTimes.reduce((a, b) => a + b) / travelTimes.length;
    
    // Calculate standard deviation
    const variance = travelTimes.reduce((sum, time) => 
      sum + Math.pow(time - averageTime, 2), 0
    ) / travelTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Singapore-specific adjustments
    const timeOfDayPenalty = calculateTimeOfDayPenalty(context?.departureTime);
    const weatherPenalty = calculateWeatherPenalty(context?.weather);
    const modeBonus = calculateModeBonus(transportModes);
    
    // Composite equity score (lower = more equitable)
    const baseScore = (1 - jainsIndex) * 0.6 +     // Fairness weight (60%)
                     (timeRange / 60) * 0.25 +      // Range penalty (25%)
                     (averageTime / 60) * 0.15;     // Efficiency factor (15%)
    
    const equityScore = baseScore + timeOfDayPenalty + weatherPenalty - modeBonus;
    
    return {
      jainsIndex,
      timeRange,
      averageTime,
      standardDeviation,
      equityScore
    };
  }
  
  function calculateTimeOfDayPenalty(departureTime?: Date): number {
    if (!departureTime) return 0;
    
    const hour = departureTime.getHours();
    
    // Singapore peak hour penalties
    const peakHours: Record<number, number> = {
      7: 0.15, 8: 0.25, 9: 0.15,   // Morning rush
      17: 0.15, 18: 0.20, 19: 0.15 // Evening rush
    };
    
    return peakHours[hour] || 0;
  }
  
  function calculateWeatherPenalty(weather?: string): number {
    const weatherPenalties: Record<string, number> = {
      'rainy': 0.10,   // Longer waiting times, slower walking
      'hot': 0.05,     // Slower walking pace
      'hazy': 0.03     // Slight impact on outdoor movement
    };
    
    return weather ? (weatherPenalties[weather] || 0) : 0;
  }
  
  function calculateModeBonus(modes: string[]): number {
    // Bonus for sustainable transport usage
    const transitCount = modes.filter(m => m === 'TRANSIT').length;
    const walkingCount = modes.filter(m => m === 'WALKING').length;
    
    const transitBonus = (transitCount / modes.length) * 0.05;
    const walkingBonus = (walkingCount / modes.length) * 0.03;
    
    return transitBonus + walkingBonus;
  }
  
  export function getEquityLevel(jainsIndex: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (jainsIndex > 0.9) return 'excellent';
    if (jainsIndex > 0.8) return 'good';
    if (jainsIndex > 0.6) return 'fair';
    if (jainsIndex > 0.4) return 'poor';
    return 'critical';
  }