/**
 * Venue Markers Component for MidWhereAh
 * 
 * Displays venue markers around optimal meeting points with ratings,
 * categories, and purple-themed design.
 * 
 * @author MidWhereAh Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import LinearGradient from 'react-native-linear-gradient';
import { PurpleTheme } from '../../design/theme';
import { Coordinate } from './types';
import { Venue, VenueType } from '../../services/venues/venueDiscoveryService';

/**
 * Venue Markers Props
 */
export interface VenueMarkersProps {
  /** Array of venues to display */
  venues: Venue[];
  /** Show/hide venue markers */
  showVenues: boolean;
  /** Callback when venue is selected */
  onVenueSelect?: (venue: Venue) => void;
  /** Selected venue ID */
  selectedVenueId?: string;
  /** Custom style override */
  style?: ViewStyle;
  /** Maximum number of venues to show */
  maxVenues?: number;
}

/**
 * Venue type icons and colors
 */
const VenueTypeConfig = {
  restaurant: {
    icon: '🍽️',
    color: PurpleTheme.colors.primary,
    label: 'Restaurant',
  },
  cafe: {
    icon: '☕',
    color: PurpleTheme.colors.primaryLight,
    label: 'Cafe',
  },
  meeting_room: {
    icon: '🏢',
    color: PurpleTheme.colors.primaryDark,
    label: 'Meeting Room',
  },
  mall: {
    icon: '🏬',
    color: PurpleTheme.colors.purple600,
    label: 'Shopping Mall',
  },
  park: {
    icon: '🌳',
    color: PurpleTheme.colors.success,
    label: 'Park',
  },
  hawker_center: {
    icon: '🍜',
    color: PurpleTheme.colors.warning,
    label: 'Hawker Center',
  },
  bar: {
    icon: '🍸',
    color: PurpleTheme.colors.purple700,
    label: 'Bar',
  },
  entertainment: {
    icon: '🎬',
    color: PurpleTheme.colors.purple500,
    label: 'Entertainment',
  },
} as const;

/**
 * Star rating component
 */
const StarRating: React.FC<{ rating: number; size?: number }> = ({ rating, size = 12 }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <View style={styles.starContainer}>
      {Array.from({ length: 5 }, (_, index) => {
        let starChar = '☆'; // Empty star
        if (index < fullStars) {
          starChar = '★'; // Full star
        } else if (index === fullStars && hasHalfStar) {
          starChar = '⭐'; // Half star (using different emoji)
        }
        
        return (
          <Text
            key={index}
            style={[
              styles.star,
              { fontSize: size, color: PurpleTheme.colors.warning }
            ]}
          >
            {starChar}
          </Text>
        );
      })}
    </View>
  );
};

/**
 * Venue marker icon component
 */
const VenueMarkerIcon: React.FC<{
  venue: Venue;
  isSelected: boolean;
  size?: 'small' | 'medium' | 'large';
}> = ({ venue, isSelected, size = 'medium' }) => {
  const config = VenueTypeConfig[venue.type];
  const sizeConfig = {
    small: { width: 24, height: 24, fontSize: 12 },
    medium: { width: 32, height: 32, fontSize: 16 },
    large: { width: 40, height: 40, fontSize: 20 },
  };
  
  const { width, height, fontSize } = sizeConfig[size];
  
  return (
    <View style={[styles.markerContainer, { width, height }]}>
      <LinearGradient
        colors={isSelected 
          ? [...[PurpleTheme.colors.primary, PurpleTheme.colors.primaryLight]]
          : [...[config.color, PurpleTheme.colors.white]]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.markerGradient,
          {
            width,
            height,
            borderRadius: width / 2,
          },
          isSelected && styles.selectedMarker,
        ]}
      >
        <Text style={[styles.markerIcon, { fontSize }]}>
          {config.icon}
        </Text>
      </LinearGradient>
      
      {venue.rating && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>
            {venue.rating.toFixed(1)}
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * Venue callout content component
 */
const VenueCallout: React.FC<{
  venue: Venue;
  onSelect?: () => void;
}> = ({ venue, onSelect }) => {
  const config = VenueTypeConfig[venue.type];
  
  return (
    <View style={styles.calloutContainer}>
      <View style={styles.calloutHeader}>
        <Text style={styles.venueName} numberOfLines={1}>
          {venue.name}
        </Text>
        <View style={styles.venueTypeChip}>
          <Text style={styles.venueTypeText}>{config.label}</Text>
        </View>
      </View>
      
      <Text style={styles.venueAddress} numberOfLines={2}>
        {venue.address}
      </Text>
      
      <View style={styles.venueDetails}>
        {venue.rating && (
          <View style={styles.detailRow}>
            <StarRating rating={venue.rating} size={10} />
            <Text style={styles.reviewCount}>
              {venue.reviewCount ? `(${venue.reviewCount})` : ''}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.distanceText}>
            📍 {Math.round(venue.distance)}m away
          </Text>
        </View>
        
        {venue.hours?.openNow !== undefined && (
          <View style={styles.detailRow}>
            <Text style={[
              styles.hoursText,
              { color: venue.hours.openNow ? PurpleTheme.colors.success : PurpleTheme.colors.error }
            ]}>
              {venue.hours.openNow ? '🟢 Open now' : '🔴 Closed'}
            </Text>
          </View>
        )}
        
        {venue.priceLevel && (
          <View style={styles.detailRow}>
            <Text style={styles.priceText}>
              {'💰'.repeat(venue.priceLevel)}
            </Text>
          </View>
        )}
      </View>
      
      {onSelect && (
        <TouchableOpacity style={styles.selectButton} onPress={onSelect}>
          <LinearGradient
            colors={[...PurpleTheme.gradients.button.colors]}
            start={PurpleTheme.gradients.button.direction.start}
            end={PurpleTheme.gradients.button.direction.end}
            style={styles.selectButtonGradient}
          >
            <Text style={styles.selectButtonText}>Select Venue</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Venue Markers Component
 */
export const VenueMarkers: React.FC<VenueMarkersProps> = ({
  venues,
  showVenues,
  onVenueSelect,
  selectedVenueId,
  style,
  maxVenues = 20,
}) => {
  const [visibleVenues, setVisibleVenues] = useState<Venue[]>([]);

  useEffect(() => {
    if (showVenues) {
      // Sort venues by rating and distance, then limit
      const sortedVenues = [...venues]
        .sort((a, b) => {
          // Prioritize by rating first, then by distance
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (Math.abs(ratingDiff) > 0.1) return ratingDiff;
          return a.distance - b.distance;
        })
        .slice(0, maxVenues);
      
      setVisibleVenues(sortedVenues);
    } else {
      setVisibleVenues([]);
    }
  }, [venues, showVenues, maxVenues]);

  if (!showVenues || visibleVenues.length === 0) {
    return null;
  }

  return (
    <>
      {visibleVenues.map((venue) => (
        <Marker
          key={`venue-${venue.id}`}
          coordinate={venue.location}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={selectedVenueId === venue.id ? 1000 : 100}
        >
          <VenueMarkerIcon
            venue={venue}
            isSelected={selectedVenueId === venue.id}
          />
          
          <Callout tooltip={false}>
            <VenueCallout
              venue={venue}
              onSelect={onVenueSelect ? () => onVenueSelect(venue) : undefined}
            />
          </Callout>
        </Marker>
      ))}
    </>
  );
};

/**
 * Venue cluster marker for showing grouped venues
 */
export const VenueClusterMarker: React.FC<{
  coordinate: Coordinate;
  venueCount: number;
  onPress?: () => void;
}> = ({ coordinate, venueCount, onPress }) => {
  return (
    <Marker coordinate={coordinate} onPress={onPress}>
      <View style={styles.clusterContainer}>
        <LinearGradient
          colors={[...PurpleTheme.gradients.primary.colors]}
          style={styles.clusterGradient}
        >
          <Text style={styles.clusterText}>{venueCount}</Text>
        </LinearGradient>
      </View>
    </Marker>
  );
};

/**
 * Utility functions for venue markers
 */
export const VenueMarkerUtils = {
  /**
   * Filter venues by type
   */
  filterVenuesByType: (venues: Venue[], types: VenueType[]): Venue[] => {
    return venues.filter(venue => types.includes(venue.type));
  },

  /**
   * Get venues within distance
   */
  getVenuesWithinDistance: (venues: Venue[], maxDistance: number): Venue[] => {
    return venues.filter(venue => venue.distance <= maxDistance);
  },

  /**
   * Get highly rated venues
   */
  getHighlyRatedVenues: (venues: Venue[], minRating: number = 4.0): Venue[] => {
    return venues.filter(venue => (venue.rating || 0) >= minRating);
  },

  /**
   * Group venues by type
   */
  groupVenuesByType: (venues: Venue[]): Record<VenueType, Venue[]> => {
    const grouped = {} as Record<VenueType, Venue[]>;
    
    venues.forEach(venue => {
      if (!grouped[venue.type]) {
        grouped[venue.type] = [];
      }
      grouped[venue.type].push(venue);
    });
    
    return grouped;
  },
};

/**
 * Styles
 */
const styles = StyleSheet.create({
  markerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  markerGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: PurpleTheme.colors.white,
    ...PurpleTheme.shadows.sm,
  },
  
  selectedMarker: {
    borderColor: PurpleTheme.colors.primaryDark,
    borderWidth: 3,
    ...PurpleTheme.shadows.lg,
  },
  
  markerIcon: {
    textAlign: 'center',
  },
  
  ratingBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: PurpleTheme.colors.warning,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  
  ratingText: {
    color: PurpleTheme.colors.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  
  calloutContainer: {
    width: 200,
    padding: PurpleTheme.spacing.md,
  },
  
  calloutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PurpleTheme.spacing.sm,
  },
  
  venueName: {
    ...PurpleTheme.typography.styles.h4,
    color: PurpleTheme.colors.textPrimary,
    flex: 1,
    marginRight: PurpleTheme.spacing.sm,
  },
  
  venueTypeChip: {
    backgroundColor: PurpleTheme.colors.purple100,
    paddingHorizontal: PurpleTheme.spacing.xs,
    paddingVertical: PurpleTheme.spacing.xs / 2,
    borderRadius: PurpleTheme.borderRadius.xs,
  },
  
  venueTypeText: {
    ...PurpleTheme.typography.styles.caption,
    color: PurpleTheme.colors.primary,
    fontSize: 10,
  },
  
  venueAddress: {
    ...PurpleTheme.typography.styles.bodySmall,
    color: PurpleTheme.colors.textSecondary,
    marginBottom: PurpleTheme.spacing.sm,
  },
  
  venueDetails: {
    marginBottom: PurpleTheme.spacing.sm,
  },
  
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: PurpleTheme.spacing.xs / 2,
  },
  
  starContainer: {
    flexDirection: 'row',
    marginRight: PurpleTheme.spacing.xs,
  },
  
  star: {
    marginRight: 1,
  },
  
  reviewCount: {
    ...PurpleTheme.typography.styles.caption,
    color: PurpleTheme.colors.textLight,
    fontSize: 10,
  },
  
  distanceText: {
    ...PurpleTheme.typography.styles.caption,
    color: PurpleTheme.colors.textSecondary,
    fontSize: 10,
  },
  
  hoursText: {
    ...PurpleTheme.typography.styles.caption,
    fontSize: 10,
    fontWeight: '500',
  },
  
  priceText: {
    fontSize: 10,
  },
  
  selectButton: {
    borderRadius: PurpleTheme.borderRadius.sm,
    overflow: 'hidden',
  },
  
  selectButtonGradient: {
    paddingVertical: PurpleTheme.spacing.sm,
    paddingHorizontal: PurpleTheme.spacing.md,
    alignItems: 'center',
  },
  
  selectButtonText: {
    ...PurpleTheme.typography.styles.caption,
    color: PurpleTheme.colors.white,
    fontWeight: '600',
    fontSize: 11,
  },
  
  clusterContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    ...PurpleTheme.shadows.md,
  },
  
  clusterGradient: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  
  clusterText: {
    color: PurpleTheme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default VenueMarkers;