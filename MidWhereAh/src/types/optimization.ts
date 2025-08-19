// src/types/optimization.ts
import { Coordinate, TransportMode, TransportModeConfig } from './index';

export interface OptimizationRequest {
  users: UserLocation[];
  constraints: OptimizationConstraints;
  searchConfig: SearchConfig;
  regionConfig: RegionConfig;
}

export interface UserLocation {
  id: string;
  name?: string;
  coordinate: Coordinate;
  transportMode: TransportMode;
  weight?: number;
}

export interface OptimizationConstraints {
  maxTravelTime: number;
  maxTimeRange: number;
}

export interface SearchConfig {
  coarseSpacing: number;
  fineSpacing: number;
}

export interface RegionConfig {
  modeFactors: TransportModeConfig;
  transitHubs: Coordinate[];
  venueTypes: string[];
}