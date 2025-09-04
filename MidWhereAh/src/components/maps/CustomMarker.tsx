/**
 * Custom marker components for MapView
 * Optimized for performance and accessibility
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import { 
  MapMarker, 
  UserLocation, 
  OptimalPoint, 
  Venue, 
  MARKER_COLORS,
  ACCESSIBILITY_CONFIG 
} from './types';

interface CustomMarkerProps {
  marker: MapMarker;
  onPress?: (marker: MapMarker) => void;
}

/**
 * User location marker with transport mode color coding
 */
const UserMarkerView: React.FC<{ user: UserLocation }> = React.memo(({ user }) => {
  const color = MARKER_COLORS.user[user.transportMode];
  
  return (
    <View style={[styles.userMarker, { backgroundColor: color }]}>
      <Text style={styles.userMarkerText}>
        {user.transportMode.charAt(0)}
      </Text>
      {user.travelTime && (
        <Text style={styles.travelTimeText}>
          {Math.round(user.travelTime)}m
        </Text>
      )}
    </View>
  );
});

UserMarkerView.displayName = 'UserMarkerView';

/**
 * Optimal meeting point marker with equity level color coding
 */
const OptimalPointView: React.FC<{ optimalPoint: OptimalPoint }> = React.memo(({ optimalPoint }) => {
  const color = MARKER_COLORS.optimal[optimalPoint.equityLevel];
  
  return (
    <View style={[styles.optimalMarker, { backgroundColor: color }]}>
      <Text style={styles.optimalMarkerText}>★</Text>
      <View style={styles.equityBadge}>
        <Text style={styles.equityText}>
          {(optimalPoint.jainsIndex * 100).toFixed(0)}%
        </Text>
      </View>
    </View>
  );
});

OptimalPointView.displayName = 'OptimalPointView';

/**
 * Venue marker
 */
const VenueMarkerView: React.FC<{ venue: Venue }> = React.memo(({ venue }) => (
  <View style={[styles.venueMarker, { backgroundColor: MARKER_COLORS.venue }]}>
    <Text style={styles.venueMarkerText}>📍</Text>
  </View>
));

VenueMarkerView.displayName = 'VenueMarkerView';

/**
 * Cluster marker for grouped markers
 */
const ClusterMarkerView: React.FC<{ count: number }> = React.memo(({ count }) => {
  const size = Math.min(60, Math.max(30, 30 + (count / 10) * 15));
  
  return (
    <View style={[styles.clusterMarker, { width: size, height: size }]}>
      <Text style={styles.clusterText}>{count}</Text>
    </View>
  );
});

ClusterMarkerView.displayName = 'ClusterMarkerView';

/**
 * Main custom marker component that renders appropriate marker based on type
 */
export const CustomMarker: React.FC<CustomMarkerProps> = React.memo(({ marker, onPress }) => {
  const getAccessibilityLabel = (): string => {
    switch (marker.type) {
      case 'user':
        const user = marker.data as UserLocation;
        return `${ACCESSIBILITY_CONFIG.USER_MARKER_LABEL} using ${user.transportMode}${user.name ? ` for ${user.name}` : ''}`;
      case 'optimal':
        const optimal = marker.data as OptimalPoint;
        return `${ACCESSIBILITY_CONFIG.OPTIMAL_POINT_LABEL} with ${optimal.equityLevel} equity level`;
      case 'venue':
        const venue = marker.data as Venue;
        return `${ACCESSIBILITY_CONFIG.VENUE_MARKER_LABEL} ${venue.name}`;
      default:
        return 'Map marker';
    }
  };

  const handlePress = (): void => {
    if (onPress) {
      // Use native driver for touch response optimization
      requestAnimationFrame(() => {
        onPress(marker);
      });
    }
  };

  const renderMarkerView = (): React.ReactNode => {
    switch (marker.type) {
      case 'user':
        return <UserMarkerView user={marker.data as UserLocation} />;
      case 'optimal':
        return <OptimalPointView optimalPoint={marker.data as OptimalPoint} />;
      case 'venue':
        return <VenueMarkerView venue={marker.data as Venue} />;
      default:
        return <View style={styles.defaultMarker} />;
    }
  };

  return (
    <Marker
      coordinate={marker.coordinate}
      onPress={handlePress}
      accessible={true}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="button"
      tracksViewChanges={Platform.OS === 'android'} // Optimize for iOS
    >
      {renderMarkerView()}
    </Marker>
  );
});

CustomMarker.displayName = 'CustomMarker';

/**
 * Cluster marker component
 */
export const ClusterMarker: React.FC<{
  coordinate: { latitude: number; longitude: number };
  count: number;
  onPress?: () => void;
}> = React.memo(({ coordinate, count, onPress }) => {
  const handlePress = (): void => {
    if (onPress) {
      requestAnimationFrame(() => {
        onPress();
      });
    }
  };

  return (
    <Marker
      coordinate={coordinate}
      onPress={handlePress}
      accessible={true}
      accessibilityLabel={`${ACCESSIBILITY_CONFIG.CLUSTER_LABEL} with ${count} markers`}
      accessibilityRole="button"
      tracksViewChanges={Platform.OS === 'android'}
    >
      <ClusterMarkerView count={count} />
    </Marker>
  );
});

ClusterMarker.displayName = 'ClusterMarker';

const styles = StyleSheet.create({
  userMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  userMarkerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  travelTimeText: {
    position: 'absolute',
    top: -20,
    fontSize: 10,
    color: '#333333',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  optimalMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  optimalMarkerText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  equityBadge: {
    position: 'absolute',
    top: -15,
    backgroundColor: '#333333',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  equityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  venueMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  venueMarkerText: {
    fontSize: 14,
  },
  clusterMarker: {
    backgroundColor: '#FF6B6B',
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  clusterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  defaultMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CCCCCC',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});