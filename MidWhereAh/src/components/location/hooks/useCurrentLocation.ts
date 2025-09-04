/**
 * Custom hook for handling current location detection with permissions
 * Handles GPS permissions, location retrieval, and error states
 */

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { CurrentLocationState, LocationPermissionStatus } from '../types';
import { ERROR_MESSAGES, SINGAPORE_BOUNDS } from '../constants';
import { Coordinate } from '../../maps/types';

interface UseCurrentLocationReturn {
  currentLocationState: CurrentLocationState;
  getCurrentLocation: () => Promise<Coordinate | null>;
  requestLocationPermission: () => Promise<boolean>;
}

/**
 * Hook for managing current location functionality
 * Handles permissions, GPS detection, and Singapore bounds validation
 */
export const useCurrentLocation = (): UseCurrentLocationReturn => {
  const [currentLocationState, setCurrentLocationState] = useState<CurrentLocationState>({
    isLoading: false,
    hasPermission: 'undetermined',
  });

  /**
   * Request location permission from user
   */
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      setCurrentLocationState(prev => ({ ...prev, isLoading: true }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      
      let permissionStatus: LocationPermissionStatus;
      switch (status) {
        case Location.PermissionStatus.GRANTED:
          permissionStatus = 'granted';
          break;
        case Location.PermissionStatus.DENIED:
          permissionStatus = 'denied';
          break;
        default:
          permissionStatus = 'undetermined';
      }

      setCurrentLocationState(prev => ({
        ...prev,
        hasPermission: permissionStatus,
        isLoading: false,
        errorMessage: permissionStatus === 'denied' ? ERROR_MESSAGES.LOCATION_PERMISSION_DENIED : undefined,
      }));

      if (permissionStatus === 'denied') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access in your device settings to use current location feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() },
          ]
        );
      }

      return permissionStatus === 'granted';
    } catch (error) {
      setCurrentLocationState(prev => ({
        ...prev,
        isLoading: false,
        errorMessage: ERROR_MESSAGES.UNKNOWN_ERROR,
      }));
      return false;
    }
  }, []);

  /**
   * Validate if coordinate is within Singapore bounds
   */
  const isWithinSingaporeBounds = useCallback((coordinate: Coordinate): boolean => {
    return (
      coordinate.latitude >= SINGAPORE_BOUNDS.south &&
      coordinate.latitude <= SINGAPORE_BOUNDS.north &&
      coordinate.longitude >= SINGAPORE_BOUNDS.west &&
      coordinate.longitude <= SINGAPORE_BOUNDS.east
    );
  }, []);

  /**
   * Get current location coordinates
   */
  const getCurrentLocation = useCallback(async (): Promise<Coordinate | null> => {
    try {
      setCurrentLocationState(prev => ({ ...prev, isLoading: true, errorMessage: undefined }));

      // Check permission first
      if (currentLocationState.hasPermission !== 'granted') {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          return null;
        }
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordinate: Coordinate = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Validate Singapore bounds
      if (!isWithinSingaporeBounds(coordinate)) {
        setCurrentLocationState(prev => ({
          ...prev,
          isLoading: false,
          errorMessage: ERROR_MESSAGES.INVALID_SINGAPORE_ADDRESS,
        }));
        
        Alert.alert(
          'Location Outside Singapore',
          'Your current location appears to be outside Singapore. This app is designed for Singapore locations only.',
          [{ text: 'OK' }]
        );
        
        return null;
      }

      setCurrentLocationState(prev => ({
        ...prev,
        isLoading: false,
        errorMessage: undefined,
      }));

      return coordinate;

    } catch (error) {
      let errorMessage = ERROR_MESSAGES.LOCATION_UNAVAILABLE;
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = ERROR_MESSAGES.LOCATION_PERMISSION_DENIED;
        } else if (error.message.includes('network')) {
          errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
        }
      }

      setCurrentLocationState(prev => ({
        ...prev,
        isLoading: false,
        errorMessage,
      }));

      Alert.alert(
        'Location Error',
        errorMessage,
        [{ text: 'OK' }]
      );

      return null;
    }
  }, [currentLocationState.hasPermission, requestLocationPermission, isWithinSingaporeBounds]);

  return {
    currentLocationState,
    getCurrentLocation,
    requestLocationPermission,
  };
};