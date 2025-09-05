/**
 * OneMap Singapore Service for MidWhereAh transport equity optimization.
 * 
 * Provides free fallback travel time calculations using OneMap Singapore API
 * when Google Maps fails or rate limits are exceeded.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import axios, { AxiosResponse } from 'axios';
import { Coordinate, TransportMode } from '../../components/maps/types';
import { TravelTimeResult } from './googleMapsService';

/**
 * OneMap Singapore API response interfaces
 */
interface OneMapRouteResponse {
  status_message: string;
  plan?: {
    itineraries: Array<{
      duration: number; // in seconds
      distance: number; // in meters
      walkTime: number;
      waitingTime: number;
      transitTime: number;
    }>;
  };
  error?: string;
}

interface OneMapAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * OneMap Singapore service class
 */
export class OneMapService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly baseUrl = 'https://developers.onemap.sg';
  private readonly authEmail: string;
  private readonly authPassword: string;

  constructor(authEmail?: string, authPassword?: string) {
    // In production, these would come from environment variables
    this.authEmail = authEmail || process.env.ONEMAP_EMAIL || 'demo@example.com';
    this.authPassword = authPassword || process.env.ONEMAP_PASSWORD || 'demo_password';
  }

  /**
   * Authenticate with OneMap Singapore API
   */
  private async authenticate(): Promise<void> {
    // Check if token is still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return;
    }

    try {
      const response: AxiosResponse<OneMapAuthResponse> = await axios.post(
        `${this.baseUrl}/privateapi/auth/post/getToken`,
        {
          email: this.authEmail,
          password: this.authPassword
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 95% of the actual expiry time for safety margin
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000 * 0.95);
      
    } catch (error) {
      throw new Error(`OneMap authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert transport mode to OneMap routing type
   */
  private getOneMapMode(mode: TransportMode): string {
    switch (mode) {
      case 'DRIVING':
        return 'drive';
      case 'TRANSIT':
        return 'pt'; // public transport
      case 'WALKING':
        return 'walk';
      case 'CYCLING':
        return 'cycle';
      default:
        return 'drive';
    }
  }

  /**
   * Calculate haversine distance between two coordinates
   */
  private haversineDistance(from: Coordinate, to: Coordinate): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estimate travel time using haversine distance and Singapore average speeds
   */
  private estimateWithHaversine(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): TravelTimeResult {
    const distance = this.haversineDistance(origin, destination);
    
    // Singapore average speeds (km/h) with traffic/infrastructure factors
    const speeds = {
      DRIVING: 25,   // Reduced for Singapore traffic
      TRANSIT: 20,   // MRT/Bus with transfers
      WALKING: 4,    // Accounting for heat/humidity
      CYCLING: 12    // Infrastructure limitations
    };

    const baseTime = (distance / speeds[mode]) * 60; // Convert to minutes
    
    // Add mode-specific penalties for Singapore conditions
    const penalties = {
      DRIVING: 1.3,   // Traffic congestion
      TRANSIT: 1.4,   // Waiting time and transfers
      WALKING: 1.5,   // Weather and infrastructure
      CYCLING: 1.3    // Safety and infrastructure
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
  }

  /**
   * Get travel time between two coordinates using OneMap Singapore API
   */
  async getTravelTime(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): Promise<TravelTimeResult> {
    try {
      // For driving and cycling, OneMap doesn't have good coverage, use haversine
      if (mode === 'DRIVING' || mode === 'CYCLING') {
        return this.estimateWithHaversine(origin, destination, mode);
      }

      // Authenticate with OneMap
      await this.authenticate();

      if (!this.accessToken) {
        throw new Error('Failed to obtain OneMap access token');
      }

      const oneMapMode = this.getOneMapMode(mode);
      
      const params = {
        start: `${origin.latitude},${origin.longitude}`,
        end: `${destination.latitude},${destination.longitude}`,
        routeType: oneMapMode,
        token: this.accessToken,
        ...(mode === 'TRANSIT' && {
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().split(' ')[0],
          mode: 'TRANSIT',
          maxWalkDistance: '1000'
        })
      };

      const endpoint = mode === 'TRANSIT' ? 
        `${this.baseUrl}/privateapi/routingsvc/route` :
        `${this.baseUrl}/privateapi/routingsvc/route`;

      const response: AxiosResponse<OneMapRouteResponse> = await axios.get(
        endpoint,
        { 
          params,
          timeout: 8000,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (response.data.status_message === 'found' && response.data.plan?.itineraries.length) {
        const itinerary = response.data.plan.itineraries[0];
        
        return {
          travelTimeMinutes: Math.round(itinerary.duration / 60),
          distanceKm: Math.round((itinerary.distance / 1000) * 100) / 100,
          transportMode: mode,
          source: 'onemap',
          cached: false,
          status: 'success'
        };
      } else {
        // Fallback to haversine estimation
        return this.estimateWithHaversine(origin, destination, mode);
      }

    } catch (error) {
      // Fallback to haversine estimation on any error
      return this.estimateWithHaversine(origin, destination, mode);
    }
  }

  /**
   * Get multiple travel times in batch
   */
  async getBatchTravelTimes(
    origins: Coordinate[],
    destination: Coordinate,
    modes: TransportMode[]
  ): Promise<TravelTimeResult[]> {
    const results: TravelTimeResult[] = [];
    
    for (const origin of origins) {
      for (const mode of modes) {
        const result = await this.getTravelTime(origin, destination, mode);
        results.push(result);
        
        // Small delay to be respectful to OneMap API
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }

  /**
   * Check if service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    try {
      await this.authenticate();
      return this.accessToken !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance of OneMap service
 */
export const oneMapService = new OneMapService();