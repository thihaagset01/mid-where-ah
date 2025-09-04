/**
 * AddLocationButton Component
 * Floating action button for adding new locations with animations
 */

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { AddLocationButtonProps } from '../types';
import { ACCESSIBILITY_LABELS } from '../constants';

/**
 * Floating action button for adding new locations
 * Includes pulse animation and disabled state handling
 */
export const AddLocationButton: React.FC<AddLocationButtonProps> = ({
  onPress,
  disabled = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /**
   * Start pulse animation when component mounts
   */
  useEffect(() => {
    if (!disabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [disabled, pulseAnim]);

  /**
   * Handle press with animation
   */
  const handlePress = () => {
    if (disabled) return;

    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [
            { scale: scaleAnim },
            { scale: disabled ? 1 : pulseAnim },
          ],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          disabled && styles.disabledButton,
        ]}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={ACCESSIBILITY_LABELS.ADD_LOCATION_BUTTON}
        accessibilityHint="Add a new location to the list"
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.icon, disabled && styles.disabledIcon]}>
          +
        </Text>
        <Text style={[styles.label, disabled && styles.disabledLabel]}>
          Add Location
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * Current location button variant
 */
export const CurrentLocationButton: React.FC<AddLocationButtonProps> = ({
  onPress,
  disabled = false,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  /**
   * Handle press with animation
   */
  const handlePress = () => {
    if (disabled) return;

    // Scale animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.currentLocationButton,
          disabled && styles.disabledButton,
        ]}
        onPress={handlePress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={ACCESSIBILITY_LABELS.CURRENT_LOCATION_BUTTON}
        accessibilityHint="Add your current location to the list"
        accessibilityState={{ disabled }}
      >
        <Text style={[styles.currentLocationIcon, disabled && styles.disabledIcon]}>
          📍
        </Text>
        <Text style={[styles.currentLocationLabel, disabled && styles.disabledLabel]}>
          Current Location
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    
    // Shadow for iOS
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    
    // Elevation for Android
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
    shadowColor: '#6B7280',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginRight: 8,
  },
  disabledIcon: {
    color: '#9CA3AF',
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledLabel: {
    color: '#9CA3AF',
  },
  currentLocationButton: {
    backgroundColor: '#10B981',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    
    // Shadow for iOS
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    
    // Elevation for Android
    elevation: 6,
  },
  currentLocationIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  currentLocationLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});