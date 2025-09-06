/**
 * React Native MapView Component for Singapore Region
 * Optimized for transport equity analysis with 60fps performance
 */

import React, { 
  useCallback, 
  useMemo, 
  useRef, 
  useState, 
  useEffect,
  memo 
} from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  Dimensions,
  Alert 
} from 'react-native';
import MapView, { 
  PROVIDER_GOOGLE, 
  Region, 
  MapPressEvent,
  Camera 
} from 'react-native-maps';
import Supercluster from 'supercluster';
import { 
  MapViewProps,
  MapMarker,
  MarkerClusterData,
  ClusterPoint,
  Coordinate,
  SINGAPORE_REGION,
  MAP_PERFORMANCE_CONFIG,
  ACCESSIBILITY_CONFIG
} from './types';
import { CustomMarker, ClusterMarker } from './CustomMarker';

const { width, height } = Dimensions.get('window');

/**
 * High-performance MapView component optimized for Singapore region
 * Features marker clustering, smooth animations, and accessibility support
 */
const MapViewComponent: React.FC<MapViewProps> = memo(({
  userLocations = [],
  optimalPoint,
  venues = [],
  onMapReady,
  onMarkerPress,
  onMapPress,
  showUserLocation = true,
  style,
}) => {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(SINGAPORE_REGION);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [clusters, setClusters] = useState<ClusterPoint[]>([]);
  const clusterRef = useRef<Supercluster>(null);

  // Initialize clustering engine
  useEffect(() => {
    clusterRef.current = new Supercluster({
      radius: 60,
      maxZoom: MAP_PERFORMANCE_CONFIG.MAX_ZOOM_LEVEL,
      minZoom: MAP_PERFORMANCE_CONFIG.MIN_ZOOM_LEVEL,
      minPoints: MAP_PERFORMANCE_CONFIG.CLUSTER_THRESHOLD,
    });
  }, []);

  // Convert data to marker format for clustering
  const markerData = useMemo((): MarkerClusterData[] => {
    const markers: MarkerClusterData[] = [];

    // Add user location markers
    userLocations.forEach(user => {
      markers.push({
        id: `user-${user.id}`,
        coordinate: user.coordinate,
        type: 'user',
        data: user,
      });
    });

    // Add optimal point marker
    if (optimalPoint) {
      markers.push({
        id: 'optimal-point',
        coordinate: optimalPoint.coordinate,
        type: 'optimal',
        data: optimalPoint,
      });
    }

    // Add venue markers (lazy load based on zoom level)
    if (venues.length > 0) {
      venues.forEach(venue => {
        markers.push({
          id: `venue-${venue.id}`,
          coordinate: venue.coordinate,
          type: 'venue',
          data: venue,
        });
      });
    }

    return markers;
  }, [userLocations, optimalPoint, venues]);

  // Convert markers to GeoJSON features for clustering
  const geoJsonFeatures = useMemo(() => {
    return markerData.map(marker => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        marker: {
          id: marker.id,
          coordinate: marker.coordinate,
          type: marker.type,
          data: marker.data,
        } as MapMarker,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [marker.coordinate.longitude, marker.coordinate.latitude] as [number, number],
      },
    }));
  }, [markerData]);

  // Update clusters when data or region changes
  useEffect(() => {
    if (!clusterRef.current || !isMapReady) return;

    try {
      // Load points into clustering engine
      clusterRef.current.load(geoJsonFeatures);

      // Calculate zoom level from region
      const zoom = Math.log2(360 / region.longitudeDelta);
      const clampedZoom = Math.max(
        MAP_PERFORMANCE_CONFIG.MIN_ZOOM_LEVEL,
        Math.min(MAP_PERFORMANCE_CONFIG.MAX_ZOOM_LEVEL, zoom)
      );

      // Get visible bounds
      const bbox: [number, number, number, number] = [
        region.longitude - region.longitudeDelta / 2,
        region.latitude - region.latitudeDelta / 2,
        region.longitude + region.longitudeDelta / 2,
        region.latitude + region.latitudeDelta / 2,
      ];

      // Get clusters for current view
      const newClusters = clusterRef.current.getClusters(bbox, Math.floor(clampedZoom)) as ClusterPoint[];
      setClusters(newClusters);
    } catch (error) {
      console.error('Clustering error:', error);
    }
  }, [geoJsonFeatures, region, isMapReady]);

  // Handle map ready state
  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    setIsLoading(false);
    if (onMapReady) {
      // Use requestAnimationFrame for smooth callback execution
      requestAnimationFrame(() => {
        onMapReady();
      });
    }
  }, [onMapReady]);

  // Handle region change with performance optimization
  const handleRegionChangeComplete = useCallback((newRegion: Region) => {
    // Debounce region updates to avoid excessive clustering calculations
    const timeout = setTimeout(() => {
      setRegion(newRegion);
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  // Handle map press with coordinate callback
  const handleMapPress = useCallback((event: MapPressEvent) => {
    if (onMapPress) {
      const coordinate: Coordinate = {
        latitude: event.nativeEvent.coordinate.latitude,
        longitude: event.nativeEvent.coordinate.longitude,
      };
      
      // Use requestAnimationFrame for responsive touch handling
      requestAnimationFrame(() => {
        onMapPress(coordinate);
      });
    }
  }, [onMapPress]);

  // Handle marker press
  const handleMarkerPress = useCallback((marker: MapMarker) => {
    if (onMarkerPress) {
      requestAnimationFrame(() => {
        onMarkerPress(marker);
      });
    }
  }, [onMarkerPress]);

  // Handle cluster press (zoom in)
  const handleClusterPress = useCallback((cluster: ClusterPoint) => {
    if (!mapRef.current || !clusterRef.current) return;

    try {
      const expansionZoom = clusterRef.current.getClusterExpansionZoom(
        cluster.properties.cluster_id || 0
      );
      
      const camera: Camera = {
        center: {
          latitude: cluster.geometry.coordinates[1],
          longitude: cluster.geometry.coordinates[0],
        },
        zoom: Math.min(expansionZoom, MAP_PERFORMANCE_CONFIG.MAX_ZOOM_LEVEL),
      };

      mapRef.current.animateCamera(camera, {
        duration: MAP_PERFORMANCE_CONFIG.ANIMATION_DURATION,
      });
    } catch (error) {
      console.error('Cluster expansion error:', error);
    }
  }, []);

  // Error handler for map loading failures
  const handleMapError = useCallback((error: any) => {
    console.error('Map loading error:', error);
    setIsLoading(false);
    Alert.alert(
      'Map Error',
      'Failed to load map. Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }, []);

  // Render markers with clustering
  const renderMarkers = useCallback(() => {
    return clusters.map((cluster) => {
      const [longitude, latitude] = cluster.geometry.coordinates;
      const coordinate = { latitude, longitude };

      if (cluster.properties.cluster) {
        // Render cluster marker
        return (
          <ClusterMarker
            key={`cluster-${cluster.properties.cluster_id}`}
            coordinate={coordinate}
            count={cluster.properties.point_count || 0}
            onPress={() => handleClusterPress(cluster)}
          />
        );
      } else {
        // Render individual marker
        const marker = cluster.properties.marker;
        if (!marker) return null;

        return (
          <CustomMarker
            key={marker.id}
            marker={marker}
            onPress={handleMarkerPress}
          />
        );
      }
    });
  }, [clusters, handleClusterPress, handleMarkerPress]);

  // Platform-specific map configuration
  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
  const mapStyle = Platform.OS === 'ios' ? undefined : []; // Custom styles can be added here

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={mapProvider}
        style={styles.map}
        initialRegion={SINGAPORE_REGION}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
        onMapReady={handleMapReady}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={Platform.OS === 'ios'}
        toolbarEnabled={false}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        customMapStyle={mapStyle}
        maxZoomLevel={MAP_PERFORMANCE_CONFIG.MAX_ZOOM_LEVEL}
        minZoomLevel={MAP_PERFORMANCE_CONFIG.MIN_ZOOM_LEVEL}
        // Performance optimizations
        moveOnMarkerPress={false}
        loadingEnabled={isLoading}
        loadingIndicatorColor="#0066CC"
        loadingBackgroundColor="#F5F5F5"
        // Accessibility
        accessible={true}
        accessibilityLabel={ACCESSIBILITY_CONFIG.MAP_LABEL}
        accessibilityRole="image"
      >
        {renderMarkers()}
      </MapView>
    </View>
  );
});

MapViewComponent.displayName = 'MapViewComponent';

export default MapViewComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  map: {
    width: width,
    height: height,
    flex: 1,
  },
});