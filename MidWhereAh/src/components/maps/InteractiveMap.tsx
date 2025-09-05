/**
 * Interactive Map Component for MidWhereAh
 * 
 * Enhanced MapView with route visualization, venue discovery,
 * tap-to-add locations, and advanced map interactions.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapView, { MapPressEvent, Region, Camera } from 'react-native-maps';
import { PurpleTheme } from '../../design/theme';
import { Coordinate, TransportMode } from './types';
import { TravelRoutes, UserLocation } from './TravelRoutes';
import { VenueMarkers } from './VenueMarkers';
import { Venue, venueDiscoveryService } from '../../services/venues/venueDiscoveryService';
import { UserLocationInput } from '../location/types';

/**
 * Interactive Map Props
 */
export interface InteractiveMapProps {
  /** User locations for route visualization */
  userLocations: UserLocationInput[];
  /** Optimal meeting point */
  optimalPoint?: Coordinate;
  /** Show route lines */
  showRoutes?: boolean;
  /** Show venue markers */
  showVenues?: boolean;
  /** Enable tap-to-add functionality */
  enableTapToAdd?: boolean;
  /** Callback when location is added via tap */
  onLocationAdded?: (coordinate: Coordinate) => void;
  /** Callback when venue is selected */
  onVenueSelected?: (venue: Venue) => void;
  /** Initial region */
  initialRegion?: Region;
  /** Map style */
  mapStyle?: 'standard' | 'satellite' | 'hybrid';
}

/**
 * Default Singapore region
 */
const DEFAULT_SINGAPORE_REGION: Region = {
  latitude: 1.3521,
  longitude: 103.8198,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

/**
 * Interactive Map Component
 */
export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  userLocations = [],
  optimalPoint,
  showRoutes = true,
  showVenues = true,
  enableTapToAdd = false,
  onLocationAdded,
  onVenueSelected,
  initialRegion = DEFAULT_SINGAPORE_REGION,
  mapStyle = 'standard',
}) => {
  const mapRef = useRef<MapView>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>();
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);

  /**
   * Convert UserLocationInput to UserLocation format
   */
  const convertToUserLocations = useCallback((): UserLocation[] => {
    return userLocations
      .filter(location => location.coordinate)
      .map(location => ({
        id: location.id,
        coordinate: location.coordinate!,
        transportMode: location.transportMode,
        name: location.address,
      }));
  }, [userLocations]);

  /**
   * Load venues around optimal point
   */
  const loadVenues = useCallback(async (center: Coordinate) => {
    if (!showVenues) return;

    setIsLoadingVenues(true);
    try {
      const discoveredVenues = await venueDiscoveryService.findVenuesNearPoint(
        center,
        1000, // 1km radius
        ['restaurant', 'cafe', 'mall', 'park'], // Popular meeting venue types
        15 // Max venues
      );
      
      setVenues(discoveredVenues);
    } catch (error) {
      console.warn('Failed to load venues:', error);
      // Could show a toast or fallback venues here
    } finally {
      setIsLoadingVenues(false);
    }
  }, [showVenues]);

  /**
   * Handle map press for tap-to-add functionality
   */
  const handleMapPress = useCallback((event: MapPressEvent) => {
    if (!enableTapToAdd || !onLocationAdded) return;

    const coordinate = {
      latitude: event.nativeEvent.coordinate.latitude,
      longitude: event.nativeEvent.coordinate.longitude,
    };

    // Validate coordinate is within Singapore bounds
    if (
      coordinate.latitude >= 1.2 && coordinate.latitude <= 1.5 &&
      coordinate.longitude >= 103.6 && coordinate.longitude <= 104.0
    ) {
      onLocationAdded(coordinate);
    } else {
      Alert.alert(
        'Invalid Location',
        'Please select a location within Singapore.',
        [{ text: 'OK' }]
      );
    }
  }, [enableTapToAdd, onLocationAdded]);

  /**
   * Handle venue selection
   */
  const handleVenueSelect = useCallback((venue: Venue) => {
    setSelectedVenueId(venue.id);
    if (onVenueSelected) {
      onVenueSelected(venue);
    }
  }, [onVenueSelected]);

  /**
   * Focus map on optimal point and load venues
   */
  const focusOnOptimalPoint = useCallback(() => {
    if (!optimalPoint || !mapRef.current) return;

    const camera: Camera = {
      center: optimalPoint,
      zoom: 15,
      heading: 0,
      pitch: 0,
    };

    mapRef.current.animateCamera(camera, { duration: 1000 });
    loadVenues(optimalPoint);
  }, [optimalPoint, loadVenues]);

  /**
   * Focus map to show all user locations
   */
  const focusOnAllLocations = useCallback(() => {
    const locations = convertToUserLocations();
    if (locations.length === 0 || !mapRef.current) return;

    const coordinates = locations.map(loc => loc.coordinate);
    if (optimalPoint) {
      coordinates.push(optimalPoint);
    }

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [convertToUserLocations, optimalPoint]);

  /**
   * Effect to load venues when optimal point changes
   */
  React.useEffect(() => {
    if (optimalPoint && showVenues) {
      loadVenues(optimalPoint);
    }
  }, [optimalPoint, showVenues, loadVenues]);

  /**
   * Effect to focus on optimal point when it's set
   */
  React.useEffect(() => {
    if (optimalPoint) {
      focusOnOptimalPoint();
    } else if (userLocations.length > 0) {
      focusOnAllLocations();
    }
  }, [optimalPoint, userLocations.length, focusOnOptimalPoint, focusOnAllLocations]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        mapType={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        onPress={handleMapPress}
        provider="google"
        // Purple-themed map styling
        customMapStyle={[
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "water",
            elementType: "geometry.fill",
            stylers: [{ color: PurpleTheme.colors.primaryExtraLight }]
          }
        ]}
      >
        {/* Travel Routes */}
        {showRoutes && optimalPoint && (
          <TravelRoutes
            userLocations={convertToUserLocations()}
            optimalPoint={optimalPoint}
            showRoutes={true}
            animated={true}
            lineWidth={3}
          />
        )}

        {/* Venue Markers */}
        {showVenues && (
          <VenueMarkers
            venues={venues}
            showVenues={true}
            onVenueSelect={handleVenueSelect}
            selectedVenueId={selectedVenueId}
            maxVenues={15}
          />
        )}
      </MapView>
    </View>
  );
};

/**
 * Map control buttons component
 */
export interface MapControlsProps {
  /** Show route visualization */
  showRoutes: boolean;
  /** Show venue markers */
  showVenues: boolean;
  /** Callback to toggle routes */
  onToggleRoutes: (show: boolean) => void;
  /** Callback to toggle venues */
  onToggleVenues: (show: boolean) => void;
  /** Callback to focus on user locations */
  onFocusLocations?: () => void;
  /** Callback to focus on optimal point */
  onFocusOptimal?: () => void;
}

/**
 * Map controls for toggling features
 */
export const MapControls: React.FC<MapControlsProps> = ({
  showRoutes,
  showVenues,
  onToggleRoutes,
  onToggleVenues,
  onFocusLocations,
  onFocusOptimal,
}) => {
  return (
    <View style={styles.controlsContainer}>
      {/* Route toggle */}
      <View style={styles.controlButton}>
        {/* Control UI would go here */}
      </View>
    </View>
  );
};

/**
 * Enhanced Interactive Map with all features
 */
export interface EnhancedInteractiveMapProps extends InteractiveMapProps {
  /** Show map controls */
  showControls?: boolean;
  /** Map height */
  height?: number;
}

/**
 * Enhanced Interactive Map Component
 */
export const EnhancedInteractiveMap: React.FC<EnhancedInteractiveMapProps> = ({
  showControls = true,
  height,
  ...mapProps
}) => {
  const [localShowRoutes, setLocalShowRoutes] = useState(mapProps.showRoutes ?? true);
  const [localShowVenues, setLocalShowVenues] = useState(mapProps.showVenues ?? true);

  return (
    <View style={[styles.enhancedContainer, height && { height }]}>
      <InteractiveMap
        {...mapProps}
        showRoutes={localShowRoutes}
        showVenues={localShowVenues}
      />
      
      {showControls && (
        <MapControls
          showRoutes={localShowRoutes}
          showVenues={localShowVenues}
          onToggleRoutes={setLocalShowRoutes}
          onToggleVenues={setLocalShowVenues}
        />
      )}
    </View>
  );
};

/**
 * Utility functions for interactive map
 */
export const InteractiveMapUtils = {
  /**
   * Calculate optimal region to show all locations
   */
  calculateOptimalRegion: (
    locations: Coordinate[],
    padding: number = 0.01
  ): Region => {
    if (locations.length === 0) return DEFAULT_SINGAPORE_REGION;

    const latitudes = locations.map(loc => loc.latitude);
    const longitudes = locations.map(loc => loc.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) + padding,
      longitudeDelta: (maxLng - minLng) + padding,
    };
  },

  /**
   * Check if coordinate is within Singapore bounds
   */
  isInSingapore: (coordinate: Coordinate): boolean => {
    return (
      coordinate.latitude >= 1.2 && coordinate.latitude <= 1.5 &&
      coordinate.longitude >= 103.6 && coordinate.longitude <= 104.0
    );
  },

  /**
   * Get Singapore region for coordinate
   */
  getSingaporeRegion: (center?: Coordinate): Region => {
    const latitude = center?.latitude || 1.3521;
    const longitude = center?.longitude || 103.8198;

    return {
      latitude,
      longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  },
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  map: {
    flex: 1,
  },
  
  enhancedContainer: {
    flex: 1,
    position: 'relative',
  },
  
  controlsContainer: {
    position: 'absolute',
    top: PurpleTheme.spacing.lg,
    right: PurpleTheme.spacing.lg,
    backgroundColor: PurpleTheme.colors.white,
    borderRadius: PurpleTheme.borderRadius.md,
    padding: PurpleTheme.spacing.sm,
    ...PurpleTheme.shadows.md,
  },
  
  controlButton: {
    padding: PurpleTheme.spacing.sm,
    marginVertical: PurpleTheme.spacing.xs / 2,
  },
});

export default InteractiveMap;