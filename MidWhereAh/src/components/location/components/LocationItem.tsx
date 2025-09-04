/**
 * LocationItem Component
 * Individual location input with address autocomplete and transport mode selection
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { LocationItemProps } from '../types';
import { TransportModeSelector } from './TransportModeSelector';
import { ACCESSIBILITY_LABELS, SINGAPORE_PLACES_CONFIG } from '../constants';

/**
 * Individual location item with address input and transport mode selection
 * Includes smooth animations and validation feedback
 */
export const LocationItem: React.FC<LocationItemProps> = ({
  location,
  index,
  onRemove,
  onUpdateAddress,
  onUpdateTransportMode,
  isRemovable,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  /**
   * Handle remove animation and callback
   */
  const handleRemove = () => {
    if (!isRemovable) {
      Alert.alert(
        'Cannot Remove',
        'You need at least 2 locations for optimization.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Animate removal
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(location.id);
    });
  };

  /**
   * Handle focus animations
   */
  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Handle blur animations
   */
  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Get validation status styling
   */
  const getValidationStyle = () => {
    if (location.isValid === undefined) return {};
    if (location.isValid) return styles.validInput;
    return styles.invalidInput;
  };

  // Note: For demo purposes, we're using a simple TextInput
  // In production, you would configure GooglePlacesAutocomplete with your API key
  const renderAddressInput = () => {
    if (location.isCurrentLocation) {
      return (
        <View style={[styles.currentLocationContainer]}>
          <Text style={styles.currentLocationIcon}>📍</Text>
          <Text style={styles.currentLocationText}>Current Location</Text>
        </View>
      );
    }

    // Simplified address input for demo
    // In production, replace with GooglePlacesAutocomplete
    return (
      <TextInput
        style={[styles.addressInput, getValidationStyle()]}
        placeholder={`Location ${index + 1} address (Singapore)`}
        value={location.address}
        onChangeText={(text) => onUpdateAddress(location.id, text)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        multiline={false}
        accessibilityLabel={`${ACCESSIBILITY_LABELS.LOCATION_INPUT} ${index + 1}`}
        accessibilityHint="Enter a Singapore address for this location"
      />
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        },
        isFocused && styles.focusedContainer,
      ]}
    >
      {/* Location Header */}
      <View style={styles.header}>
        <Text style={styles.locationNumber}>Location {index + 1}</Text>
        {isRemovable && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            accessibilityRole="button"
            accessibilityLabel={`${ACCESSIBILITY_LABELS.REMOVE_LOCATION_BUTTON} ${index + 1}`}
            accessibilityHint="Remove this location from the list"
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Address Input */}
      <View style={styles.addressContainer}>
        {renderAddressInput()}
        {location.errorMessage && (
          <Text style={styles.errorText}>{location.errorMessage}</Text>
        )}
        {location.isValid && !location.errorMessage && (
          <Text style={styles.successText}>✓ Valid Singapore address</Text>
        )}
      </View>

      {/* Transport Mode Selector */}
      <TransportModeSelector
        selectedMode={location.transportMode}
        onModeSelect={(mode) => onUpdateTransportMode(location.id, mode)}
        style={styles.transportModeContainer}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    
    // Elevation for Android
    elevation: 3,
  },
  focusedContainer: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  addressContainer: {
    marginBottom: 20,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    minHeight: 56,
  },
  validInput: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  invalidInput: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  currentLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  currentLocationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  currentLocationText: {
    fontSize: 16,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  successText: {
    color: '#10B981',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '500',
  },
  transportModeContainer: {
    marginTop: 4,
  },
});