/**
 * Transport Types - Singapore-specific transport modes and interfaces
 */

export type TransportMode = 'TRANSIT' | 'WALKING' | 'DRIVING' | 'CYCLING';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface UserLocation {
  userId: string;
  userName: string;
  coordinate: Coordinate;
  transportMode: TransportMode;
}

export interface TravelTimeResult {
  duration: number;      // minutes
  distance: number;      // kilometers
  confidence: number;    // 0-1, API reliability
  route?: RouteStep[];
}

export interface RouteStep {
  mode: TransportMode;
  duration: number;
  distance: number;
  instructions: string;
}

export interface MRTStation {
  id: string;
  name: string;
  code: string;
  coordinate: Coordinate;
  lines: string[];
}

export interface OptimizationRequest {
  users: UserLocation[];
  constraints: {
    maxTravelTime: number;     // minutes
    maxTimeRange: number;      // minutes
    departureTime?: Date;
  };
  searchConfig?: {
    searchRadius: number;      // kilometers
    candidateCount: number;
  };
}
