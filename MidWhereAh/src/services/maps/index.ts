/**
 * Maps Services Index
 * 
 * Exports all map-related services for MidWhereAh transport equity optimization.
 */

export { GoogleMapsService, googleMapsService, TravelTimeResult } from './googleMapsService';
export { OneMapService, oneMapService } from './oneMapService';
export { TravelTimeCache, travelTimeCache, CacheStats } from '../cache/travelTimeCache';

/**
 * Travel time service with fallback chain and intelligent caching
 */
import { googleMapsService } from './googleMapsService';
import { oneMapService } from './oneMapService';
import { travelTimeCache } from '../cache/travelTimeCache';
import { Coordinate, TransportMode } from '../../components/maps/types';
import { TravelTimeResult } from './googleMapsService';

/**
 * Haversine distance calculation for final fallback
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
 * Final fallback using haversine estimation
 */
const haversineEstimation = async (
  origin: Coordinate,
  destination: Coordinate,
  mode: TransportMode
): Promise<TravelTimeResult> => {
  const distance = haversineDistance(origin, destination);
  
  // Singapore-adjusted speeds with real-world factors
  const speeds = {
    DRIVING: 22,   // Singapore traffic conditions
    TRANSIT: 18,   // MRT/Bus with realistic transfers
    WALKING: 3.5,  // Heat, humidity, infrastructure
    CYCLING: 10    // Safety, infrastructure limitations
  };

  const baseTime = (distance / speeds[mode]) * 60; // Convert to minutes
  
  // Additional penalties for Singapore conditions
  const penalties = {
    DRIVING: 1.4,   // Peak hour congestion
    TRANSIT: 1.5,   // Waiting and transfer times
    WALKING: 1.6,   // Weather and pedestrian infrastructure
    CYCLING: 1.4    // Safety considerations
  };

  const adjustedTime = baseTime * penalties[mode];

  return {
    travelTimeMinutes: Math.round(adjustedTime),
    distanceKm: Math.round(distance * 100) / 100,
    transportMode: mode,
    source: 'haversine',
    cached: false,
    status: 'success'
  };
};

/**
 * Unified travel time service with fallback chain:
 * 1. Cache lookup
 * 2. Google Maps API
 * 3. OneMap Singapore API
 * 4. Haversine estimation
 */
export class TravelTimeService {
  /**
   * Get travel time with intelligent fallback chain
   */
  async getTravelTime(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): Promise<TravelTimeResult> {
    
    // Step 1: Try cache first
    const cachedResult = await travelTimeCache.getCachedTravelTime(origin, destination, mode);
    if (cachedResult) {
      return cachedResult;
    }

    let result: TravelTimeResult;

    // Step 2: Try Google Maps API
    try {
      result = await googleMapsService.getTravelTime(origin, destination, mode);
      
      if (result.status === 'success') {
        // Cache successful result
        await travelTimeCache.cacheTravelTime(origin, destination, mode, result);
        return result;
      }
    } catch (error) {
      console.warn('Google Maps API failed:', error);
    }

    // Step 3: Try OneMap Singapore API
    try {
      result = await oneMapService.getTravelTime(origin, destination, mode);
      
      if (result.status === 'success') {
        // Cache successful result (even from fallback)
        await travelTimeCache.cacheTravelTime(origin, destination, mode, result);
        return result;
      }
    } catch (error) {
      console.warn('OneMap API failed:', error);
    }

    // Step 4: Final fallback to haversine estimation
    result = await haversineEstimation(origin, destination, mode);
    
    // Cache even haversine estimations with shorter expiry
    await travelTimeCache.cacheTravelTime(origin, destination, mode, result);
    
    return result;
  }

  /**
   * Get batch travel times with parallel processing and fallback
   */
  async getBatchTravelTimes(
    origins: Coordinate[],
    destination: Coordinate,
    modes: TransportMode[]
  ): Promise<TravelTimeResult[]> {
    const promises: Promise<TravelTimeResult>[] = [];
    
    for (const origin of origins) {
      for (const mode of modes) {
        promises.push(this.getTravelTime(origin, destination, mode));
      }
    }
    
    // Process all requests in parallel
    return Promise.all(promises);
  }

  /**
   * Get service status and cost monitoring
   */
  async getServiceStatus() {
    const [googleStatus, cacheStats] = await Promise.all([
      googleMapsService.getServiceStatus(),
      travelTimeCache.getCacheStats()
    ]);

    return {
      googleMaps: googleStatus,
      cache: cacheStats,
      oneMapAvailable: await oneMapService.isServiceAvailable()
    };
  }

  /**
   * Cleanup and maintenance
   */
  async performMaintenance() {
    const removedEntries = await travelTimeCache.cleanupExpiredEntries();
    const cacheStats = await travelTimeCache.getCacheStats();
    
    return {
      expiredEntriesRemoved: removedEntries,
      currentCacheStats: cacheStats
    };
  }
}

/**
 * Singleton instance of travel time service
 */
export const travelTimeService = new TravelTimeService();