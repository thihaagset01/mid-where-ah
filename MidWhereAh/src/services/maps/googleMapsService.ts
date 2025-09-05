/**
 * Google Maps Service for MidWhereAh transport equity optimization.
 * 
 * Provides real travel time calculations using Google Maps Directions API
 * with rate limiting, circuit breaker pattern, and cost monitoring.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import axios, { AxiosResponse } from 'axios';
import { Coordinate, TransportMode } from '../../components/maps/types';

/**
 * Travel time result interface
 */
export interface TravelTimeResult {
  /** Travel time in minutes */
  travelTimeMinutes: number;
  /** Distance in kilometers */
  distanceKm: number;
  /** Transport mode used */
  transportMode: TransportMode;
  /** API source used (google_maps, onemap, haversine) */
  source: 'google_maps' | 'onemap' | 'haversine';
  /** Whether result came from cache */
  cached: boolean;
  /** API response status */
  status: 'success' | 'error' | 'rate_limited';
  /** Optional error message */
  error?: string;
}

/**
 * Google Maps API response interfaces
 */
interface GoogleMapsDirectionsResponse {
  routes: Array<{
    legs: Array<{
      duration: { value: number; text: string };
      distance: { value: number; text: string };
    }>;
  }>;
  status: string;
  error_message?: string;
}

/**
 * Rate limiter class for controlling API request frequency
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number; // in milliseconds

  constructor(config: { requests: number; per: 'second' | 'minute' | 'hour' }) {
    this.maxRequests = config.requests;
    this.timeWindow = config.per === 'second' ? 1000 : 
                     config.per === 'minute' ? 60000 : 
                     3600000; // hour
  }

  /**
   * Check if request can be made within rate limits
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove old requests outside time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    return this.requests.length < this.maxRequests;
  }

  /**
   * Record a new request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }

  /**
   * Get time until next request can be made (in ms)
   */
  timeUntilNextRequest(): number {
    if (this.canMakeRequest()) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    return this.timeWindow - (Date.now() - oldestRequest);
  }
}

/**
 * Circuit breaker pattern for handling API failures
 */
class CircuitBreaker {
  private failures: number = 0;
  private nextAttempt: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 30000 // 30 seconds
  ) {}

  /**
   * Check if circuit breaker allows request
   */
  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open' && Date.now() >= this.nextAttempt) {
      this.state = 'half-open';
      return true;
    }
    return false;
  }

  /**
   * Record successful request
   */
  onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  /**
   * Record failed request
   */
  onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): string {
    return this.state;
  }
}

/**
 * Cost monitoring for Google Maps API usage
 */
class CostMonitor {
  private dailyRequests: { [date: string]: number } = {};
  private readonly costPerRequest: number = 0.005; // $0.005 per direction request
  private readonly dailyBudget: number = 10; // $10 daily budget

  /**
   * Record an API request for cost tracking
   */
  recordRequest(): void {
    const today = new Date().toISOString().split('T')[0];
    this.dailyRequests[today] = (this.dailyRequests[today] || 0) + 1;
  }

  /**
   * Get today's cost
   */
  getTodaysCost(): number {
    const today = new Date().toISOString().split('T')[0];
    const requests = this.dailyRequests[today] || 0;
    return requests * this.costPerRequest;
  }

  /**
   * Check if we're approaching budget limit
   */
  isApproachingBudget(): boolean {
    return this.getTodaysCost() >= this.dailyBudget * 0.8; // 80% threshold
  }

  /**
   * Check if budget is exceeded
   */
  isBudgetExceeded(): boolean {
    return this.getTodaysCost() >= this.dailyBudget;
  }

  /**
   * Get budget status
   */
  getBudgetStatus(): {
    used: number;
    remaining: number;
    percentage: number;
    requests: number;
  } {
    const used = this.getTodaysCost();
    const today = new Date().toISOString().split('T')[0];
    const requests = this.dailyRequests[today] || 0;
    
    return {
      used,
      remaining: this.dailyBudget - used,
      percentage: (used / this.dailyBudget) * 100,
      requests
    };
  }
}

/**
 * Google Maps service class with rate limiting and cost management
 */
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly rateLimiter: RateLimiter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly costMonitor: CostMonitor;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';

  constructor(apiKey?: string) {
    // In production, this would come from environment variables
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || 'DEMO_KEY';
    
    // Rate limiting: 50 requests per second (Google Maps limit)
    this.rateLimiter = new RateLimiter({ requests: 50, per: 'second' });
    
    // Circuit breaker: 5 failures within 30 seconds
    this.circuitBreaker = new CircuitBreaker(5, 30000);
    
    // Cost monitoring
    this.costMonitor = new CostMonitor();
  }

  /**
   * Convert transport mode to Google Maps travel mode
   */
  private getGoogleMapsMode(mode: TransportMode): string {
    switch (mode) {
      case 'DRIVING':
        return 'driving';
      case 'TRANSIT':
        return 'transit';
      case 'WALKING':
        return 'walking';
      case 'CYCLING':
        return 'bicycling';
      default:
        return 'driving';
    }
  }

  /**
   * Validate Singapore coordinates
   */
  private isValidSingaporeCoordinate(coord: Coordinate): boolean {
    return (
      coord.latitude >= 1.2 && coord.latitude <= 1.5 &&
      coord.longitude >= 103.6 && coord.longitude <= 104.0
    );
  }

  /**
   * Get travel time between two coordinates using Google Maps Directions API
   */
  async getTravelTime(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): Promise<TravelTimeResult> {
    // Validate coordinates are in Singapore
    if (!this.isValidSingaporeCoordinate(origin) || !this.isValidSingaporeCoordinate(destination)) {
      return {
        travelTimeMinutes: 0,
        distanceKm: 0,
        transportMode: mode,
        source: 'google_maps',
        cached: false,
        status: 'error',
        error: 'Coordinates outside Singapore bounds'
      };
    }

    // Check circuit breaker
    if (!this.circuitBreaker.canExecute()) {
      return {
        travelTimeMinutes: 0,
        distanceKm: 0,
        transportMode: mode,
        source: 'google_maps',
        cached: false,
        status: 'error',
        error: 'Service temporarily unavailable (circuit breaker open)'
      };
    }

    // Check budget limits
    if (this.costMonitor.isBudgetExceeded()) {
      return {
        travelTimeMinutes: 0,
        distanceKm: 0,
        transportMode: mode,
        source: 'google_maps',
        cached: false,
        status: 'error',
        error: 'Daily budget exceeded'
      };
    }

    // Check rate limits
    if (!this.rateLimiter.canMakeRequest()) {
      const waitTime = this.rateLimiter.timeUntilNextRequest();
      return {
        travelTimeMinutes: 0,
        distanceKm: 0,
        transportMode: mode,
        source: 'google_maps',
        cached: false,
        status: 'rate_limited',
        error: `Rate limited, retry in ${waitTime}ms`
      };
    }

    try {
      // Record rate limit and cost
      this.rateLimiter.recordRequest();
      this.costMonitor.recordRequest();

      const params = {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: this.getGoogleMapsMode(mode),
        key: this.apiKey,
        region: 'sg', // Singapore region
        language: 'en',
        // Add traffic model for driving
        ...(mode === 'DRIVING' && {
          departure_time: 'now',
          traffic_model: 'best_guess'
        }),
        // Add transit preferences
        ...(mode === 'TRANSIT' && {
          transit_mode: 'bus|rail',
          transit_routing_preference: 'fewer_transfers'
        })
      };

      const response: AxiosResponse<GoogleMapsDirectionsResponse> = await axios.get(
        this.baseUrl,
        { 
          params,
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data.status === 'OK' && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];

        this.circuitBreaker.onSuccess();

        return {
          travelTimeMinutes: Math.round(leg.duration.value / 60),
          distanceKm: Math.round((leg.distance.value / 1000) * 100) / 100,
          transportMode: mode,
          source: 'google_maps',
          cached: false,
          status: 'success'
        };
      } else {
        throw new Error(response.data.error_message || `Google Maps API error: ${response.data.status}`);
      }

    } catch (error) {
      this.circuitBreaker.onFailure();
      
      return {
        travelTimeMinutes: 0,
        distanceKm: 0,
        transportMode: mode,
        source: 'google_maps',
        cached: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown Google Maps API error'
      };
    }
  }

  /**
   * Get current cost monitoring status
   */
  getCostStatus() {
    return this.costMonitor.getBudgetStatus();
  }

  /**
   * Get circuit breaker status
   */
  getServiceStatus() {
    return {
      circuitBreaker: this.circuitBreaker.getState(),
      canMakeRequest: this.rateLimiter.canMakeRequest(),
      timeUntilNextRequest: this.rateLimiter.timeUntilNextRequest(),
      costStatus: this.costMonitor.getBudgetStatus()
    };
  }

  /**
   * Batch travel time requests to optimize API usage
   */
  async getBatchTravelTimes(
    origins: Coordinate[],
    destination: Coordinate,
    modes: TransportMode[]
  ): Promise<TravelTimeResult[]> {
    const results: TravelTimeResult[] = [];
    
    // Process requests in batches to respect rate limits
    for (let i = 0; i < origins.length; i++) {
      for (const mode of modes) {
        const result = await this.getTravelTime(origins[i], destination, mode);
        results.push(result);
        
        // Small delay between requests to avoid overwhelming the API
        if (i < origins.length - 1 || modes.indexOf(mode) < modes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    return results;
  }
}

/**
 * Singleton instance of Google Maps service
 */
export const googleMapsService = new GoogleMapsService();