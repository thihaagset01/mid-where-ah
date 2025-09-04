/**
 * Main entry point for equity algorithms in MidWhereAh.
 * 
 * Exports Jain's Fairness Index implementation and equity level classification
 * for transport equity optimization.
 */

export {
  calculateJainsIndex,
  calculateEquityAnalysis,
  createTravelTimeData,
  JainsFairnessIndexError,
  type TravelTimeData,
  type EquityResult
} from './jainsIndex';

export {
  assessEquityLevel,
  classifyEquityLevel,
  calculateConfidence,
  getEquityLevelConfig,
  createEquityContext,
  getAllEquityLevels,
  getEquityLevelColor,
  isAcceptableEquityLevel,
  requiresAttention,
  EquityLevelError,
  type EquityLevel,
  type EquityAssessment,
  type EquityContext,
  type EquityLevelConfig
} from './equityLevel';