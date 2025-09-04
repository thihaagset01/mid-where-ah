/**
 * MapView Component Tests
 * Comprehensive test suite for Singapore region MapView component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MapView from '../../../src/components/maps/MapView';
import { 
  UserLocation, 
  OptimalPoint, 
  Venue, 
  MapMarker,
  Coordinate,
  SINGAPORE_REGION 
} from '../../../src/components/maps/types';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('MapView Component', () => {
  const mockUserLocations: UserLocation[] = [
    {
      id: 'user1',
      coordinate: { latitude: 1.3521, longitude: 103.8198 },
      transportMode: 'TRANSIT',
      name: 'John Doe',
      travelTime: 15,
    },
    {
      id: 'user2',
      coordinate: { latitude: 1.3621, longitude: 103.8298 },
      transportMode: 'DRIVING',
      name: 'Jane Smith',
      travelTime: 20,
    },
  ];

  const mockOptimalPoint: OptimalPoint = {
    coordinate: { latitude: 1.3571, longitude: 103.8248 },
    equityLevel: 'good',
    jainsIndex: 0.85,
    venues: [],
  };

  const mockVenues: Venue[] = [
    {
      id: 'venue1',
      coordinate: { latitude: 1.3500, longitude: 103.8200 },
      name: 'Shopping Mall',
      type: 'retail',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<MapView userLocations={[]} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with user locations', () => {
      const { toJSON } = render(<MapView userLocations={mockUserLocations} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with optimal point', () => {
      const { toJSON } = render(
        <MapView 
          userLocations={mockUserLocations} 
          optimalPoint={mockOptimalPoint} 
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render with venues', () => {
      const { toJSON } = render(
        <MapView 
          userLocations={mockUserLocations} 
          venues={mockVenues} 
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should apply custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { toJSON } = render(
        <MapView userLocations={[]} style={customStyle} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Props Handling', () => {
    it('should handle empty user locations array', () => {
      const { toJSON } = render(<MapView userLocations={[]} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle undefined optional props', () => {
      const { toJSON } = render(
        <MapView 
          userLocations={mockUserLocations}
          optimalPoint={undefined}
          venues={undefined}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle showUserLocation prop', () => {
      const { toJSON } = render(
        <MapView 
          userLocations={mockUserLocations} 
          showUserLocation={false} 
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Singapore Configuration', () => {
    it('should use Singapore region configuration', () => {
      // Test that component accepts Singapore region
      expect(SINGAPORE_REGION.latitude).toBe(1.3521);
      expect(SINGAPORE_REGION.longitude).toBe(103.8198);
      expect(SINGAPORE_REGION.latitudeDelta).toBe(0.1);
      expect(SINGAPORE_REGION.longitudeDelta).toBe(0.1);
    });

    it('should handle Singapore coordinates', () => {
      const singaporeUser: UserLocation = {
        id: 'sg-user',
        coordinate: { latitude: 1.2897, longitude: 103.8501 }, // Marina Bay
        transportMode: 'WALKING',
      };

      const { toJSON } = render(
        <MapView userLocations={[singaporeUser]} />
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Transport Mode Support', () => {
    it('should handle different transport modes', () => {
      const multiModalUsers: UserLocation[] = [
        { id: '1', coordinate: { latitude: 1.3521, longitude: 103.8198 }, transportMode: 'DRIVING' },
        { id: '2', coordinate: { latitude: 1.3521, longitude: 103.8198 }, transportMode: 'TRANSIT' },
        { id: '3', coordinate: { latitude: 1.3521, longitude: 103.8198 }, transportMode: 'WALKING' },
        { id: '4', coordinate: { latitude: 1.3521, longitude: 103.8198 }, transportMode: 'CYCLING' },
      ];

      const { toJSON } = render(
        <MapView userLocations={multiModalUsers} />
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Performance Handling', () => {
    it('should handle large number of markers', () => {
      const largeUserList: UserLocation[] = Array.from({ length: 100 }, (_, i) => ({
        id: `user${i}`,
        coordinate: { 
          latitude: 1.3521 + (Math.random() - 0.5) * 0.1, 
          longitude: 103.8198 + (Math.random() - 0.5) * 0.1 
        },
        transportMode: 'TRANSIT' as const,
        name: `User ${i}`,
      }));

      const { toJSON } = render(
        <MapView userLocations={largeUserList} />
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates gracefully', () => {
      const invalidUser: UserLocation = {
        id: 'invalid',
        coordinate: { latitude: NaN, longitude: NaN },
        transportMode: 'WALKING',
      };

      const { toJSON } = render(
        <MapView userLocations={[invalidUser]} />
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Callback Functions', () => {
    it('should handle null callback functions', () => {
      const { toJSON } = render(
        <MapView 
          userLocations={mockUserLocations}
          onMapReady={undefined}
          onMarkerPress={undefined}
          onMapPress={undefined}
        />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should handle provided callback functions', () => {
      const onMapReady = jest.fn();
      const onMarkerPress = jest.fn();
      const onMapPress = jest.fn();

      const { toJSON } = render(
        <MapView 
          userLocations={mockUserLocations}
          onMapReady={onMapReady}
          onMarkerPress={onMarkerPress}
          onMapPress={onMapPress}
        />
      );
      
      expect(toJSON()).toBeTruthy();
    });
  });
});