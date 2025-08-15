import { Route } from "./geography";

// src/types/transport.ts
export type TransportMode = 'TRANSIT' | 'WALKING' | 'DRIVING' | 'CYCLING';

export interface TravelTimeResult {
  duration: number;
  distance: number;
  confidence: number;
  route?: Route;
}

export interface TransportModeConfig {
  DRIVING: number;
  TRANSIT: number;
  WALKING: number;
  CYCLING: number;
}