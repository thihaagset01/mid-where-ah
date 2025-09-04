export type RootStackParamList = {
  Home: undefined;
  Map: undefined;
  Optimization: { userLocations: UserLocation[] };
  Results: { optimizationResult: OptimizationResult };
};

export interface UserLocation {
  id: string;
  latitude: number;
  longitude: number;
  address?: string;
  timestamp?: number;
}

export interface OptimizationResult {
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