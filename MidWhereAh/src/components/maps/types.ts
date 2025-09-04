/**
 * TypeScript interfaces and types for MapView component
 * Supporting Singapore region transport equity optimization
 */

import { ViewStyle } from 'react-native';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type TransportMode = 'DRIVING' | 'TRANSIT' | 'WALKING' | 'CYCLING';

export type EquityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface UserLocation {
  id: string;
  coordinate: Coordinate;
  transportMode: TransportMode;
  name?: string;
  travelTime?: number;
}

export interface Venue {
  id: string;
  coordinate: Coordinate;
  name: string;
  type?: string;
  amenities?: string[];
}

export interface OptimalPoint {
  coordinate: Coordinate;
  equityLevel: EquityLevel;
  jainsIndex: number;
  venues: Venue[];
}

export interface MapMarker {
  id: string;
  coordinate: Coordinate;
  type: 'user' | 'optimal' | 'venue';
  data?: any;
}

export interface MapViewProps {
  userLocations: UserLocation[];
  optimalPoint?: OptimalPoint;
  venues?: Venue[];
  onMapReady?: () => void;
  onMarkerPress?: (marker: MapMarker) => void;
  onMapPress?: (coordinate: Coordinate) => void;
  showUserLocation?: boolean;
  style?: ViewStyle;
}

export interface MarkerClusterData {
  id: string;
  coordinate: Coordinate;
  type: 'user' | 'optimal' | 'venue';
  data: UserLocation | OptimalPoint | Venue;
}

export interface ClusterPoint {
  type: 'Feature';
  properties: {
    cluster: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string;
    marker?: MapMarker;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

// Singapore-specific configuration
export const SINGAPORE_REGION = {
  latitude: 1.3521,
  longitude: 103.8198,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

// Color mapping for different marker types and transport modes
export const MARKER_COLORS = {
  user: {
    DRIVING: '#6B7280',
    TRANSIT: '#0066CC', 
    WALKING: '#10B981',
    CYCLING: '#F59E0B'
  },
  optimal: {
    excellent: '#22C55E',
    good: '#7BB366',
    fair: '#F59E0B',
    poor: '#E74C3C',
    critical: '#DC2626'
  },
  venue: '#8B5DB8'
};

// Performance optimization constants
export const MAP_PERFORMANCE_CONFIG = {
  CLUSTER_THRESHOLD: 10,
  MAX_ZOOM_LEVEL: 18,
  MIN_ZOOM_LEVEL: 8,
  ANIMATION_DURATION: 250,
  TOUCH_RESPONSE_THRESHOLD: 100, // milliseconds
  TARGET_FPS: 60,
  VIEWPORT_PADDING: 0.1, // 10% padding for viewport-based loading
};

// Accessibility configuration
export const ACCESSIBILITY_CONFIG = {
  MAP_LABEL: 'Singapore transport equity map',
  USER_MARKER_LABEL: 'User location marker',
  OPTIMAL_POINT_LABEL: 'Optimal meeting point',
  VENUE_MARKER_LABEL: 'Venue marker',
  CLUSTER_LABEL: 'Marker cluster',
};