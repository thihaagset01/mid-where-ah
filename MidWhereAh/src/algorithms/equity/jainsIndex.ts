/**
 * Jain's Fairness Index implementation for MidWhereAh transport equity optimization.
 * 
 * Jain's Fairness Index measures the equality of resource allocation.
 * For transport equity, it evaluates how fairly travel times are distributed among users.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

/**
 * Interface representing travel time data for a single user or location.
 */
export interface TravelTimeData {
  /** Unique identifier for the user or location */
  id: string;
  /** Travel time in minutes */
  travelTimeMinutes: number;
  /** Optional user identifier */
  userId?: string;
  /** Optional location name or description */
  locationName?: string;
}

/**
 * Interface representing the result of equity calculation.
 */
export interface EquityResult {
  /** Jain's Fairness Index score (0-1, where 1 = perfect equity) */
  fairnessIndex: number;
  /** Number of data points used in calculation */
  sampleSize: number;
  /** Mean travel time in minutes */
  meanTravelTime: number;
  /** Standard deviation of travel times */
  standardDeviation: number;
  /** Whether the result represents perfect equity */
  isPerfectEquity: boolean;
  /** Calculation timestamp */
  calculatedAt: Date;
}

/**
 * Custom error class for Jain's Fairness Index calculation errors.
 */
export class JainsFairnessIndexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JainsFairnessIndexError';
  }
}

/**
 * Calculates Jain's Fairness Index for a set of travel times.
 * 
 * Formula: J = (Σxi)² / (n × Σxi²)
 * Where:
 * - xi = individual travel times
 * - n = number of users
 * 
 * @param travelTimes Array of travel times in minutes
 * @returns Fairness index score between 0 and 1
 * @throws {JainsFairnessIndexError} When input validation fails
 * 
 * @example
 * ```typescript
 * // Perfect equity - all users have same travel time
 * const fairIndex1 = calculateJainsIndex([10, 10, 10, 10]);
 * console.log(fairIndex1); // 1.0
 * 
 * // Some inequity
 * const fairIndex2 = calculateJainsIndex([5, 10, 15, 20]);
 * console.log(fairIndex2); // ~0.8
 * 
 * // Maximum inequity - one person travels, others don't
 * const fairIndex3 = calculateJainsIndex([0, 0, 0, 60]);
 * console.log(fairIndex3); // 0.25 (1/n where n=4)
 * ```
 */
export const calculateJainsIndex = (travelTimes: readonly number[]): number => {
  // Input validation
  if (!Array.isArray(travelTimes)) {
    throw new JainsFairnessIndexError('Travel times must be an array');
  }

  if (travelTimes.length === 0) {
    throw new JainsFairnessIndexError('Travel times array cannot be empty');
  }

  // Validate all elements are non-negative numbers
  const invalidElements = travelTimes.filter(time => 
    typeof time !== 'number' || 
    !Number.isFinite(time) || 
    time < 0
  );

  if (invalidElements.length > 0) {
    throw new JainsFairnessIndexError(
      'All travel times must be non-negative finite numbers'
    );
  }

  const n = travelTimes.length;

  // Special case: single user always has perfect fairness
  if (n === 1) {
    return 1.0;
  }

  // Calculate sum of travel times
  const sum = travelTimes.reduce((acc, time) => acc + time, 0);

  // Special case: all travel times are zero (perfect equity)
  if (sum === 0) {
    return 1.0;
  }

  // Calculate sum of squared travel times
  const sumOfSquares = travelTimes.reduce((acc, time) => acc + time * time, 0);

  // Special case: prevent division by zero
  if (sumOfSquares === 0) {
    return 1.0;
  }

  // Apply Jain's Fairness Index formula: (Σxi)² / (n × Σxi²)
  const jainIndex = (sum * sum) / (n * sumOfSquares);

  // Ensure result is within valid range [0, 1] due to floating point precision
  return Math.min(1.0, Math.max(0.0, jainIndex));
};

/**
 * Calculates comprehensive equity analysis including Jain's Fairness Index.
 * 
 * @param travelTimeData Array of travel time data objects
 * @returns Complete equity analysis result
 * @throws {JainsFairnessIndexError} When input validation fails
 * 
 * @example
 * ```typescript
 * const travelData: TravelTimeData[] = [
 *   { id: '1', travelTimeMinutes: 10, userId: 'user1' },
 *   { id: '2', travelTimeMinutes: 15, userId: 'user2' },
 *   { id: '3', travelTimeMinutes: 12, userId: 'user3' }
 * ];
 * 
 * const result = calculateEquityAnalysis(travelData);
 * console.log(result.fairnessIndex); // Fairness score
 * console.log(result.meanTravelTime); // Average travel time
 * ```
 */
export const calculateEquityAnalysis = (
  travelTimeData: readonly TravelTimeData[]
): EquityResult => {
  if (!Array.isArray(travelTimeData)) {
    throw new JainsFairnessIndexError('Travel time data must be an array');
  }

  if (travelTimeData.length === 0) {
    throw new JainsFairnessIndexError('Travel time data array cannot be empty');
  }

  // Validate data structure
  const invalidData = travelTimeData.filter(data => 
    !data || 
    typeof data.id !== 'string' || 
    typeof data.travelTimeMinutes !== 'number' ||
    !Number.isFinite(data.travelTimeMinutes) ||
    data.travelTimeMinutes < 0
  );

  if (invalidData.length > 0) {
    throw new JainsFairnessIndexError(
      'All travel time data must have valid id and non-negative travelTimeMinutes'
    );
  }

  // Extract travel times for Jain's Index calculation
  const travelTimes = travelTimeData.map(data => data.travelTimeMinutes);
  
  // Calculate Jain's Fairness Index
  const fairnessIndex = calculateJainsIndex(travelTimes);
  
  // Calculate statistics
  const sampleSize = travelTimes.length;
  const meanTravelTime = travelTimes.reduce((sum, time) => sum + time, 0) / sampleSize;
  
  // Calculate standard deviation
  const variance = travelTimes.reduce(
    (sum, time) => sum + Math.pow(time - meanTravelTime, 2), 
    0
  ) / sampleSize;
  const standardDeviation = Math.sqrt(variance);
  
  // Determine if equity is perfect (allowing for floating point precision)
  const isPerfectEquity = fairnessIndex >= 0.9999;

  return {
    fairnessIndex,
    sampleSize,
    meanTravelTime,
    standardDeviation,
    isPerfectEquity,
    calculatedAt: new Date()
  };
};

/**
 * Utility function to create TravelTimeData objects from simple arrays.
 * 
 * @param travelTimes Array of travel times in minutes
 * @param userIds Optional array of user IDs (auto-generated if not provided)
 * @returns Array of TravelTimeData objects
 * 
 * @example
 * ```typescript
 * const data = createTravelTimeData([10, 15, 12], ['user1', 'user2', 'user3']);
 * const result = calculateEquityAnalysis(data);
 * ```
 */
export const createTravelTimeData = (
  travelTimes: readonly number[],
  userIds?: readonly string[]
): TravelTimeData[] => {
  if (!Array.isArray(travelTimes)) {
    throw new JainsFairnessIndexError('Travel times must be an array');
  }

  if (userIds && userIds.length !== travelTimes.length) {
    throw new JainsFairnessIndexError(
      'User IDs array length must match travel times array length'
    );
  }

  return travelTimes.map((time, index) => ({
    id: `travel_${index}`,
    travelTimeMinutes: time,
    userId: userIds ? userIds[index] : `user_${index}`
  }));
};