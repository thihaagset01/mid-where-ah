import { UserLocationInput } from '../components/location/types';
import { OptimizationResult } from '../services/optimization';

export type RootStackParamList = {
  Home: undefined;
  Map: undefined;
  Optimization: { userLocations: UserLocationInput[] };
  Results: { optimizationResult: OptimizationResult };
};

export interface UserLocation {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: number;
}

// Legacy interface - kept for backward compatibility
// New OptimizationResult is imported from services
export interface LegacyOptimizationResult {
  id: string;
  centerPoint: {
    latitude: number;
    longitude: number;
  };
  fairnessScore: number;
  method: string;
  confidence: number;
  timestamp: number;
}

export interface AppState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  networkState: 'connected' | 'disconnected' | 'unknown';
}