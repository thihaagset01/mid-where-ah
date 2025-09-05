/**
 * Optimization Service for MidWhereAh transport equity optimization.
 * 
 * Bridges LocationInput UI components with Jain's Fairness Index algorithms
 * to provide real-time equity calculations and optimal meeting point discovery.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import { 
  calculateEquityAnalysis, 
  calculateJainsIndex,
  TravelTimeData,
  EquityResult 
} from '../../algorithms/equity/jainsIndex';
import { 
  assessEquityLevel, 
  EquityAssessment,
  EquityContext,
  EquityLevel,
  createEquityContext 
} from '../../algorithms/equity/equityLevel';
import { Coordinate, TransportMode } from '../../components/maps/types';
import { UserLocationInput } from '../../components/location/types';
import { travelTimeService, TravelTimeResult } from '../maps';

/**
 * Optimization request interface
 */
export interface OptimizationRequest {
  /** Array of user location inputs with transport modes */
  locations: UserLocationInput[];
  /** Unique identifier for this optimization request */
  optimizationId: string;
  /** Timestamp when optimization was requested */
  timestamp: Date;
}

/**
 * Optimization result interface
 */
export interface OptimizationResult {
  /** Unique identifier for this result */
  id: string;
  /** Optimal meeting location coordinates */
  optimalLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  /** Comprehensive equity analysis from Jain's Index */
  equityAnalysis: EquityResult;
  /** Classified equity level (excellent/good/fair/poor/critical) */
  equityLevel: EquityLevel;
  /** Complete equity assessment with recommendations */
  equityAssessment: EquityAssessment;
  /** Individual travel times for each participant */
  participantTravelTimes: TravelTimeData[];
  /** Percentage improvement vs geometric baseline */
  improvementVsBaseline: number;
  /** Total calculation time in milliseconds */
  calculationTime: number;
  /** Confidence score (0-1 scale) based on data quality */
  confidence: number;
  /** Timestamp when optimization completed */
  completedAt: Date;
  /** API usage statistics for this optimization */
  apiUsage: {
    googleMapsRequests: number;
    oneMapRequests: number;
    cacheHits: number;
    totalApiCost: number;
  };
}

/**
 * Optimization progress tracking interface
 */
export interface OptimizationProgress {
  /** Current calculation stage */
  stage: 'initializing' | 'calculating' | 'analyzing' | 'complete';
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable progress message */
  message: string;
  /** Current stage completion time */
  stageTime?: number;
}

/**
 * Custom error class for optimization service errors
 */
export class OptimizationServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'OptimizationServiceError';
  }
}

/**
 * Singapore transport speed constants (km/h) - kept for reference only
 * Real travel times now come from Google Maps and OneMap APIs
 */
const SINGAPORE_AVERAGE_SPEEDS = {
  DRIVING: 30,   // Realistic Singapore traffic conditions
  TRANSIT: 25,   // MRT/Bus including walking and transfers
  WALKING: 5,    // Comfortable walking pace
  CYCLING: 15    // Cycling with traffic and infrastructure
} as const;

/**
 * Transport mode adjustment factors for Singapore conditions - kept for reference
 * Real adjustments now handled by APIs and cache system
 */
const TRANSPORT_FACTORS = {
  DRIVING: 1.0,    // Baseline travel time
  TRANSIT: 1.1,    // +10% (walking + transfers)
  WALKING: 1.35,   // +35% (climate factors, heat, humidity)
  CYCLING: 1.2     // +20% (infrastructure, safety considerations)
} as const;

/**
 * Calculates the haversine distance between two coordinates in kilometers.
 * 
 * @param from Starting coordinate
 * @param to Ending coordinate
 * @returns Distance in kilometers
 */
const haversineDistance = (from: Coordinate, to: Coordinate): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (to.latitude - from.latitude) * Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculates real travel time using the fallback chain:
 * 1. Google Maps API
 * 2. OneMap Singapore API  
 * 3. Haversine estimation
 * 
 * @param from Starting coordinate
 * @param to Ending coordinate  
 * @param transportMode Transport mode for calculation
 * @returns Promise resolving to travel time result
 */
const calculateRealTravelTime = async (
  from: Coordinate, 
  to: Coordinate, 
  transportMode: TransportMode
): Promise<TravelTimeResult> => {
  return travelTimeService.getTravelTime(from, to, transportMode);
};

/**
 * DEPRECATED: Mock travel time calculation - kept for reference only
 * Real travel times now come from Google Maps and OneMap APIs
 */
const calculateMockTravelTime = (
  from: Coordinate, 
  to: Coordinate, 
  transportMode: TransportMode
): number => {
  const baseDistance = haversineDistance(from, to);
  const baseSpeed = SINGAPORE_AVERAGE_SPEEDS[transportMode];
  const baseTime = (baseDistance / baseSpeed) * 60; // Convert to minutes
  const adjustedTime = baseTime * TRANSPORT_FACTORS[transportMode];
  
  return Math.round(adjustedTime * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculates the geometric centroid of all user locations.
 * Used as baseline for improvement calculation.
 * 
 * @param locations Array of user location inputs
 * @returns Geometric centroid coordinate
 */
const calculateGeometricCentroid = (locations: UserLocationInput[]): Coordinate => {
  const validLocations = locations.filter(loc => loc.coordinate);
  
  if (validLocations.length === 0) {
    throw new OptimizationServiceError('No valid coordinates found for centroid calculation');
  }
  
  const totalLat = validLocations.reduce((sum, loc) => sum + loc.coordinate!.latitude, 0);
  const totalLon = validLocations.reduce((sum, loc) => sum + loc.coordinate!.longitude, 0);
  
  return {
    latitude: totalLat / validLocations.length,
    longitude: totalLon / validLocations.length
  };
};

/**
 * Validates optimization request data.
 * 
 * @param request Optimization request to validate
 * @throws {OptimizationServiceError} When validation fails
 */
const validateOptimizationRequest = (request: OptimizationRequest): void => {
  if (!request || typeof request !== 'object') {
    throw new OptimizationServiceError('Invalid optimization request', 'INVALID_REQUEST');
  }
  
  if (!Array.isArray(request.locations)) {
    throw new OptimizationServiceError('Locations must be an array', 'INVALID_LOCATIONS');
  }
  
  if (request.locations.length < 2) {
    throw new OptimizationServiceError('At least 2 locations are required for optimization', 'INSUFFICIENT_LOCATIONS');
  }
  
  if (request.locations.length > 10) {
    throw new OptimizationServiceError('Maximum 10 locations allowed for optimization', 'TOO_MANY_LOCATIONS');
  }
  
  // Validate each location has required data
  const invalidLocations = request.locations.filter(loc => 
    !loc.id || 
    !loc.coordinate || 
    typeof loc.coordinate.latitude !== 'number' ||
    typeof loc.coordinate.longitude !== 'number' ||
    !loc.transportMode
  );
  
  if (invalidLocations.length > 0) {
    throw new OptimizationServiceError(
      `${invalidLocations.length} locations have invalid coordinates or transport modes`,
      'INVALID_COORDINATES'
    );
  }
  
  // Check for duplicate locations (within 100m)
  const duplicates = [];
  for (let i = 0; i < request.locations.length; i++) {
    for (let j = i + 1; j < request.locations.length; j++) {
      const distance = haversineDistance(
        request.locations[i].coordinate!,
        request.locations[j].coordinate!
      );
      if (distance < 0.1) { // Less than 100m
        duplicates.push({ i, j, distance });
      }
    }
  }
  
  if (duplicates.length > 0) {
    throw new OptimizationServiceError(
      `Found ${duplicates.length} duplicate locations within 100m of each other`,
      'DUPLICATE_LOCATIONS'
    );
  }
};

/**
 * Main optimization service class providing equity-based meeting point optimization.
 */
export class OptimizationService {
  private progressCallback?: (progress: OptimizationProgress) => void;
  
  /**
   * Sets a callback function to receive optimization progress updates.
   * 
   * @param callback Function to call with progress updates
   */
  setProgressCallback(callback: (progress: OptimizationProgress) => void): void {
    this.progressCallback = callback;
  }
  
  /**
   * Reports progress to the registered callback.
   * 
   * @param progress Progress information to report
   */
  private reportProgress(progress: OptimizationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
  
  /**
   * Optimizes meeting point location using Jain's Fairness Index for equity.
   * 
   * This method:
   * 1. Validates input locations
   * 2. Calculates geometric centroid as baseline
   * 3. Computes travel times for optimal point (currently centroid + small offset for Singapore)
   * 4. Runs Jain's Index equity analysis  
   * 5. Classifies equity level and generates recommendations
   * 6. Calculates improvement vs baseline
   * 
   * @param request Optimization request with user locations
   * @returns Promise resolving to optimization result
   * @throws {OptimizationServiceError} When optimization fails
   */
  async optimizeLocation(request: OptimizationRequest): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    try {
      // Stage 1: Initialize and validate
      this.reportProgress({
        stage: 'initializing',
        progress: 0,
        message: 'Validating locations and initializing optimization...'
      });
      
      validateOptimizationRequest(request);
      
      await this.delay(200); // Simulate initialization time
      
      // Stage 2: Calculate optimal location
      this.reportProgress({
        stage: 'calculating',
        progress: 25,
        message: 'Calculating optimal meeting point...'
      });
      
      // For now, use geometric centroid with small Singapore-specific adjustment
      // This will be replaced with actual optimization algorithm later
      const geometricCenter = calculateGeometricCentroid(request.locations);
      
      // Small offset toward Singapore CBD for more realistic results
      const SINGAPORE_CBD_CENTER = { latitude: 1.2850, longitude: 103.8537 };
      const optimalLocation: Coordinate = {
        latitude: geometricCenter.latitude + (SINGAPORE_CBD_CENTER.latitude - geometricCenter.latitude) * 0.1,
        longitude: geometricCenter.longitude + (SINGAPORE_CBD_CENTER.longitude - geometricCenter.longitude) * 0.1
      };
      
      await this.delay(300);
      
      // Stage 3: Equity analysis with real travel times
      this.reportProgress({
        stage: 'analyzing',
        progress: 50,
        message: 'Analyzing travel equity and fairness with real travel times...'
      });
      
      // Calculate real travel times from each location to optimal point using APIs
      const travelTimePromises = request.locations.map(async (location, index) => {
        const result = await calculateRealTravelTime(
          location.coordinate!,
          optimalLocation,
          location.transportMode
        );
        
        return {
          id: location.id,
          travelTimeMinutes: result.travelTimeMinutes,
          userId: location.id,
          locationName: location.address || `Location ${index + 1}`,
          apiSource: result.source,
          cached: result.cached
        };
      });
      
      const participantTravelTimeResults = await Promise.all(travelTimePromises);
      
      // Convert to TravelTimeData format for equity analysis
      const participantTravelTimes: TravelTimeData[] = participantTravelTimeResults.map(result => ({
        id: result.id,
        travelTimeMinutes: result.travelTimeMinutes,
        userId: result.userId,
        locationName: result.locationName
      }));
      
      // Count API usage for statistics
      const apiUsage = {
        googleMapsRequests: participantTravelTimeResults.filter(r => r.apiSource === 'google_maps').length,
        oneMapRequests: participantTravelTimeResults.filter(r => r.apiSource === 'onemap').length,
        cacheHits: participantTravelTimeResults.filter(r => r.cached).length,
        totalApiCost: participantTravelTimeResults.filter(r => r.apiSource === 'google_maps').length * 0.005 // $0.005 per Google Maps request
      };
      
      // Run Jain's Index equity analysis
      const equityAnalysis = calculateEquityAnalysis(participantTravelTimes);
      
      await this.delay(200);
      
      // Calculate baseline comparison using geometric centroid with real travel times
      const baselineTravelTimePromises = request.locations.map(async (location, index) => {
        const result = await calculateRealTravelTime(
          location.coordinate!,
          geometricCenter,
          location.transportMode
        );
        
        return {
          id: `baseline_${location.id}`,
          travelTimeMinutes: result.travelTimeMinutes,
          userId: location.id,
          locationName: `Baseline ${index + 1}`
        };
      });
      
      const baselineTravelTimes: TravelTimeData[] = await Promise.all(baselineTravelTimePromises);
      
      const baselineEquityAnalysis = calculateEquityAnalysis(baselineTravelTimes);
      
      // Calculate improvement percentage
      const improvementVsBaseline = 
        ((equityAnalysis.fairnessIndex - baselineEquityAnalysis.fairnessIndex) / baselineEquityAnalysis.fairnessIndex) * 100;
      
      await this.delay(150);
      
      // Stage 4: Generate assessment and recommendations
      this.reportProgress({
        stage: 'analyzing',
        progress: 80,
        message: 'Generating equity assessment and recommendations...'
      });
      
      // Create equity context for recommendations
      const transportModes = [...new Set(request.locations.map(loc => loc.transportMode))];
      const travelTimes = participantTravelTimes.map(data => data.travelTimeMinutes);
      const avgTravelTime = travelTimes.reduce((sum, time) => sum + time, 0) / travelTimes.length;
      const timeRange = Math.max(...travelTimes) - Math.min(...travelTimes);
      
      const equityContext: EquityContext = createEquityContext(
        request.locations.length,
        transportModes,
        avgTravelTime,
        timeRange
      );
      
      const equityAssessment = assessEquityLevel(equityAnalysis, equityContext);
      
      await this.delay(100);
      
      // Complete optimization
      this.reportProgress({
        stage: 'complete',
        progress: 100,
        message: 'Optimization completed successfully with real Singapore travel times!'
      });
      
      const calculationTime = Date.now() - startTime;
      
      const result: OptimizationResult = {
        id: `opt_${request.optimizationId}_${Date.now()}`,
        optimalLocation: {
          latitude: optimalLocation.latitude,
          longitude: optimalLocation.longitude,
          address: await this.reverseGeocode(optimalLocation) // Mock reverse geocoding
        },
        equityAnalysis,
        equityLevel: equityAssessment.level,
        equityAssessment,
        participantTravelTimes,
        improvementVsBaseline: Math.round(improvementVsBaseline * 100) / 100,
        calculationTime,
        confidence: equityAssessment.confidence,
        completedAt: new Date(),
        apiUsage
      };
      
      return result;
      
    } catch (error) {
      if (error instanceof OptimizationServiceError) {
        throw error;
      }
      
      throw new OptimizationServiceError(
        `Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'OPTIMIZATION_FAILED'
      );
    }
  }
  
  /**
   * Utility method to add delays for smooth UX.
   * 
   * @param ms Delay in milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Mock reverse geocoding to get address from coordinates.
   * Will be replaced with actual geocoding service later.
   * 
   * @param coordinate Coordinate to reverse geocode
   * @returns Promise resolving to formatted address
   */
  private async reverseGeocode(coordinate: Coordinate): Promise<string> {
    // Mock implementation - would use actual geocoding service
    return `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)} (Singapore)`;
  }

  /**
   * Get travel time service status including API usage and costs
   */
  async getServiceStatus() {
    return travelTimeService.getServiceStatus();
  }

  /**
   * Perform cache maintenance and cleanup
   */
  async performMaintenance() {
    return travelTimeService.performMaintenance();
  }
}

/**
 * Singleton instance of the optimization service.
 */
export const optimizationService = new OptimizationService();

/**
 * Convenience function to start optimization with progress tracking.
 * 
 * @param locations Array of user location inputs
 * @param onProgress Optional progress callback
 * @returns Promise resolving to optimization result
 */
export const startOptimization = async (
  locations: UserLocationInput[],
  onProgress?: (progress: OptimizationProgress) => void
): Promise<OptimizationResult> => {
  const request: OptimizationRequest = {
    locations,
    optimizationId: `req_${Date.now()}`,
    timestamp: new Date()
  };
  
  if (onProgress) {
    optimizationService.setProgressCallback(onProgress);
  }
  
  return optimizationService.optimizeLocation(request);
};