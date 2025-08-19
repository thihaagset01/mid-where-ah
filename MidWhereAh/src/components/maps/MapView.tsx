/**
 * Production-ready MapView component with Google Maps integration
 * Features: Singapore center, responsive container, marker support
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ViewStyle } from 'react-native';
import { Coordinate, UserLocation, Venue } from '../../types';
import { colors } from '../../constants';
import { UserMarker } from './UserMarker';
import { VenueMarker } from './VenueMarker';

// We'll use different implementations for web and native
// No imports of react-native-maps here to avoid web bundling issues

// Singapore center coordinates
const SINGAPORE_CENTER = { lat: 1.3521, lng: 103.8198 };

// Singapore region for map view
const SINGAPORE_REGION = {
  latitude: SINGAPORE_CENTER.lat,
  longitude: SINGAPORE_CENTER.lng,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421
};

export interface MapViewProps {
  userLocations?: UserLocation[];
  optimalPoint?: Coordinate;
  venues?: Venue[];
  onVenueSelect?: (venue: Venue) => void;
  onMapPress?: (coordinate: Coordinate) => void;
  style?: ViewStyle;
  zoomLevel?: number;
  showUserLocation?: boolean;
}

// Create separate components for web and native to avoid any cross-imports

// Web-specific MapView implementation
const WebMapView: React.FC<MapViewProps> = ({
  userLocations = [],
  optimalPoint,
  venues = [],
  onVenueSelect,
  onMapPress,
  style,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  
  useEffect(() => {
    console.log("Web map initialized");
    setMapLoaded(true);
  }, []);

  // Handle map press on web
  const handleWebMapPress = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onMapPress) return;
    
    // Get click position relative to the map container
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert position to lat/lng (simple linear interpolation for demo)
    const width = rect.width;
    const height = rect.height;
    
    // Singapore spans roughly from 103.6 to 104.1 longitude and 1.15 to 1.45 latitude
    const lng = 103.6 + (x / width) * 0.5;
    const lat = 1.45 - (y / height) * 0.3;
    
    onMapPress({ lat, lng });
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.webFallback}>
        <View style={styles.webMapPlaceholder}>
          <View style={styles.webMapHeader}>
            <Text style={styles.placeholderText}>Singapore Map</Text>
            <Text style={styles.placeholderSubtext}>Google Maps integration ready for native devices</Text>
          </View>
          
          {/* Interactive map grid for web */}
          <View 
            style={styles.webMapGrid}
            onTouchStart={handleWebMapPress as any}
            {...(Platform.OS === 'web' ? { onClick: handleWebMapPress } : {})}
          >
            {optimalPoint && (
              <View style={[styles.webMapOptimalPoint, {
                left: `${((optimalPoint.lng - 103.6) / 0.5) * 100}%`,
                top: `${((1.45 - optimalPoint.lat) / 0.3) * 100}%`,
              }]}>
                <Text style={styles.markerLabel}>★</Text>
              </View>
            )}
            
            {userLocations.map((user, index) => (
              <View 
                key={`map-user-${user.id}`} 
                style={[styles.webMapUserMarker, {
                  left: `${((user.coordinate.lng - 103.6) / 0.5) * 100}%`,
                  top: `${((1.45 - user.coordinate.lat) / 0.3) * 100}%`,
                }]}
              >
                <Text style={styles.markerLabel}>{index + 1}</Text>
              </View>
            ))}
            
            {venues.map((venue, index) => (
              <TouchableOpacity 
                key={`map-venue-${venue.id}`} 
                style={[styles.webMapVenueMarker, {
                  left: `${((venue.coordinate.lng - 103.6) / 0.5) * 100}%`,
                  top: `${((1.45 - venue.coordinate.lat) / 0.3) * 100}%`,
                }]}
                onPress={() => onVenueSelect?.(venue)}
              >
                <Text style={styles.markerLabel}>V</Text>
              </TouchableOpacity>
            ))}
            
            {/* Singapore map grid lines */}
            <View style={styles.webMapGridLines}>
              <Text style={styles.webMapGridLabel}>Singapore</Text>
            </View>
          </View>
          
          {/* Markers list for web */}
          <View style={styles.markersContainer}>
            <Text style={styles.markersTitle}>Map Markers</Text>
            
            {userLocations.map((user, index) => (
              <View key={`user-${user.id}`} style={styles.markerItem}>
                <View style={styles.userMarker}>
                  <Text style={styles.markerLabel}>{index + 1}</Text>
                </View>
                <Text style={styles.markerText}>
                  User {index + 1}: {user.name || 'Anonymous'} ({user.coordinate.lat.toFixed(4)}, {user.coordinate.lng.toFixed(4)})
                </Text>
              </View>
            ))}
            
            {optimalPoint && (
              <View style={styles.markerItem}>
                <View style={styles.optimalMarker}>
                  <Text style={styles.markerLabel}>★</Text>
                </View>
                <Text style={styles.markerText}>
                  Optimal Point: ({optimalPoint.lat.toFixed(4)}, {optimalPoint.lng.toFixed(4)})
                </Text>
              </View>
            )}
            
            {venues.map((venue, index) => (
              <View key={`venue-${venue.id}`} style={styles.markerItem}>
                <TouchableOpacity 
                  style={styles.venueMarker}
                  onPress={() => onVenueSelect?.(venue)}
                >
                  <Text style={styles.markerLabel}>V</Text>
                </TouchableOpacity>
                <Text style={styles.markerText}>
                  {venue.name || `Venue ${index + 1}`}: ({venue.coordinate.lat.toFixed(4)}, {venue.coordinate.lng.toFixed(4)})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

// Native-specific MapView implementation
// This component will only be used on native platforms
const NativeMapView: React.FC<MapViewProps> = ({
  userLocations = [],
  optimalPoint,
  venues = [],
  onVenueSelect,
  onMapPress,
  style,
  zoomLevel = 11,
  showUserLocation = false,
}) => {
  // Import react-native-maps dynamically to avoid web bundling issues
  // This code will never run on web
  const { default: RNMapView, Marker, PROVIDER_GOOGLE, AnimatedRegion } = require('react-native-maps');
  
  // Use any type for mapRef since we're dynamically importing
  const mapRef = useRef<any>(null);
  const [region, setRegion] = useState(SINGAPORE_REGION);
  
  // Enhanced map press handler for mobile
  const handleMapPress = (event: any) => {
    if (onMapPress) {
      const { coordinate } = event.nativeEvent;
      // Convert to our app's coordinate format
      onMapPress({
        lat: coordinate.latitude,
        lng: coordinate.longitude
      });
    }
  };
  
  // Convert our app's coordinate format to react-native-maps format
  const convertToMapCoordinate = (coordinate: Coordinate) => ({
    latitude: coordinate.lat,
    longitude: coordinate.lng
  });
  
  // Mobile-specific: Animate to a specific region
  const animateToRegion = (coordinate: Coordinate, animationDuration = 1000) => {
    if (mapRef.current) {
      const region = {
        latitude: coordinate.lat,
        longitude: coordinate.lng,
        latitudeDelta: 0.01, // Zoomed in for better visibility
        longitudeDelta: 0.01,
      };
      
      mapRef.current.animateToRegion(region, animationDuration);
    }
  };
  
  // Focus on optimal point when it changes
  useEffect(() => {
    if (optimalPoint && mapRef.current) {
      animateToRegion(optimalPoint);
    }
  }, [optimalPoint]);
  
  // Handle region change
  const onRegionChange = (newRegion: any) => {
    setRegion(newRegion);
  };

  return (
    <View style={[styles.container, style]}>
      <RNMapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={SINGAPORE_REGION}
        region={region}
        onRegionChange={onRegionChange}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={showUserLocation}
        showsCompass={true}
        showsScale={true}
        showsTraffic={true} // Show traffic data for better route planning
        showsBuildings={true} // Show 3D buildings for better orientation
        showsIndoors={true} // Show indoor maps where available
        onPress={handleMapPress}
      >
        {/* User location markers */}
        {userLocations.map((user, index) => (
          <Marker
            key={`user-${user.id}`}
            coordinate={convertToMapCoordinate(user.coordinate)}
            title={user.name || `User ${index + 1}`}
          >
            <UserMarker 
              name={user.name || `User ${index + 1}`}
              color={colors.primary.main} 
              size={30} 
              showLabel={true}
            />
          </Marker>
        ))}
        
        {/* Optimal point marker */}
        {optimalPoint && (
          <Marker
            coordinate={convertToMapCoordinate(optimalPoint)}
            title="Optimal Meeting Point"
          >
            <View style={styles.optimalMarker}>
              <Text style={styles.markerLabel}>★</Text>
            </View>
          </Marker>
        )}
        
        {/* Venue markers */}
        {venues.map((venue, index) => (
          <Marker
            key={`venue-${venue.id}`}
            coordinate={convertToMapCoordinate(venue.coordinate)}
            title={venue.name || `Venue ${index + 1}`}
            onPress={() => onVenueSelect?.(venue)}
          >
            <VenueMarker 
              name={venue.name || `Venue ${index + 1}`}
              isOptimal={venue.equityScore ? venue.equityScore > 0.8 : false}
              category={venue.type}
            />
          </Marker>
        ))}
      </RNMapView>
    </View>
  );
};

// Main MapView component that renders the appropriate implementation based on platform
export const MapView: React.FC<MapViewProps> = (props) => {
  // Use platform-specific implementation
  return Platform.OS === 'web' ? <WebMapView {...props} /> : <NativeMapView {...props} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.gray100,
  },
  map: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral.gray200,
    padding: 16,
  },
  webMapHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  webMapGrid: {
    width: '100%',
    height: 300,
    backgroundColor: '#E6F2FF',
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: 8,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  webMapGridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webMapGridLabel: {
    fontSize: 24,
    color: colors.neutral.gray400,
    fontWeight: '300',
  },
  webMapOptimalPoint: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.equity.excellent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
  webMapUserMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  webMapVenueMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: colors.neutral.gray600,
    transform: [{ rotate: '45deg' }, { translateX: -12 }, { translateY: -12 }],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.brand.primary,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: colors.neutral.gray600,
    marginBottom: 24,
  },
  markersContainer: {
    width: '80%',
    padding: 16,
    backgroundColor: colors.neutral.white,
    borderRadius: 8,
    shadowColor: colors.neutral.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  markersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: 12,
  },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  markerText: {
    fontSize: 14,
    color: colors.neutral.gray600,
    marginLeft: 8,
    flex: 1,
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optimalMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.equity.excellent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueMarker: {
    width: 24,
    height: 24,
    backgroundColor: colors.neutral.gray600,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerLabel: {
    color: colors.neutral.white,
    fontSize: 12,
    fontWeight: 'bold',
    transform: [{ rotate: '-45deg' }],
  },
  mapPressButton: {
    marginTop: 16,
    backgroundColor: colors.primary.main,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  mapPressButtonText: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
});