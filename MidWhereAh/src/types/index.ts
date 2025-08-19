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

// Venue type for map markers and recommendations
export interface Venue {
  id: string;
  name: string;
  coordinate: { lat: number; lng: number };
  type: 'restaurant' | 'cafe' | 'mall' | 'park' | 'attraction' | 'other';
  rating?: number;
  priceLevel?: 1 | 2 | 3 | 4;
  equityScore?: number;
}