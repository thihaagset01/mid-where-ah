/**
 * OneMap Singapore API integration
 * FREE government API for Singapore routing and geocoding
 */

import type { Coordinate, Route } from '../../types';

interface OneMapRouteResponse {
  route_geometry: string;
  total_time: number;
  total_distance: number;
  route_instructions: Array<{
    instruction: string;
    distance: number;
    time: number;
  }>;
}

interface OneMapGeocodingResponse {
  results: Array<{
    LATITUDE: string;
    LONGITUDE: string;
    ADDRESS: string;
    POSTAL: string;
  }>;
}

export class OneMapService {
  private static instance: OneMapService;
  private baseUrl = 'https://developers.onemap.sg';
  private apiKey?: string;

  private constructor() {}

  public static getInstance(): OneMapService {
    if (!OneMapService.instance) {
      OneMapService.instance = new OneMapService();
    }
    return OneMapService.instance;
  }

  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  public async getRoute(
    start: Coordinate,
    end: Coordinate,
    routeType: 'drive' | 'walk' | 'pt' = 'pt'
  ): Promise<Route> {
    try {
      const params = new URLSearchParams({
        start: `${start.lat},${start.lng}`,
        end: `${end.lat},${end.lng}`,
        routeType,
        token: this.apiKey || ''
      });

      const response = await fetch(`${this.baseUrl}/privateapi/routingsvc/route?${params}`);
      
      if (!response.ok) {
        throw new Error(`OneMap API error: ${response.status}`);
      }

      const data: OneMapRouteResponse = await response.json();
      
      return {
        duration: data.total_time,
        distance: data.total_distance,
        steps: data.route_instructions.map(instruction => ({
          instruction: instruction.instruction,
          distance: instruction.distance,
          duration: instruction.time,
          coordinate: start // Simplified - would need to decode geometry
        }))
      };
    } catch (error) {
      console.error('OneMap routing error:', error);
      throw new Error('Failed to get route from OneMap');
    }
  }

  public async getTravelTime(
    start: Coordinate,
    end: Coordinate,
    mode: 'TRANSIT' | 'WALKING' | 'DRIVING' = 'TRANSIT'
  ): Promise<number> {
    const routeType = this.mapModeToRouteType(mode);
    
    try {
      const route = await this.getRoute(start, end, routeType);
      return route.duration;
    } catch (error) {
      // Fallback calculation if API fails
      return this.calculateFallbackTravelTime(start, end, mode);
    }
  }

  public async geocodeAddress(address: string): Promise<Coordinate[]> {
    try {
      const params = new URLSearchParams({
        searchVal: address,
        returnGeom: 'Y',
        getAddrDetails: 'Y'
      });

      const response = await fetch(`${this.baseUrl}/commonapi/search?${params}`);
      
      if (!response.ok) {
        throw new Error(`OneMap geocoding error: ${response.status}`);
      }

      const data: OneMapGeocodingResponse = await response.json();
      
      return data.results.map(result => ({
        lat: parseFloat(result.LATITUDE),
        lng: parseFloat(result.LONGITUDE)
      }));
    } catch (error) {
      console.error('OneMap geocoding error:', error);
      throw new Error('Failed to geocode address');
    }
  }

  public async reverseGeocode(coordinate: Coordinate): Promise<string> {
    try {
      const params = new URLSearchParams({
        location: `${coordinate.lat},${coordinate.lng}`,
        token: this.apiKey || ''
      });

      const response = await fetch(`${this.baseUrl}/privateapi/commonsvc/revgeocode?${params}`);
      
      if (!response.ok) {
        throw new Error(`OneMap reverse geocoding error: ${response.status}`);
      }

      const data = await response.json();
      return data.GeocodeInfo?.[0]?.ROAD || 'Unknown location';
    } catch (error) {
      console.error('OneMap reverse geocoding error:', error);
      return 'Unknown location';
    }
  }

  private mapModeToRouteType(mode: string): 'drive' | 'walk' | 'pt' {
    switch (mode) {
      case 'DRIVING':
        return 'drive';
      case 'WALKING':
        return 'walk';
      case 'TRANSIT':
      default:
        return 'pt'; // Public transport
    }
  }

  private calculateFallbackTravelTime(
    start: Coordinate,
    end: Coordinate,
    mode: string
  ): number {
    const distance = this.calculateDistance(start, end);
    
    // Rough speed estimates for Singapore (meters per minute)
    const speeds = {
      'TRANSIT': 400,  // MRT average including waiting
      'WALKING': 80,   // Average walking speed
      'DRIVING': 300,  // City driving with traffic
      'CYCLING': 200   // Cycling speed
    };

    const speed = speeds[mode as keyof typeof speeds] || speeds.TRANSIT;
    return Math.round(distance / speed);
  }

  private calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export default OneMapService.getInstance();