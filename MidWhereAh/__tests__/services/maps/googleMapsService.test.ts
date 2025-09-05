/**
 * Tests for Google Maps Service
 */

import axios from 'axios';
import { GoogleMapsService } from '../../../src/services/maps/googleMapsService';
import { Coordinate, TransportMode } from '../../../src/components/maps/types';

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GoogleMapsService', () => {
  let service: GoogleMapsService;

  const testOrigin: Coordinate = { latitude: 1.2850, longitude: 103.8537 }; // Singapore CBD
  const testDestination: Coordinate = { latitude: 1.3644, longitude: 103.9915 }; // Changi Airport

  beforeEach(() => {
    service = new GoogleMapsService('test_api_key');
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create service instance with API key', () => {
      expect(service).toBeInstanceOf(GoogleMapsService);
    });

    it('should create service with default demo key if none provided', () => {
      const defaultService = new GoogleMapsService();
      expect(defaultService).toBeInstanceOf(GoogleMapsService);
    });
  });

  describe('Singapore Coordinate Validation', () => {
    it('should accept valid Singapore coordinates', async () => {
      // Mock successful API response
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'OK',
          routes: [{
            legs: [{
              duration: { value: 1800, text: '30 mins' },
              distance: { value: 15000, text: '15 km' }
            }]
          }]
        }
      });

      const result = await service.getTravelTime(testOrigin, testDestination, 'DRIVING');
      expect(result.status).toBe('success');
    });

    it('should reject coordinates outside Singapore bounds', async () => {
      const invalidOrigin: Coordinate = { latitude: 40.7128, longitude: -74.0060 }; // New York
      
      const result = await service.getTravelTime(invalidOrigin, testDestination, 'DRIVING');
      expect(result.status).toBe('error');
      expect(result.error).toContain('outside Singapore bounds');
    });
  });

  describe('Transport Mode Conversion', () => {
    const modes: TransportMode[] = ['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING'];
    
    modes.forEach(mode => {
      it(`should handle ${mode} transport mode`, async () => {
        mockedAxios.get.mockResolvedValue({
          data: {
            status: 'OK',
            routes: [{
              legs: [{
                duration: { value: 1800, text: '30 mins' },
                distance: { value: 15000, text: '15 km' }
              }]
            }]
          }
        });

        const result = await service.getTravelTime(testOrigin, testDestination, mode);
        expect(result.transportMode).toBe(mode);
        expect(result.status).toBe('success');
      });
    });
  });

  describe('API Response Handling', () => {
    it('should handle successful API response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'OK',
          routes: [{
            legs: [{
              duration: { value: 1800, text: '30 mins' },
              distance: { value: 15000, text: '15 km' }
            }]
          }]
        }
      });

      const result = await service.getTravelTime(testOrigin, testDestination, 'DRIVING');
      
      expect(result.status).toBe('success');
      expect(result.travelTimeMinutes).toBe(30);
      expect(result.distanceKm).toBe(15);
      expect(result.source).toBe('google_maps');
      expect(result.cached).toBe(false);
    });

    it('should handle API error response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'ZERO_RESULTS',
          error_message: 'No route found'
        }
      });

      const result = await service.getTravelTime(testOrigin, testDestination, 'DRIVING');
      expect(result.status).toBe('error');
      expect(result.error).toContain('No route found');
    });

    it('should handle network error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.getTravelTime(testOrigin, testDestination, 'DRIVING');
      expect(result.status).toBe('error');
      expect(result.error).toContain('Network error');
    });
  });

  describe('Service Status', () => {
    it('should provide comprehensive service status', () => {
      const status = service.getServiceStatus();
      
      expect(status).toHaveProperty('circuitBreaker');
      expect(status).toHaveProperty('canMakeRequest');
      expect(status).toHaveProperty('timeUntilNextRequest');
      expect(status).toHaveProperty('costStatus');
    });
  });

  describe('Batch Processing', () => {
    it('should handle batch travel time requests', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          status: 'OK',
          routes: [{
            legs: [{
              duration: { value: 1800, text: '30 mins' },
              distance: { value: 15000, text: '15 km' }
            }]
          }]
        }
      });

      const origins = [
        { latitude: 1.2850, longitude: 103.8537 },
        { latitude: 1.3048, longitude: 103.8318 }
      ];
      const modes: TransportMode[] = ['DRIVING', 'TRANSIT'];

      const results = await service.getBatchTravelTimes(origins, testDestination, modes);
      
      expect(results).toHaveLength(4); // 2 origins × 2 modes
      expect(results.every(r => r.status === 'success')).toBe(true);
    });
  });
});