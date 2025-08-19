/**
 * MapBox SDK wrapper service
 * Cost-optimized alternative to Google Maps ($0.50/1K vs $7/1K requests)
 */

import MapboxGL from '@react-native-mapbox-gl/maps';
import type { Coordinate } from '../../types';

// Singapore center coordinates
const SINGAPORE_CENTER: Coordinate = {
  lat: 1.3521,
  lng: 103.8198
};

const SINGAPORE_BOUNDS = {
  northeast: { lat: 1.4784, lng: 104.0945 },
  southwest: { lat: 1.1496, lng: 103.5567 }
};

export class MapBoxService {
  private static instance: MapBoxService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): MapBoxService {
    if (!MapBoxService.instance) {
      MapBoxService.instance = new MapBoxService();
    }
    return MapBoxService.instance;
  }

  public async initialize(accessToken: string): Promise<void> {
    if (this.initialized) return;

    try {
      MapboxGL.setAccessToken(accessToken);
      
      // Set telemetry to false to reduce costs
      MapboxGL.setTelemetryEnabled(false);
      
      this.initialized = true;
      console.log('MapBox initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MapBox:', error);
      throw new Error('MapBox initialization failed');
    }
  }

  public getSingaporeCenter(): Coordinate {
    return SINGAPORE_CENTER;
  }

  public getSingaporeBounds() {
    return SINGAPORE_BOUNDS;
  }

  public isWithinSingapore(coordinate: Coordinate): boolean {
    return (
      coordinate.lat >= SINGAPORE_BOUNDS.southwest.lat &&
      coordinate.lat <= SINGAPORE_BOUNDS.northeast.lat &&
      coordinate.lng >= SINGAPORE_BOUNDS.southwest.lng &&
      coordinate.lng <= SINGAPORE_BOUNDS.northeast.lng
    );
  }

  public calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  public createBoundingBox(
    center: Coordinate, 
    radiusMeters: number
  ): { northeast: Coordinate; southwest: Coordinate } {
    const latOffset = radiusMeters / 111320; // Approximate meters per degree latitude
    const lngOffset = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));

    return {
      northeast: {
        lat: center.lat + latOffset,
        lng: center.lng + lngOffset
      },
      southwest: {
        lat: center.lat - latOffset,
        lng: center.lng - lngOffset
      }
    };
  }

  public formatCoordinateForDisplay(coordinate: Coordinate): string {
    return `${coordinate.lat.toFixed(6)}, ${coordinate.lng.toFixed(6)}`;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export default MapBoxService.getInstance();