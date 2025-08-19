import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants';

interface UserMarkerProps {
  name?: string;
  color?: string;
  size?: number;
  showLabel?: boolean;
}

/**
 * UserMarker component for displaying user locations on Google Maps
 * Can be used with react-native-maps Marker component or as a standalone UI element
 */
export const UserMarker: React.FC<UserMarkerProps> = ({
  name,
  color = colors.primary.main,
  size = 24,
  showLabel = true,
}) => {
  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.marker, 
          { 
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2
          }
        ]}
      />
      {showLabel && name && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{name}</Text>
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
  },
  labelContainer: {
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    shadowColor: colors.neutral.gray900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.neutral.gray600,
  },
});
