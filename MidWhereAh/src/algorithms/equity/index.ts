/**
 * Main entry point for equity algorithms in MidWhereAh.
 * 
 * Exports Jain's Fairness Index implementation for transport equity optimization.
 */

export {
  calculateJainsIndex,
  calculateEquityAnalysis,
  createTravelTimeData,
  JainsFairnessIndexError,
  type TravelTimeData,
  type EquityResult
} from './jainsIndex';