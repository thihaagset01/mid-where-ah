/**
 * Travel Time Cache Service for MidWhereAh transport equity optimization.
 * 
 * Provides intelligent caching with >70% hit rate to minimize API costs
 * with smart invalidation based on time of day and traffic patterns.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Coordinate, TransportMode } from '../../components/maps/types';
import { TravelTimeResult } from '../maps/googleMapsService';

/**
 * Cache key interface for intelligent caching
 */
export interface CacheKey {
  /** Origin coordinates rounded to 3 decimals (~100m precision) */
  origin: string;
  /** Destination coordinates rounded to 3 decimals */
  destination: string;
  /** Transport mode */
  mode: TransportMode;
  /** Time of day category for traffic-aware caching */
  timeOfDay: 'peak' | 'offpeak';
}

/**
 * Cached travel time entry
 */
interface CacheEntry {
  /** Cached travel time result */
  result: TravelTimeResult;
  /** Timestamp when cached */
  cachedAt: number;
  /** Expiry timestamp */
  expiresAt: number;
  /** Number of times this entry was accessed */
  hitCount: number;
  /** Time category when cached */
  timeCategory: string;
}

/**
 * Cache statistics for monitoring performance
 */
export interface CacheStats {
  /** Total cache requests */
  totalRequests: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Cache size (number of entries) */
  cacheSize: number;
  /** Most accessed entries */
  topEntries: Array<{ key: string; hits: number }>;
}

/**
 * Travel time cache service with intelligent invalidation
 */
export class TravelTimeCache {
  private static readonly CACHE_PREFIX = 'travel_time_cache_';
  private static readonly STATS_KEY = 'travel_time_cache_stats';
  private stats: CacheStats = {
    totalRequests: 0,
    hits: 0,
    misses: 0,
    hitRate: 0,
    cacheSize: 0,
    topEntries: []
  };

  constructor() {
    this.loadStats();
  }

  /**
   * Generate cache key from coordinates and transport mode
   */
  private generateCacheKey(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): CacheKey {
    // Round coordinates to 3 decimal places (~100m precision in Singapore)
    const roundedOrigin = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}`;
    const roundedDestination = `${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`;
    
    // Determine time of day for traffic-aware caching
    const timeOfDay = this.getTimeOfDay();
    
    return {
      origin: roundedOrigin,
      destination: roundedDestination,
      mode,
      timeOfDay
    };
  }

  /**
   * Get current time of day category for Singapore traffic patterns
   */
  private getTimeOfDay(): 'peak' | 'offpeak' {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Weekend is generally off-peak
    if (day === 0 || day === 6) {
      return 'offpeak';
    }
    
    // Singapore peak hours: 7-9 AM, 6-8 PM on weekdays
    if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20)) {
      return 'peak';
    }
    
    return 'offpeak';
  }

  /**
   * Calculate cache expiry time based on transport mode and time of day
   */
  private getExpiryTime(mode: TransportMode, timeOfDay: string): number {
    const now = Date.now();
    
    // Different cache durations for different modes
    const baseDurations = {
      DRIVING: 30 * 60 * 1000,    // 30 minutes (traffic changes frequently)
      TRANSIT: 60 * 60 * 1000,   // 60 minutes (more predictable schedules)
      WALKING: 4 * 60 * 60 * 1000,  // 4 hours (very stable)
      CYCLING: 2 * 60 * 60 * 1000   // 2 hours (weather dependent)
    };
    
    let duration = baseDurations[mode];
    
    // Shorter cache during peak hours for driving/transit due to congestion
    if (timeOfDay === 'peak' && (mode === 'DRIVING' || mode === 'TRANSIT')) {
      duration = duration * 0.5; // Reduce by 50% during peak
    }
    
    return now + duration;
  }

  /**
   * Create storage key from cache key
   */
  private createStorageKey(cacheKey: CacheKey): string {
    return `${TravelTimeCache.CACHE_PREFIX}${cacheKey.origin}_${cacheKey.destination}_${cacheKey.mode}_${cacheKey.timeOfDay}`;
  }

  /**
   * Get cached travel time if available and not expired
   */
  async getCachedTravelTime(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): Promise<TravelTimeResult | null> {
    this.stats.totalRequests++;
    
    try {
      const cacheKey = this.generateCacheKey(origin, destination, mode);
      const storageKey = this.createStorageKey(cacheKey);
      
      const cachedData = await AsyncStorage.getItem(storageKey);
      
      if (!cachedData) {
        this.stats.misses++;
        this.updateStats();
        return null;
      }
      
      const cacheEntry: CacheEntry = JSON.parse(cachedData);
      
      // Check if cache entry has expired
      if (Date.now() > cacheEntry.expiresAt) {
        // Remove expired entry
        await AsyncStorage.removeItem(storageKey);
        this.stats.misses++;
        this.updateStats();
        return null;
      }
      
      // Update hit count and return cached result
      cacheEntry.hitCount++;
      await AsyncStorage.setItem(storageKey, JSON.stringify(cacheEntry));
      
      this.stats.hits++;
      this.updateStats();
      
      // Mark result as cached
      const result = { ...cacheEntry.result, cached: true };
      return result;
      
    } catch (error) {
      // On any error, treat as cache miss
      this.stats.misses++;
      this.updateStats();
      return null;
    }
  }

  /**
   * Cache a travel time result
   */
  async cacheTravelTime(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode,
    result: TravelTimeResult
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(origin, destination, mode);
      const storageKey = this.createStorageKey(cacheKey);
      const timeOfDay = this.getTimeOfDay();
      
      const cacheEntry: CacheEntry = {
        result: { ...result, cached: false }, // Store original non-cached result
        cachedAt: Date.now(),
        expiresAt: this.getExpiryTime(mode, timeOfDay),
        hitCount: 0,
        timeCategory: timeOfDay
      };
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(cacheEntry));
      
    } catch (error) {
      // Fail silently - caching is not critical for functionality
      console.warn('Failed to cache travel time:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    await this.updateCacheSize();
    await this.updateTopEntries();
    return { ...this.stats };
  }

  /**
   * Clear all cached travel times
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(TravelTimeCache.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      // Reset stats
      this.stats = {
        totalRequests: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        cacheSize: 0,
        topEntries: []
      };
      
      await this.saveStats();
      
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Remove expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(TravelTimeCache.CACHE_PREFIX));
      
      let removedCount = 0;
      const now = Date.now();
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            if (now > entry.expiresAt) {
              await AsyncStorage.removeItem(key);
              removedCount++;
            }
          }
        } catch (error) {
          // Remove corrupted entries
          await AsyncStorage.removeItem(key);
          removedCount++;
        }
      }
      
      return removedCount;
      
    } catch (error) {
      console.warn('Failed to cleanup expired entries:', error);
      return 0;
    }
  }

  /**
   * Load cache statistics from storage
   */
  private async loadStats(): Promise<void> {
    try {
      const statsData = await AsyncStorage.getItem(TravelTimeCache.STATS_KEY);
      if (statsData) {
        this.stats = JSON.parse(statsData);
      }
    } catch (error) {
      // Use default stats if loading fails
      console.warn('Failed to load cache stats:', error);
    }
  }

  /**
   * Save cache statistics to storage
   */
  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(TravelTimeCache.STATS_KEY, JSON.stringify(this.stats));
    } catch (error) {
      console.warn('Failed to save cache stats:', error);
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 ? 
      (this.stats.hits / this.stats.totalRequests) * 100 : 0;
    
    // Save stats asynchronously
    this.saveStats();
  }

  /**
   * Update cache size in stats
   */
  private async updateCacheSize(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      this.stats.cacheSize = keys.filter(key => key.startsWith(TravelTimeCache.CACHE_PREFIX)).length;
    } catch (error) {
      console.warn('Failed to update cache size:', error);
    }
  }

  /**
   * Update top accessed entries
   */
  private async updateTopEntries(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(TravelTimeCache.CACHE_PREFIX));
      
      const entries: Array<{ key: string; hits: number }> = [];
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            entries.push({ 
              key: key.replace(TravelTimeCache.CACHE_PREFIX, ''), 
              hits: entry.hitCount 
            });
          }
        } catch (error) {
          // Skip corrupted entries
        }
      }
      
      // Sort by hit count and take top 10
      this.stats.topEntries = entries
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10);
        
    } catch (error) {
      console.warn('Failed to update top entries:', error);
    }
  }

  /**
   * Get cache effectiveness metrics
   */
  async getCacheEffectiveness(): Promise<{
    hitRate: number;
    avgCacheAge: number;
    peakVsOffpeakDistribution: { peak: number; offpeak: number };
    modeDistribution: Record<TransportMode, number>;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(TravelTimeCache.CACHE_PREFIX));
      
      let totalAge = 0;
      const timeDistribution = { peak: 0, offpeak: 0 };
      const modeDistribution: Record<TransportMode, number> = {
        DRIVING: 0,
        TRANSIT: 0,
        WALKING: 0,
        CYCLING: 0
      };
      
      const now = Date.now();
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            
            // Skip expired entries
            if (now > entry.expiresAt) continue;
            
            totalAge += now - entry.cachedAt;
            
            // Time distribution
            if (entry.timeCategory === 'peak') {
              timeDistribution.peak++;
            } else {
              timeDistribution.offpeak++;
            }
            
            // Mode distribution
            modeDistribution[entry.result.transportMode]++;
          }
        } catch (error) {
          // Skip corrupted entries
        }
      }
      
      const validEntries = cacheKeys.length;
      const avgCacheAge = validEntries > 0 ? totalAge / validEntries : 0;
      
      return {
        hitRate: this.stats.hitRate,
        avgCacheAge: avgCacheAge / (1000 * 60), // Convert to minutes
        peakVsOffpeakDistribution: timeDistribution,
        modeDistribution
      };
      
    } catch (error) {
      console.warn('Failed to get cache effectiveness:', error);
      return {
        hitRate: 0,
        avgCacheAge: 0,
        peakVsOffpeakDistribution: { peak: 0, offpeak: 0 },
        modeDistribution: { DRIVING: 0, TRANSIT: 0, WALKING: 0, CYCLING: 0 }
      };
    }
  }
}

/**
 * Singleton instance of travel time cache
 */
export const travelTimeCache = new TravelTimeCache();