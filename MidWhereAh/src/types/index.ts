// src/types/index.ts
export * from './geography';
export * from './transport';
export * from './optimization';

// Re-export commonly used types
export type { Coordinate, MRTStation } from './geography';
export type { TransportMode, TravelTimeResult } from './transport';
export type { UserLocation, OptimizationRequest } from './optimization';

// Re-export EquityMetrics from algorithms
export type { EquityMetrics } from '../algorithms/equity/scoring';