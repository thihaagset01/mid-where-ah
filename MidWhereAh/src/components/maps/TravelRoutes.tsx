/**
 * Travel Routes Component for MidWhereAh
 * 
 * Visualizes dotted line routes from each user location to optimal meeting point
 * with transport mode color coding and smooth animations.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { Polyline } from 'react-native-maps';
import { Coordinate, TransportMode } from '../maps/types';
import { PurpleTheme } from '../../design/theme';

/**
 * User location with transport mode
 */
export interface UserLocation {
  id: string;
  coordinate: Coordinate;
  transportMode: TransportMode;
  name?: string;
}

/**
 * Travel Routes Props
 */
export interface TravelRoutesProps {
  /** Array of user locations */
  userLocations: UserLocation[];
  /** Optimal meeting point coordinate */
  optimalPoint: Coordinate;
  /** Show/hide routes with animation */
  showRoutes: boolean;
  /** Custom style override */
  style?: ViewStyle;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Route line width */
  lineWidth?: number;
  /** Enable route animations */
  animated?: boolean;
}

/**
 * Get transport mode color from theme
 */
const getTransportColor = (mode: TransportMode): string => {
  return PurpleTheme.utils.getTransportColor(mode);
};

/**
 * Get transport mode dash pattern for route visualization
 */
const getTransportDashPattern = (mode: TransportMode): number[] => {
  switch (mode) {
    case 'DRIVING':
      return [10, 5]; // Solid dashes for driving
    case 'TRANSIT':
      return [8, 8]; // Even dashes for transit
    case 'WALKING':
      return [4, 6]; // Short dashes for walking
    case 'CYCLING':
      return [6, 4]; // Medium dashes for cycling
    default:
      return [5, 5]; // Default pattern
  }
};

/**
 * Individual route line component
 */
const RoutePolyline: React.FC<{
  coordinates: Coordinate[];
  transportMode: TransportMode;
  isVisible: boolean;
  lineWidth: number;
  animated: boolean;
  animationDuration: number;
}> = ({ 
  coordinates, 
  transportMode, 
  isVisible, 
  lineWidth, 
  animated,
  animationDuration 
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const strokeWidthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      const targetOpacity = isVisible ? 1 : 0;
      const targetWidth = isVisible ? lineWidth : 0;

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: targetOpacity,
          duration: animationDuration,
          useNativeDriver: false,
        }),
        Animated.timing(strokeWidthAnim, {
          toValue: targetWidth,
          duration: animationDuration,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      opacityAnim.setValue(isVisible ? 1 : 0);
      strokeWidthAnim.setValue(isVisible ? lineWidth : 0);
    }
  }, [isVisible, animated, animationDuration, lineWidth, opacityAnim, strokeWidthAnim]);

  if (!isVisible && !animated) {
    return null;
  }

  const color = getTransportColor(transportMode);
  const dashPattern = getTransportDashPattern(transportMode);

  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={color}
      strokeWidth={animated ? strokeWidthAnim as any : lineWidth}
      lineDashPattern={dashPattern}
      lineJoin="round"
      lineCap="round"
      strokeOpacity={animated ? opacityAnim as any : (isVisible ? 1 : 0)}
    />
  );
};

/**
 * Travel Routes Component
 */
export const TravelRoutes: React.FC<TravelRoutesProps> = ({
  userLocations,
  optimalPoint,
  showRoutes,
  style,
  animationDuration = 500,
  lineWidth = 3,
  animated = true,
}) => {
  return (
    <>
      {userLocations.map((location) => (
        <RoutePolyline
          key={`route-${location.id}`}
          coordinates={[location.coordinate, optimalPoint]}
          transportMode={location.transportMode}
          isVisible={showRoutes}
          lineWidth={lineWidth}
          animated={animated}
          animationDuration={animationDuration}
        />
      ))}
    </>
  );
};

/**
 * Advanced travel routes with multiple waypoints
 */
export interface AdvancedRoute {
  id: string;
  coordinates: Coordinate[];
  transportMode: TransportMode;
  travelTime?: number;
  distance?: number;
}

/**
 * Advanced Travel Routes Props
 */
export interface AdvancedTravelRoutesProps {
  /** Array of detailed routes */
  routes: AdvancedRoute[];
  /** Show/hide routes */
  showRoutes: boolean;
  /** Route line width */
  lineWidth?: number;
  /** Enable animations */
  animated?: boolean;
  /** Stagger animation delay between routes */
  staggerDelay?: number;
}

/**
 * Advanced Travel Routes Component with waypoint support
 */
export const AdvancedTravelRoutes: React.FC<AdvancedTravelRoutesProps> = ({
  routes,
  showRoutes,
  lineWidth = 3,
  animated = true,
  staggerDelay = 100,
}) => {
  return (
    <>
      {routes.map((route, index) => (
        <RoutePolyline
          key={`advanced-route-${route.id}`}
          coordinates={route.coordinates}
          transportMode={route.transportMode}
          isVisible={showRoutes}
          lineWidth={lineWidth}
          animated={animated}
          animationDuration={500 + (index * staggerDelay)}
        />
      ))}
    </>
  );
};

/**
 * Singapore MRT/Bus route overlays
 */
export interface TransportRouteOverlay {
  /** Route identifier */
  id: string;
  /** Route name (e.g., "Circle Line", "Bus 174") */
  name: string;
  /** Route coordinates */
  coordinates: Coordinate[];
  /** Route type */
  type: 'mrt' | 'lrt' | 'bus';
  /** Route color */
  color: string;
  /** Show this route */
  visible: boolean;
}

/**
 * Transport Route Overlays Props
 */
export interface TransportRouteOverlaysProps {
  /** Array of transport routes */
  routes: TransportRouteOverlay[];
  /** Line width for route overlays */
  lineWidth?: number;
  /** Opacity for route overlays */
  opacity?: number;
}

/**
 * Singapore Transport Route Overlays Component
 */
export const TransportRouteOverlays: React.FC<TransportRouteOverlaysProps> = ({
  routes,
  lineWidth = 4,
  opacity = 0.7,
}) => {
  return (
    <>
      {routes
        .filter(route => route.visible)
        .map((route) => (
          <Polyline
            key={`transport-route-${route.id}`}
            coordinates={route.coordinates}
            strokeColor={route.color}
            strokeWidth={lineWidth}
            strokeOpacity={opacity}
            lineJoin="round"
            lineCap="round"
            zIndex={-1} // Behind user routes
          />
        ))}
    </>
  );
};

/**
 * Sample Singapore MRT routes for demonstration
 */
export const SingaporeMRTRoutes: TransportRouteOverlay[] = [
  {
    id: 'circle_line',
    name: 'Circle Line',
    type: 'mrt',
    color: '#FFD700', // Yellow
    coordinates: [
      { latitude: 1.3644, longitude: 103.9915 }, // Changi Airport
      { latitude: 1.3197, longitude: 103.9096 }, // Expo
      { latitude: 1.3058, longitude: 103.8975 }, // Tanah Merah
      // Add more stations as needed
    ],
    visible: false,
  },
  {
    id: 'red_line',
    name: 'North South Line',
    type: 'mrt',
    color: '#FF0000', // Red
    coordinates: [
      { latitude: 1.4331, longitude: 103.7864 }, // Jurong East
      { latitude: 1.3966, longitude: 103.7764 }, // Bukit Batok
      { latitude: 1.3848, longitude: 103.7619 }, // Bukit Gombak
      // Add more stations as needed
    ],
    visible: false,
  },
  // Add more MRT lines as needed
];

/**
 * Utility functions for route management
 */
export const RouteUtils = {
  /**
   * Create route from user location to optimal point
   */
  createUserRoute: (userLocation: UserLocation, optimalPoint: Coordinate): AdvancedRoute => ({
    id: `user-route-${userLocation.id}`,
    coordinates: [userLocation.coordinate, optimalPoint],
    transportMode: userLocation.transportMode,
  }),

  /**
   * Calculate total route distance
   */
  calculateRouteDistance: (coordinates: Coordinate[]): number => {
    let totalDistance = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const from = coordinates[i];
      const to = coordinates[i + 1];
      
      // Haversine distance calculation
      const R = 6371; // Earth radius in km
      const dLat = (to.latitude - from.latitude) * Math.PI / 180;
      const dLon = (to.longitude - from.longitude) * Math.PI / 180;
      
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    return totalDistance;
  },

  /**
   * Filter routes by transport mode
   */
  filterRoutesByMode: (routes: AdvancedRoute[], mode: TransportMode): AdvancedRoute[] => {
    return routes.filter(route => route.transportMode === mode);
  },

  /**
   * Create MRT route overlay
   */
  createMRTRoute: (
    id: string,
    name: string,
    coordinates: Coordinate[],
    color: string
  ): TransportRouteOverlay => ({
    id,
    name,
    type: 'mrt',
    coordinates,
    color,
    visible: false,
  }),
};

export default TravelRoutes;