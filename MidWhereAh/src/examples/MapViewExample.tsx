/**
 * MapView Integration Example
 * Demonstrates how to use MapView component with transport equity algorithms
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Button, Alert } from 'react-native';
import { MapView } from '../components/maps';
import { 
  UserLocation, 
  OptimalPoint, 
  Venue, 
  Coordinate,
  MapMarker 
} from '../components/maps/types';
import { 
  calculateTransportAwareCenter,
  type UserLocation as AlgorithmUserLocation 
} from '../algorithms/initialization/transportAware';
import { calculateJainsIndex } from '../algorithms/equity/jainsIndex';
import { assessEquityLevel, createEquityContext } from '../algorithms/equity/equityLevel';

// Example Singapore locations for demonstration
const EXAMPLE_USERS: UserLocation[] = [
  {
    id: 'user1',
    coordinate: { latitude: 1.3521, longitude: 103.8198 }, // City Center
    transportMode: 'TRANSIT',
    name: 'Alex (CBD)',
    travelTime: 15,
  },
  {
    id: 'user2', 
    coordinate: { latitude: 1.3048, longitude: 103.8318 }, // Chinatown
    transportMode: 'WALKING',
    name: 'Sarah (Chinatown)',
    travelTime: 25,
  },
  {
    id: 'user3',
    coordinate: { latitude: 1.3644, longitude: 103.9915 }, // Changi
    transportMode: 'DRIVING',
    name: 'Mike (Changi)',
    travelTime: 45,
  },
  {
    id: 'user4',
    coordinate: { latitude: 1.2966, longitude: 103.8764 }, // Marina Bay
    transportMode: 'CYCLING',
    name: 'Lisa (Marina Bay)',
    travelTime: 20,
  },
];

const EXAMPLE_VENUES: Venue[] = [
  {
    id: 'venue1',
    coordinate: { latitude: 1.3521, longitude: 103.8198 },
    name: 'Raffles Place MRT',
    type: 'transport',
  },
  {
    id: 'venue2',
    coordinate: { latitude: 1.3048, longitude: 103.8318 },
    name: 'Chinatown Complex',
    type: 'shopping',
  },
  {
    id: 'venue3',
    coordinate: { latitude: 1.2868, longitude: 103.8545 },
    name: 'Marina Bay Sands',
    type: 'entertainment',
  },
];

/**
 * Example component showing MapView integration with optimization algorithms
 */
export const MapViewExample: React.FC = () => {
  const [userLocations, setUserLocations] = useState<UserLocation[]>(EXAMPLE_USERS);
  const [optimalPoint, setOptimalPoint] = useState<OptimalPoint | undefined>();
  const [venues, setVenues] = useState<Venue[]>(EXAMPLE_VENUES);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate optimal meeting point using transport-aware algorithm
  const calculateOptimalPoint = useCallback(async () => {
    setIsCalculating(true);
    try {
      // Convert user locations to algorithm format
      const algorithmUsers: AlgorithmUserLocation[] = userLocations.map(user => ({
        id: user.id,
        lat: user.coordinate.latitude,
        lng: user.coordinate.longitude,
        mode: user.transportMode,
        weight: 1.0,
      }));

      // Use the transport-aware initialization algorithm
      const result = calculateTransportAwareCenter(algorithmUsers);
      
      if (result.center) {
        // Calculate Jain's index for equity assessment
        const travelTimes = userLocations.map(u => u.travelTime || 30);
        const jainsIndex = calculateJainsIndex(travelTimes);
        
        // Create equity context for assessment
        const equityContext = createEquityContext(
          userLocations.length,
          userLocations.map(u => u.transportMode),
          travelTimes
        );
        
        const equityAssessment = assessEquityLevel(jainsIndex, equityContext);
        
        const newOptimalPoint: OptimalPoint = {
          coordinate: {
            latitude: result.center.lat,
            longitude: result.center.lng,
          },
          equityLevel: equityAssessment.level,
          jainsIndex: jainsIndex,
          venues: venues.filter(venue => {
            // Include venues within 2km of optimal point
            const distance = getDistance(
              { latitude: result.center.lat, longitude: result.center.lng },
              venue.coordinate
            );
            return distance < 2; // 2km radius
          }),
        };

        setOptimalPoint(newOptimalPoint);
        
        Alert.alert(
          'Optimization Complete',
          `Found optimal point with ${equityAssessment.level} equity level\nMethod: ${result.method}\nConfidence: ${(result.confidence * 100).toFixed(1)}%\nEquity Improvement: ${result.equityImprovement.toFixed(1)}%`
        );
      } else {
        Alert.alert('Optimization Failed', 'Could not find optimal meeting point');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      Alert.alert('Error', `Failed to calculate optimal point: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCalculating(false);
    }
  }, [userLocations, venues]);

  // Handle map press to add new user location
  const handleMapPress = useCallback((coordinate: Coordinate) => {
    const newUser: UserLocation = {
      id: `user${Date.now()}`,
      coordinate,
      transportMode: 'WALKING',
      name: `New User`,
      travelTime: 30,
    };
    
    setUserLocations(prev => [...prev, newUser]);
    Alert.alert('User Added', `Added new user at ${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`);
  }, []);

  // Handle marker press to show information
  const handleMarkerPress = useCallback((marker: MapMarker) => {
    switch (marker.type) {
      case 'user':
        const user = marker.data as UserLocation;
        Alert.alert(
          `User: ${user.name}`,
          `Transport: ${user.transportMode}\nTravel Time: ${user.travelTime}min`
        );
        break;
      case 'optimal':
        const optimal = marker.data as OptimalPoint;
        Alert.alert(
          'Optimal Meeting Point',
          `Equity Level: ${optimal.equityLevel}\nFairness Index: ${(optimal.jainsIndex * 100).toFixed(1)}%\nNearby Venues: ${optimal.venues.length}`
        );
        break;
      case 'venue':
        const venue = marker.data as Venue;
        Alert.alert(`Venue: ${venue.name}`, `Type: ${venue.type}`);
        break;
    }
  }, []);

  const handleMapReady = useCallback(() => {
    console.log('Map is ready for interactions');
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        userLocations={userLocations}
        optimalPoint={optimalPoint}
        venues={venues}
        onMapReady={handleMapReady}
        onMapPress={handleMapPress}
        onMarkerPress={handleMarkerPress}
        showUserLocation={true}
        style={styles.map}
      />
      
      <View style={styles.controls}>
        <Button
          title={isCalculating ? 'Calculating...' : 'Find Optimal Point'}
          onPress={calculateOptimalPoint}
          disabled={isCalculating || userLocations.length < 2}
        />
      </View>
    </View>
  );
};

// Helper function to calculate distance between two coordinates (rough approximation)
function getDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
  const dLng = (coord2.longitude - coord1.longitude) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * (Math.PI / 180)) * 
    Math.cos(coord2.latitude * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default MapViewExample;