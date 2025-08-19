import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants';

interface VenueMarkerProps {
  name: string;
  category?: string;
  isOptimal?: boolean;
  isSelected?: boolean;
  size?: number;
  showLabel?: boolean;
}

/**
 * VenueMarker component for displaying venue locations on Google Maps
 * Can be used with react-native-maps Marker component or as a standalone UI element
 */
export const VenueMarker: React.FC<VenueMarkerProps> = ({
  name,
  category,
  isOptimal = false,
  isSelected = false,
  size = 28,
  showLabel = true,
}) => {
  // Determine marker color based on status
  const getMarkerColor = () => {
    if (isOptimal) return colors.equity.excellent;
    if (isSelected) return colors.primary.main;
    return colors.transport.mixed;
  };

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.marker, 
          { 
            backgroundColor: getMarkerColor(),
            width: size,
            height: size,
            borderRadius: 6,
            transform: [{ rotate: '45deg' }]
          }
        ]}
      >
        {isOptimal && (
          <View style={styles.optimalIndicator} />
        )}
      </View>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{name}</Text>
          {category && (
            <Text style={styles.categoryLabel}>{category}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    borderWidth: 2,
    borderColor: colors.neutral.white,
    shadowColor: colors.neutral.gray900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimalIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral.white,
    transform: [{ rotate: '-45deg' }]
  },
  labelContainer: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    shadowColor: colors.neutral.gray900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.gray600,
  },
  categoryLabel: {
    fontSize: 10,
    color: colors.neutral.gray500,
    marginTop: 2,
  },
});
