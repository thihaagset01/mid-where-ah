/**
 * Venue Discovery Service for MidWhereAh
 * 
 * Discovers restaurants, cafes, meeting spaces around optimal points
 * using Google Places API with Singapore-specific venue databases.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import axios, { AxiosResponse } from 'axios';
import { Coordinate } from '../../components/maps/types';

/**
 * Venue types for discovery
 */
export type VenueType = 
  | 'restaurant' 
  | 'cafe' 
  | 'meeting_room'
  | 'mall'
  | 'park'
  | 'hawker_center'
  | 'bar'
  | 'entertainment';

/**
 * Venue interface
 */
export interface Venue {
  /** Unique venue identifier */
  id: string;
  /** Venue name */
  name: string;
  /** Venue coordinates */
  location: Coordinate;
  /** Venue type category */
  type: VenueType;
  /** Street address */
  address: string;
  /** Google Places rating (1-5) */
  rating?: number;
  /** Number of reviews */
  reviewCount?: number;
  /** Distance from optimal point in meters */
  distance: number;
  /** Travel time from optimal point in minutes */
  travelTime?: number;
  /** Operating hours */
  hours?: {
    isOpen: boolean;
    openNow: boolean;
    periods?: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
  /** Price level (1-4, 1=inexpensive, 4=very expensive) */
  priceLevel?: number;
  /** Photo reference for venue image */
  photoReference?: string;
  /** Additional venue details */
  details?: {
    phone?: string;
    website?: string;
    description?: string;
  };
}

/**
 * Google Places API response interfaces
 */
interface GooglePlacesNearbyResponse {
  results: Array<{
    place_id: string;
    name: string;
    geometry: {
      location: { lat: number; lng: number };
    };
    types: string[];
    vicinity: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    opening_hours?: {
      open_now: boolean;
    };
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
  }>;
  status: string;
  error_message?: string;
  next_page_token?: string;
}

/**
 * Singapore-specific venue categories
 */
const SingaporeVenueTypes = {
  restaurant: 'restaurant',
  cafe: 'cafe',
  meeting_room: 'conference_room',
  mall: 'shopping_mall',
  park: 'park',
  hawker_center: 'food',
  bar: 'bar',
  entertainment: 'amusement_park',
} as const;

/**
 * Venue discovery service class
 */
export class VenueDiscoveryService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_PLACES_API_KEY || 'DEMO_KEY';
  }

  /**
   * Calculate haversine distance between two coordinates
   */
  private calculateDistance(from: Coordinate, to: Coordinate): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Return in meters
  }

  /**
   * Convert Google Places type to our venue type
   */
  private mapGoogleTypeToVenueType(googleTypes: string[]): VenueType {
    // Priority mapping for Singapore venues
    if (googleTypes.includes('restaurant')) return 'restaurant';
    if (googleTypes.includes('cafe')) return 'cafe';
    if (googleTypes.includes('shopping_mall')) return 'mall';
    if (googleTypes.includes('park')) return 'park';
    if (googleTypes.includes('bar')) return 'bar';
    if (googleTypes.includes('food')) return 'hawker_center';
    if (googleTypes.includes('amusement_park') || googleTypes.includes('movie_theater')) return 'entertainment';
    
    // Default fallback
    return 'restaurant';
  }

  /**
   * Filter venues for Singapore context
   */
  private filterSingaporeVenues(venues: Venue[]): Venue[] {
    return venues.filter(venue => {
      // Basic filtering for Singapore venues
      const address = venue.address.toLowerCase();
      
      // Include venues that mention Singapore or common Singapore areas
      const singaporeKeywords = [
        'singapore', 'sg', 'orchard', 'marina', 'clarke quay', 'boat quay',
        'chinatown', 'little india', 'bugis', 'raffles', 'sentosa', 'jurong',
        'tampines', 'woodlands', 'ang mo kio', 'bedok', 'clementi', 'toa payoh'
      ];
      
      return singaporeKeywords.some(keyword => address.includes(keyword)) ||
             venue.location.latitude >= 1.2 && venue.location.latitude <= 1.5 &&
             venue.location.longitude >= 103.6 && venue.location.longitude <= 104.0;
    });
  }

  /**
   * Find venues near a specific location
   */
  async findVenuesNearPoint(
    location: Coordinate,
    radius: number = 500,
    types: VenueType[] = ['restaurant', 'cafe', 'meeting_room'],
    maxResults: number = 20
  ): Promise<Venue[]> {
    try {
      const venues: Venue[] = [];
      
      // Search for each venue type
      for (const venueType of types) {
        const googleType = SingaporeVenueTypes[venueType] || venueType;
        
        const params = {
          location: `${location.latitude},${location.longitude}`,
          radius: radius.toString(),
          type: googleType,
          key: this.apiKey,
          // Singapore-specific parameters
          region: 'sg',
          language: 'en',
        };

        const response: AxiosResponse<GooglePlacesNearbyResponse> = await axios.get(
          this.baseUrl,
          { params, timeout: 8000 }
        );

        if (response.data.status === 'OK') {
          const venueResults = response.data.results.slice(0, Math.ceil(maxResults / types.length));
          
          for (const result of venueResults) {
            const venue: Venue = {
              id: result.place_id,
              name: result.name,
              location: {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
              },
              type: this.mapGoogleTypeToVenueType(result.types),
              address: result.vicinity,
              rating: result.rating,
              reviewCount: result.user_ratings_total,
              distance: this.calculateDistance(location, {
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
              }),
              priceLevel: result.price_level,
              hours: result.opening_hours ? {
                isOpen: result.opening_hours.open_now,
                openNow: result.opening_hours.open_now,
              } : undefined,
              photoReference: result.photos?.[0]?.photo_reference,
            };

            venues.push(venue);
          }
        }
        
        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Filter for Singapore venues and sort by distance
      const filteredVenues = this.filterSingaporeVenues(venues)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxResults);

      return filteredVenues;

    } catch (error) {
      console.warn('Venue discovery failed:', error);
      
      // Return Singapore fallback venues if API fails
      return this.getSingaporeFallbackVenues(location, radius, types);
    }
  }

  /**
   * Get Singapore fallback venues when API fails
   */
  private getSingaporeFallbackVenues(
    location: Coordinate,
    radius: number,
    types: VenueType[]
  ): Venue[] {
    // Singapore popular venues as fallback
    const fallbackVenues: Venue[] = [
      {
        id: 'fb_marina_bay_sands',
        name: 'Marina Bay Sands',
        location: { latitude: 1.2834, longitude: 103.8607 },
        type: 'mall',
        address: 'Marina Bay Sands, Singapore',
        rating: 4.3,
        distance: this.calculateDistance(location, { latitude: 1.2834, longitude: 103.8607 }),
      },
      {
        id: 'fb_orchard_road',
        name: 'Orchard Road',
        location: { latitude: 1.3048, longitude: 103.8318 },
        type: 'mall',
        address: 'Orchard Road, Singapore',
        rating: 4.2,
        distance: this.calculateDistance(location, { latitude: 1.3048, longitude: 103.8318 }),
      },
      {
        id: 'fb_clarke_quay',
        name: 'Clarke Quay',
        location: { latitude: 1.2886, longitude: 103.8467 },
        type: 'restaurant',
        address: 'Clarke Quay, Singapore',
        rating: 4.1,
        distance: this.calculateDistance(location, { latitude: 1.2886, longitude: 103.8467 }),
      },
      {
        id: 'fb_gardens_by_bay',
        name: 'Gardens by the Bay',
        location: { latitude: 1.2816, longitude: 103.8636 },
        type: 'park',
        address: 'Gardens by the Bay, Singapore',
        rating: 4.5,
        distance: this.calculateDistance(location, { latitude: 1.2816, longitude: 103.8636 }),
      },
    ];

    // Filter by radius and requested types
    return fallbackVenues
      .filter(venue => 
        venue.distance <= radius && 
        types.includes(venue.type)
      )
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get venue photo URL from photo reference
   */
  getVenuePhotoUrl(photoReference: string, maxWidth: number = 400): string {
    if (!photoReference) return '';
    
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${this.apiKey}`;
  }

  /**
   * Get venues with weather-aware filtering
   */
  async getWeatherAwareVenues(
    location: Coordinate,
    radius: number = 500,
    isRaining: boolean = false
  ): Promise<Venue[]> {
    // Adjust venue types based on weather
    const venueTypes: VenueType[] = isRaining 
      ? ['mall', 'restaurant', 'cafe', 'entertainment'] // Indoor venues during rain
      : ['restaurant', 'cafe', 'park', 'hawker_center']; // Include outdoor options when dry

    return this.findVenuesNearPoint(location, radius, venueTypes);
  }

  /**
   * Get popular Singapore meeting venues
   */
  async getPopularMeetingVenues(location: Coordinate): Promise<Venue[]> {
    const meetingTypes: VenueType[] = ['cafe', 'restaurant', 'mall', 'park'];
    
    // Slightly larger radius for popular venues
    return this.findVenuesNearPoint(location, 1000, meetingTypes, 15);
  }
}

/**
 * Singleton instance of venue discovery service
 */
export const venueDiscoveryService = new VenueDiscoveryService();