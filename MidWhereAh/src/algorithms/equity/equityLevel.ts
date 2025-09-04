/**
 * Equity Level Classification System for MidWhereAh transport equity optimization.
 * 
 * Converts numerical Jain's Fairness Index scores into descriptive equity levels
 * with corresponding colors, descriptions, and Singapore-specific recommendations.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import { EquityResult } from './jainsIndex';

/**
 * Possible equity level classifications based on Jain's Fairness Index scores.
 */
export type EquityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

/**
 * Complete equity assessment including level classification and recommendations.
 */
export interface EquityAssessment {
  /** Classified equity level */
  level: EquityLevel;
  /** Original Jain's Fairness Index score (0-1) */
  jainsIndex: number;
  /** Hex color code for UI representation */
  colorCode: string;
  /** User-friendly title for the equity level */
  title: string;
  /** Descriptive explanation of what this level means */
  description: string;
  /** Context-aware recommendation for improvement */
  recommendation: string;
  /** Confidence score based on sample size and variance (0-1) */
  confidence: number;
}

/**
 * Context information for generating tailored recommendations.
 */
export interface EquityContext {
  /** Number of users in the group */
  groupSize: number;
  /** Primary transport modes used by the group */
  transportModes: string[];
  /** Time of day for the meeting (optional) */
  timeOfDay?: string;
  /** Average travel time across all users in minutes */
  averageTravelTime: number;
  /** Range of travel times (max - min) in minutes */
  timeRange: number;
}

/**
 * Configuration for each equity level including thresholds and recommendation logic.
 */
export interface EquityLevelConfig {
  /** Equity level identifier */
  level: EquityLevel;
  /** Threshold range for this level */
  threshold: { min: number; max: number };
  /** Hex color code for UI representation */
  color: string;
  /** User-friendly title */
  title: string;
  /** Description of what this level means */
  description: string;
  /** Function to generate context-aware recommendations */
  getRecommendation: (context: EquityContext) => string;
}

/**
 * Equity level configurations with proven thresholds from Singapore transport analysis.
 * Thresholds: Excellent (>0.9), Good (0.8-0.9), Fair (0.6-0.8), Poor (0.4-0.6), Critical (<0.4)
 */
const EQUITY_LEVELS: EquityLevelConfig[] = [
  {
    level: 'excellent',
    threshold: { min: 0.9, max: 1.0 },
    color: '#22C55E',
    title: 'Excellent Equity',
    description: 'Travel times are very evenly distributed across all users',
    getRecommendation: (context: EquityContext) => {
      const modes = context.transportModes.join(' and ');
      return `Perfect meeting point! All users have similar travel times via ${modes}. This location ensures excellent fairness for everyone.`;
    }
  },
  {
    level: 'good',
    threshold: { min: 0.8, max: 0.9 },
    color: '#7BB366',
    title: 'Good Equity',
    description: 'Travel times are reasonably balanced with minor variations',
    getRecommendation: (context: EquityContext) => {
      const avgTime = Math.round(context.averageTravelTime);
      const isPeakHour = context.timeOfDay && ['morning', 'evening'].includes(context.timeOfDay.toLowerCase());
      const peakAdvice = isPeakHour ? ' Consider off-peak timing to further improve accessibility.' : '';
      return `Good choice with ${avgTime}min average travel time. Minor adjustments to location could further improve fairness.${peakAdvice}`;
    }
  },
  {
    level: 'fair',
    threshold: { min: 0.6, max: 0.8 },
    color: '#F59E0B',
    title: 'Fair Equity',
    description: 'Some users face significantly longer travel times than others',
    getRecommendation: (context: EquityContext) => {
      const hasPublicTransport = context.transportModes.some(mode => 
        ['mrt', 'bus', 'public transport'].includes(mode.toLowerCase())
      );
      const publicTransitSuggestion = hasPublicTransport 
        ? 'Consider locations near MRT interchanges for better accessibility.' 
        : 'Adding MRT or bus options could improve equity.';
      
      return `Some users travel much longer than others. ${publicTransitSuggestion} Alternative venues closer to outlying users may help.`;
    }
  },
  {
    level: 'poor',
    threshold: { min: 0.4, max: 0.6 },
    color: '#E74C3C',
    title: 'Poor Equity',
    description: 'Travel times are quite uneven, creating unfair burden distribution',
    getRecommendation: (context: EquityContext) => {
      const timeRange = Math.round(context.timeRange);
      const isLargeGroup = context.groupSize > 5;
      const groupAdvice = isLargeGroup 
        ? ` With ${context.groupSize} users, consider splitting into smaller regional groups.`
        : '';
      
      return `${timeRange}min difference between shortest and longest trips. Strongly recommend finding a more central location near MRT hubs or CBD.${groupAdvice}`;
    }
  },
  {
    level: 'critical',
    threshold: { min: 0.0, max: 0.4 },
    color: '#DC2626',
    title: 'Critical Inequity',
    description: 'Extremely uneven travel burden - some users heavily disadvantaged',
    getRecommendation: (context: EquityContext) => {
      const avgTime = Math.round(context.averageTravelTime);
      const virtualSuggestion = avgTime > 45 
        ? ' Consider virtual meeting options to ensure fair participation.'
        : '';
      
      return `This location heavily favors some users over others. Consider multiple meeting points, locations near Changi/NTU/CBD transport hubs, or alternative arrangements.${virtualSuggestion}`;
    }
  }
];

/**
 * Error class for equity level classification errors.
 */
export class EquityLevelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EquityLevelError';
  }
}

/**
 * Calculates confidence score based on sample size and variance in travel times.
 * Higher sample sizes and lower variance result in higher confidence.
 * 
 * @param sampleSize Number of users in the assessment
 * @param standardDeviation Standard deviation of travel times
 * @param meanTravelTime Average travel time for normalization
 * @returns Confidence score between 0 and 1
 * 
 * @example
 * ```typescript
 * const confidence = calculateConfidence(10, 5.2, 25.0);
 * console.log(confidence); // ~0.85 (high confidence)
 * ```
 */
export const calculateConfidence = (
  sampleSize: number,
  standardDeviation: number,
  meanTravelTime: number
): number => {
  if (sampleSize <= 0 || meanTravelTime <= 0) {
    return 0;
  }

  // Sample size component: more users = higher confidence
  // Asymptotic approach to 1.0 with diminishing returns
  const sizeConfidence = 1 - Math.exp(-sampleSize / 5);
  
  // Variance component: lower relative variance = higher confidence
  // Coefficient of variation (CV) normalized
  const coefficientOfVariation = standardDeviation / meanTravelTime;
  const varianceConfidence = Math.max(0, 1 - coefficientOfVariation);
  
  // Combined confidence with weighted average
  const confidence = 0.6 * sizeConfidence + 0.4 * varianceConfidence;
  
  return Math.min(1.0, Math.max(0.0, confidence));
};

/**
 * Classifies a Jain's Fairness Index score into an equity level.
 * 
 * @param jainsIndex Fairness index score between 0 and 1
 * @returns Corresponding equity level
 * @throws {EquityLevelError} When input is invalid
 * 
 * @example
 * ```typescript
 * const level1 = classifyEquityLevel(0.95); // 'excellent'
 * const level2 = classifyEquityLevel(0.75); // 'fair'
 * const level3 = classifyEquityLevel(0.35); // 'critical'
 * ```
 */
export const classifyEquityLevel = (jainsIndex: number): EquityLevel => {
  if (typeof jainsIndex !== 'number' || !Number.isFinite(jainsIndex)) {
    throw new EquityLevelError('Jain\'s Index must be a finite number');
  }

  if (jainsIndex < 0 || jainsIndex > 1) {
    throw new EquityLevelError('Jain\'s Index must be between 0 and 1');
  }

  // Find the appropriate level based on thresholds
  for (const config of EQUITY_LEVELS) {
    if (jainsIndex > config.threshold.min && jainsIndex <= config.threshold.max) {
      return config.level;
    }
  }

  // Edge case: exactly 0.0 should be critical
  if (jainsIndex === 0.0) {
    return 'critical';
  }

  // This should never happen with proper thresholds, but failsafe
  throw new EquityLevelError(`Unable to classify Jain's Index: ${jainsIndex}`);
};

/**
 * Gets the configuration for a specific equity level.
 * 
 * @param level Equity level to get configuration for
 * @returns Configuration object for the level
 * @throws {EquityLevelError} When level is invalid
 */
export const getEquityLevelConfig = (level: EquityLevel): EquityLevelConfig => {
  const config = EQUITY_LEVELS.find(config => config.level === level);
  
  if (!config) {
    throw new EquityLevelError(`Invalid equity level: ${level}`);
  }
  
  return config;
};

/**
 * Creates a complete equity assessment from Jain's Index calculation results.
 * Includes classification, recommendations, and confidence scoring.
 * 
 * @param equityResult Result from calculateEquityAnalysis
 * @param context Contextual information for recommendations
 * @returns Complete equity assessment with recommendations
 * @throws {EquityLevelError} When inputs are invalid
 * 
 * @example
 * ```typescript
 * const equityResult = calculateEquityAnalysis(travelTimeData);
 * const context: EquityContext = {
 *   groupSize: 5,
 *   transportModes: ['mrt', 'walking'],
 *   timeOfDay: 'morning',
 *   averageTravelTime: 25.5,
 *   timeRange: 15.2
 * };
 * 
 * const assessment = assessEquityLevel(equityResult, context);
 * console.log(assessment.level); // 'good'
 * console.log(assessment.recommendation); // Context-aware suggestion
 * ```
 */
export const assessEquityLevel = (
  equityResult: EquityResult,
  context: EquityContext
): EquityAssessment => {
  // Validate inputs
  if (!equityResult || typeof equityResult.fairnessIndex !== 'number') {
    throw new EquityLevelError('Invalid equity result provided');
  }

  if (!context || typeof context.groupSize !== 'number' || context.groupSize <= 0) {
    throw new EquityLevelError('Invalid context: groupSize must be a positive number');
  }

  if (!Array.isArray(context.transportModes) || context.transportModes.length === 0) {
    throw new EquityLevelError('Invalid context: transportModes must be a non-empty array');
  }

  // Classify the equity level
  const level = classifyEquityLevel(equityResult.fairnessIndex);
  
  // Get level configuration
  const config = getEquityLevelConfig(level);
  
  // Calculate confidence score
  const confidence = calculateConfidence(
    equityResult.sampleSize,
    equityResult.standardDeviation,
    equityResult.meanTravelTime
  );
  
  // Generate context-aware recommendation
  const recommendation = config.getRecommendation(context);

  return {
    level,
    jainsIndex: equityResult.fairnessIndex,
    colorCode: config.color,
    title: config.title,
    description: config.description,
    recommendation,
    confidence
  };
};

/**
 * Utility function to create EquityContext from basic parameters.
 * Provides defaults for optional fields.
 * 
 * @param groupSize Number of users in the group
 * @param transportModes Array of transport modes
 * @param averageTravelTime Average travel time in minutes
 * @param timeRange Range of travel times (max - min) in minutes
 * @param timeOfDay Optional time of day
 * @returns EquityContext object
 * 
 * @example
 * ```typescript
 * const context = createEquityContext(
 *   8, 
 *   ['mrt', 'bus'], 
 *   22.5, 
 *   12.0, 
 *   'morning'
 * );
 * ```
 */
export const createEquityContext = (
  groupSize: number,
  transportModes: string[],
  averageTravelTime: number,
  timeRange: number,
  timeOfDay?: string
): EquityContext => {
  if (groupSize <= 0) {
    throw new EquityLevelError('Group size must be positive');
  }

  if (!Array.isArray(transportModes) || transportModes.length === 0) {
    throw new EquityLevelError('Transport modes must be a non-empty array');
  }

  if (averageTravelTime < 0 || timeRange < 0) {
    throw new EquityLevelError('Travel times must be non-negative');
  }

  return {
    groupSize,
    transportModes: [...transportModes], // Immutable copy
    averageTravelTime,
    timeRange,
    timeOfDay
  };
};

/**
 * Gets all available equity levels in order from best to worst.
 * 
 * @returns Array of equity levels ordered by quality
 */
export const getAllEquityLevels = (): EquityLevel[] => {
  return ['excellent', 'good', 'fair', 'poor', 'critical'];
};

/**
 * Gets the color code for a specific equity level.
 * 
 * @param level Equity level
 * @returns Hex color code
 * @throws {EquityLevelError} When level is invalid
 */
export const getEquityLevelColor = (level: EquityLevel): string => {
  return getEquityLevelConfig(level).color;
};

/**
 * Checks if an equity level is considered acceptable (good or excellent).
 * 
 * @param level Equity level to check
 * @returns True if level is acceptable
 */
export const isAcceptableEquityLevel = (level: EquityLevel): boolean => {
  return level === 'excellent' || level === 'good';
};

/**
 * Checks if an equity level requires immediate attention (poor or critical).
 * 
 * @param level Equity level to check
 * @returns True if level requires attention
 */
export const requiresAttention = (level: EquityLevel): boolean => {
  return level === 'poor' || level === 'critical';
};