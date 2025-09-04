/**
 * Transport-Aware Initialization Algorithm for MidWhereAh
 * 
 * Replaces geometric centroids with Singapore MRT-network-aware center calculation
 * to achieve 60%+ equity improvement over basic geometric approaches.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import { calculateJainsIndex, createTravelTimeData } from '../equity/jainsIndex';

/**
 * Coordinate interface representing a geographic point
 */
export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * User location with transport mode preferences
 */
export interface UserLocation {
  id: string;
  lat: number;
  lng: number;
  mode: 'DRIVING' | 'TRANSIT' | 'WALKING' | 'CYCLING';
  weight?: number;
}

/**
 * Singapore MRT station data
 */
export interface MRTStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

/**
 * Accessibility weight calculation result
 */
export interface AccessibilityWeight {
  user: UserLocation;
  weight: number;
  accessibilityScore: number;
}

/**
 * Result of the transport-aware initialization calculation
 */
export interface InitializationResult {
  center: Coordinate;
  method: 'mrt_intersection' | 'accessibility_weighted' | 'enhanced_geometric';
  confidence: number;
  equityImprovement: number;
  outlierDetected?: UserLocation;
}

/**
 * Transport mode factors for equity calculation
 */
export const TRANSPORT_FACTORS = {
  DRIVING: 1.0,
  TRANSIT: 1.1,
  WALKING: 1.35,
  CYCLING: 1.2
} as const;

/**
 * Singapore MRT station network data
 */
export const MRT_STATIONS: readonly MRTStation[] = [
  { id: 'NS22', name: 'Orchard', lat: 1.3048, lng: 103.8318, lines: ['NS', 'TE'] },
  { id: 'CE1', name: 'Marina Bay', lat: 1.2800, lng: 103.8540, lines: ['CE', 'NS'] },
  { id: 'EW14', name: 'Raffles Place', lat: 1.2840, lng: 103.8515, lines: ['EW', 'NS'] },
  { id: 'EW12', name: 'Bugis', lat: 1.3000, lng: 103.8556, lines: ['EW', 'DT'] },
  { id: 'NE5', name: 'Clarke Quay', lat: 1.2884, lng: 103.8467, lines: ['NE'] },
  { id: 'NS9', name: 'Somerset', lat: 1.3005, lng: 103.8384, lines: ['NS'] },
  { id: 'EW13', name: 'City Hall', lat: 1.2933, lng: 103.8520, lines: ['EW', 'NS'] },
  { id: 'CC9', name: 'Dhoby Ghaut', lat: 1.2989, lng: 103.8453, lines: ['CC', 'NE', 'NS'] },
  { id: 'DT14', name: 'Chinatown', lat: 1.2844, lng: 103.8441, lines: ['DT', 'NE'] },
  { id: 'EW16', name: 'Outram Park', lat: 1.2802, lng: 103.8396, lines: ['EW', 'NE'] }
] as const;

/**
 * Configuration constants
 */
export const CONFIG = {
  /** Maximum walking distance to MRT station in meters */
  MAX_WALKING_DISTANCE_TO_MRT: 800,
  /** 15-minute isochrone radius in degrees (approximation) */
  ISOCHRONE_RADIUS_DEGREES: 0.135,
  /** Outlier threshold multiplier for median travel time */
  OUTLIER_THRESHOLD_MULTIPLIER: 1.5,
  /** Performance target in milliseconds */
  PERFORMANCE_TARGET_MS: 2000
} as const;

/**
 * Custom error class for transport-aware initialization errors
 */
export class TransportAwareInitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransportAwareInitializationError';
  }
}

/**
 * Calculates the Haversine distance between two coordinates in meters
 */
export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Converts degrees to radians
 */
const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

/**
 * Finds MRT stations accessible to transit users within walking distance
 */
export const findAccessibleMRTStations = (
  users: readonly UserLocation[]
): MRTStation[] => {
  const transitUsers = users.filter(user => user.mode === 'TRANSIT');
  
  if (transitUsers.length === 0) {
    return [];
  }

  // For each station, check if it's accessible to any transit user
  const accessibleStations = MRT_STATIONS.filter(station => {
    return transitUsers.some(user => {
      const distance = calculateDistance(user, station);
      return distance <= CONFIG.MAX_WALKING_DISTANCE_TO_MRT;
    });
  });

  return accessibleStations;
};

/**
 * Calculates accessibility weights for users based on 15-minute isochrones
 */
export const calculateAccessibilityWeights = (
  users: readonly UserLocation[],
  center: Coordinate
): AccessibilityWeight[] => {
  return users.map(user => {
    const distance = calculateDistance(user, center);
    const transportFactor = TRANSPORT_FACTORS[user.mode];
    
    // Calculate accessibility score based on distance and transport mode
    const normalizedDistance = distance / (CONFIG.ISOCHRONE_RADIUS_DEGREES * 111000); // Convert to normalized distance
    const accessibilityScore = Math.max(0, 1 - (normalizedDistance * transportFactor));
    
    // Weight is inversely proportional to transport difficulty
    const weight = accessibilityScore / transportFactor;
    
    return {
      user,
      weight: Math.max(0.1, weight), // Minimum weight to avoid zero division
      accessibilityScore
    };
  });
};

/**
 * Detects transport outliers based on travel time distribution
 */
export const detectTransportOutliers = (
  users: readonly UserLocation[],
  center: Coordinate
): UserLocation | undefined => {
  if (users.length < 3) {
    return undefined; // Need at least 3 users to detect outliers
  }

  // Calculate travel times with transport factors
  const travelTimes = users.map(user => {
    const distance = calculateDistance(user, center);
    const transportFactor = TRANSPORT_FACTORS[user.mode];
    return distance * transportFactor;
  });

  // Calculate median travel time
  const sortedTimes = [...travelTimes].sort((a, b) => a - b);
  const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
  
  // Find users with travel time > 2x median (more lenient threshold)
  const outlierThreshold = median * 2.0;
  
  for (let i = 0; i < users.length; i++) {
    if (travelTimes[i] > outlierThreshold) {
      return users[i];
    }
  }

  return undefined;
};

/**
 * Method 1: Find intersection of accessible MRT stations for transit users
 */
export const calculateMRTIntersectionCenter = (
  users: readonly UserLocation[]
): Coordinate | null => {
  const accessibleStations = findAccessibleMRTStations(users);
  
  if (accessibleStations.length === 0) {
    return null;
  }

  // Calculate centroid of accessible stations
  const sumLat = accessibleStations.reduce((sum, station) => sum + station.lat, 0);
  const sumLng = accessibleStations.reduce((sum, station) => sum + station.lng, 0);
  
  return {
    lat: sumLat / accessibleStations.length,
    lng: sumLng / accessibleStations.length
  };
};

/**
 * Method 2: Calculate accessibility-weighted geographic center
 */
export const calculateAccessibilityWeightedCenter = (
  users: readonly UserLocation[]
): Coordinate => {
  // Start with geometric center as initial guess
  let currentCenter = calculateGeometricCenter(users);
  
  // For transport-aware improvement, bias the center towards users with slower transport modes
  // This compensates for their longer effective travel times
  let weightedLat = 0;
  let weightedLng = 0;
  let totalWeight = 0;
  
  users.forEach(user => {
    const transportFactor = TRANSPORT_FACTORS[user.mode];
    // Higher transport factor means slower transport, so give them more weight
    const userWeight = (user.weight || 1) * transportFactor;
    
    weightedLat += user.lat * userWeight;
    weightedLng += user.lng * userWeight;
    totalWeight += userWeight;
  });
  
  if (totalWeight === 0) {
    return currentCenter;
  }
  
  return {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight
  };
};

/**
 * Method 3: Enhanced geometric center with transport weighting
 */
export const calculateEnhancedGeometricCenter = (
  users: readonly UserLocation[]
): Coordinate => {
  let weightedLat = 0;
  let weightedLng = 0;
  let totalWeight = 0;

  users.forEach(user => {
    const transportFactor = TRANSPORT_FACTORS[user.mode];
    // Give more weight to users with slower transport modes to compensate
    const userWeight = (user.weight || 1) * transportFactor; // Direct multiplication for more weight
    
    weightedLat += user.lat * userWeight;
    weightedLng += user.lng * userWeight;
    totalWeight += userWeight;
  });

  return {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight
  };
};

/**
 * Calculate simple geometric center (for comparison baseline)
 */
export const calculateGeometricCenter = (
  users: readonly UserLocation[]
): Coordinate => {
  const sumLat = users.reduce((sum, user) => sum + user.lat, 0);
  const sumLng = users.reduce((sum, user) => sum + user.lng, 0);
  
  return {
    lat: sumLat / users.length,
    lng: sumLng / users.length
  };
};

/**
 * Calculate equity improvement compared to geometric centroid
 */
export const calculateEquityImprovement = (
  users: readonly UserLocation[],
  newCenter: Coordinate,
  geometricCenter: Coordinate
): number => {
  // Calculate travel times for both centers
  const newCenterTimes = users.map(user => {
    const distance = calculateDistance(user, newCenter);
    return distance * TRANSPORT_FACTORS[user.mode];
  });
  
  const geometricCenterTimes = users.map(user => {
    const distance = calculateDistance(user, geometricCenter);
    return distance * TRANSPORT_FACTORS[user.mode];
  });
  
  // Calculate Jain's fairness index for both
  const newCenterFairness = calculateJainsIndex(newCenterTimes);
  const geometricCenterFairness = calculateJainsIndex(geometricCenterTimes);
  
  // Calculate percentage improvement
  if (geometricCenterFairness === 0) {
    return newCenterFairness > 0 ? 100 : 0;
  }
  
  return ((newCenterFairness - geometricCenterFairness) / geometricCenterFairness) * 100;
};

/**
 * Main transport-aware initialization algorithm
 */
export const calculateTransportAwareCenter = (
  users: readonly UserLocation[]
): InitializationResult => {
  const startTime = performance.now();
  
  // Input validation
  if (!Array.isArray(users) || users.length === 0) {
    throw new TransportAwareInitializationError('Users array cannot be empty');
  }

  // Validate user data
  users.forEach((user, index) => {
    if (!user || !user.id || typeof user.id !== 'string' || user.id.trim() === '' ||
        typeof user.lat !== 'number' || typeof user.lng !== 'number') {
      throw new TransportAwareInitializationError(`Invalid user data at index ${index}`);
    }
    if (!['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING'].includes(user.mode)) {
      throw new TransportAwareInitializationError(`Invalid transport mode for user ${user.id}: ${user.mode}`);
    }
  });

  let center: Coordinate;
  let method: 'mrt_intersection' | 'accessibility_weighted' | 'enhanced_geometric';
  let confidence: number;

  // Method 1: Try MRT intersection for transit users
  const mrtCenter = calculateMRTIntersectionCenter(users);
  const transitUserCount = users.filter(u => u.mode === 'TRANSIT').length;
  
  if (mrtCenter && transitUserCount >= 2) {
    center = mrtCenter;
    method = 'mrt_intersection';
    confidence = 0.9; // High confidence for MRT-based calculation
  } else if (transitUserCount > 0) {
    // Method 2: Try accessibility-weighted center
    center = calculateAccessibilityWeightedCenter(users);
    method = 'accessibility_weighted';
    confidence = 0.7; // Medium confidence
  } else {
    // Method 3: Fallback to enhanced geometric center
    center = calculateEnhancedGeometricCenter(users);
    method = 'enhanced_geometric';
    confidence = 0.5; // Lower confidence for fallback method
  }

  // Calculate equity improvement
  const geometricCenter = calculateGeometricCenter(users);
  const equityImprovement = calculateEquityImprovement(users, center, geometricCenter);
  
  // Detect outliers
  const outlierDetected = detectTransportOutliers(users, center);

  // Check performance target
  const executionTime = performance.now() - startTime;
  if (executionTime > CONFIG.PERFORMANCE_TARGET_MS) {
    console.warn(`Transport-aware initialization took ${executionTime}ms, exceeding target of ${CONFIG.PERFORMANCE_TARGET_MS}ms`);
  }

  return {
    center,
    method,
    confidence,
    equityImprovement,
    outlierDetected
  };
};

/**
 * Utility function to create sample Singapore locations for testing
 */
export const createSingaporeTestLocations = (): UserLocation[] => {
  return [
    // Orchard area users
    { id: 'user1', lat: 1.3048, lng: 103.8318, mode: 'TRANSIT' }, // Orchard MRT
    { id: 'user2', lat: 1.3020, lng: 103.8350, mode: 'WALKING' }, // Near Orchard
    
    // Marina Bay area users
    { id: 'user3', lat: 1.2800, lng: 103.8540, mode: 'TRANSIT' }, // Marina Bay MRT
    { id: 'user4', lat: 1.2830, lng: 103.8560, mode: 'DRIVING' }, // Marina Bay Sands area
    
    // CBD area users
    { id: 'user5', lat: 1.2840, lng: 103.8515, mode: 'TRANSIT' }, // Raffles Place MRT
    { id: 'user6', lat: 1.2933, lng: 103.8520, mode: 'CYCLING' }, // City Hall area
    
    // NTU area user (potential outlier)
    { id: 'user7', lat: 1.3483, lng: 103.6831, mode: 'DRIVING' }, // NTU (far from CBD)
  ];
};