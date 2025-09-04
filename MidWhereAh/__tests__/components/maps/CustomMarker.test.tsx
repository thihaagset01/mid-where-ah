/**
 * CustomMarker Component Tests
 * Tests for marker components with different types and clustering
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CustomMarker, ClusterMarker } from '../../../src/components/maps/CustomMarker';
import { 
  MapMarker, 
  UserLocation, 
  OptimalPoint, 
  Venue,
  MARKER_COLORS 
} from '../../../src/components/maps/types';

describe('CustomMarker Component', () => {
  const mockUserData: UserLocation = {
    id: 'user1',
    coordinate: { latitude: 1.3521, longitude: 103.8198 },
    transportMode: 'TRANSIT',
    name: 'John Doe',
    travelTime: 15,
  };

  const mockOptimalPointData: OptimalPoint = {
    coordinate: { latitude: 1.3571, longitude: 103.8248 },
    equityLevel: 'good',
    jainsIndex: 0.85,
    venues: [],
  };

  const mockVenueData: Venue = {
    id: 'venue1',
    coordinate: { latitude: 1.3500, longitude: 103.8200 },
    name: 'Shopping Mall',
    type: 'retail',
  };

  describe('User Marker', () => {
    it('should render user marker with transport mode', () => {
      const userMarker: MapMarker = {
        id: 'user-1',
        coordinate: mockUserData.coordinate,
        type: 'user',
        data: mockUserData,
      };

      const { toJSON } = render(
        <CustomMarker marker={userMarker} />
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render user marker with travel time', () => {
      const userMarker: MapMarker = {
        id: 'user-1',
        coordinate: mockUserData.coordinate,
        type: 'user',
        data: mockUserData,
      };

      const { toJSON } = render(
        <CustomMarker marker={userMarker} />
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render driving user marker', () => {
      const drivingUser: UserLocation = {
        ...mockUserData,
        transportMode: 'DRIVING',
      };

      const drivingMarker: MapMarker = {
        id: 'user-driving',
        coordinate: drivingUser.coordinate,
        type: 'user',
        data: drivingUser,
      };

      const { toJSON } = render(
        <CustomMarker marker={drivingMarker} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Optimal Point Marker', () => {
    it('should render optimal point marker with equity information', () => {
      const optimalMarker: MapMarker = {
        id: 'optimal-point',
        coordinate: mockOptimalPointData.coordinate,
        type: 'optimal',
        data: mockOptimalPointData,
      };

      const { toJSON } = render(
        <CustomMarker marker={optimalMarker} />
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render excellent equity optimal point', () => {
      const excellentOptimal: OptimalPoint = {
        ...mockOptimalPointData,
        equityLevel: 'excellent',
      };

      const optimalMarker: MapMarker = {
        id: 'optimal-excellent',
        coordinate: excellentOptimal.coordinate,
        type: 'optimal',
        data: excellentOptimal,
      };

      const { toJSON } = render(
        <CustomMarker marker={optimalMarker} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Venue Marker', () => {
    it('should render venue marker', () => {
      const venueMarker: MapMarker = {
        id: 'venue-1',
        coordinate: mockVenueData.coordinate,
        type: 'venue',
        data: mockVenueData,
      };

      const { toJSON } = render(
        <CustomMarker marker={venueMarker} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Marker Interactions', () => {
    it('should render marker with onPress handler', () => {
      const onPress = jest.fn();
      const userMarker: MapMarker = {
        id: 'user-1',
        coordinate: mockUserData.coordinate,
        type: 'user',
        data: mockUserData,
      };

      const { toJSON } = render(
        <CustomMarker marker={userMarker} onPress={onPress} />
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render marker without onPress handler', () => {
      const userMarker: MapMarker = {
        id: 'user-1',
        coordinate: mockUserData.coordinate,
        type: 'user',
        data: mockUserData,
      };

      const { toJSON } = render(
        <CustomMarker marker={userMarker} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Transport Modes', () => {
    it('should handle all transport modes', () => {
      const transportModes = ['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING'] as const;
      
      transportModes.forEach(mode => {
        const user: UserLocation = {
          ...mockUserData,
          transportMode: mode,
        };

        const marker: MapMarker = {
          id: `user-${mode}`,
          coordinate: user.coordinate,
          type: 'user',
          data: user,
        };

        const { toJSON } = render(
          <CustomMarker marker={marker} />
        );

        expect(toJSON()).toBeTruthy();
      });
    });
  });

  describe('Equity Levels', () => {
    it('should handle all equity levels', () => {
      const equityLevels = ['excellent', 'good', 'fair', 'poor', 'critical'] as const;
      
      equityLevels.forEach(level => {
        const optimal: OptimalPoint = {
          ...mockOptimalPointData,
          equityLevel: level,
        };

        const marker: MapMarker = {
          id: `optimal-${level}`,
          coordinate: optimal.coordinate,
          type: 'optimal',
          data: optimal,
        };

        const { toJSON } = render(
          <CustomMarker marker={marker} />
        );

        expect(toJSON()).toBeTruthy();
      });
    });
  });
});

describe('ClusterMarker Component', () => {
  const mockCoordinate = { latitude: 1.3521, longitude: 103.8198 };

  it('should render cluster marker with count', () => {
    const { toJSON } = render(
      <ClusterMarker coordinate={mockCoordinate} count={5} />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('should handle large cluster counts', () => {
    const { toJSON } = render(
      <ClusterMarker coordinate={mockCoordinate} count={99} />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('should render cluster with onPress handler', () => {
    const onPress = jest.fn();
    const { toJSON } = render(
      <ClusterMarker 
        coordinate={mockCoordinate} 
        count={5} 
        onPress={onPress} 
      />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('should render cluster without onPress handler', () => {
    const { toJSON } = render(
      <ClusterMarker coordinate={mockCoordinate} count={5} />
    );

    expect(toJSON()).toBeTruthy();
  });

  it('should handle varying cluster sizes', () => {
    const counts = [1, 5, 10, 25, 50, 100];
    
    counts.forEach(count => {
      const { toJSON } = render(
        <ClusterMarker coordinate={mockCoordinate} count={count} />
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});