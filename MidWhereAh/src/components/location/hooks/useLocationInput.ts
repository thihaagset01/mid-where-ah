/**
 * Main hook for LocationInput component state management
 * Handles locations array, validation, form state, and business logic
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { UserLocationInput, FormValidationState } from '../types';
import { TransportMode } from '../../maps/types';
import { useLocationValidation } from './useLocationValidation';
import { useCurrentLocation } from './useCurrentLocation';
import { VALIDATION_RULES, LOCATION_INPUT_CONFIG, ERROR_MESSAGES } from '../constants';

interface UseLocationInputProps {
  onLocationsChange: (locations: UserLocationInput[]) => void;
  onStartOptimization: (locations: UserLocationInput[]) => void;
  maxLocations?: number;
  minLocations?: number;
}

interface UseLocationInputReturn {
  locations: UserLocationInput[];
  formValidation: FormValidationState;
  isLoading: boolean;
  addLocation: () => void;
  removeLocation: (id: string) => void;
  updateLocationAddress: (id: string, address: string) => void;
  updateLocationTransportMode: (id: string, mode: TransportMode) => void;
  addCurrentLocation: () => Promise<void>;
  startOptimization: () => void;
  canAddMoreLocations: boolean;
  canRemoveLocations: boolean;
}

/**
 * Generate unique ID for new locations
 */
const generateLocationId = (): string => {
  return `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create empty location object
 */
const createEmptyLocation = (): UserLocationInput => ({
  id: generateLocationId(),
  address: '',
  transportMode: 'TRANSIT', // Default to public transport
  isValid: undefined,
});

/**
 * Main hook for managing location input state and operations
 */
export const useLocationInput = ({
  onLocationsChange,
  onStartOptimization,
  maxLocations = LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS,
  minLocations = LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS,
}: UseLocationInputProps): UseLocationInputReturn => {
  
  const [locations, setLocations] = useState<UserLocationInput[]>([
    createEmptyLocation(),
    createEmptyLocation(),
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const { validateAllLocations } = useLocationValidation();
  const { getCurrentLocation, currentLocationState } = useCurrentLocation();

  /**
   * Validate form state based on current locations
   */
  const formValidation = useMemo((): FormValidationState => {
    const errors: string[] = [];
    
    VALIDATION_RULES.forEach(rule => {
      if (!rule.validate(locations)) {
        errors.push(rule.errorMessage);
      }
    });

    const isValid = errors.length === 0;
    const canStartOptimization = isValid && locations.length >= minLocations;

    return {
      isValid,
      errors,
      canStartOptimization,
    };
  }, [locations, minLocations]);

  /**
   * Check if more locations can be added
   */
  const canAddMoreLocations = useMemo(() => {
    return locations.length < maxLocations;
  }, [locations.length, maxLocations]);

  /**
   * Check if locations can be removed
   */
  const canRemoveLocations = useMemo(() => {
    return locations.length > minLocations;
  }, [locations.length, minLocations]);

  /**
   * Add a new empty location
   */
  const addLocation = useCallback(() => {
    if (!canAddMoreLocations) {
      Alert.alert(
        'Maximum Locations Reached',
        `You can add up to ${maxLocations} locations only.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const newLocation = createEmptyLocation();
    setLocations(prev => [...prev, newLocation]);
  }, [canAddMoreLocations, maxLocations]);

  /**
   * Remove a location by ID
   */
  const removeLocation = useCallback((id: string) => {
    if (!canRemoveLocations) {
      Alert.alert(
        'Minimum Locations Required',
        `You need at least ${minLocations} locations for optimization.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setLocations(prev => prev.filter(loc => loc.id !== id));
  }, [canRemoveLocations, minLocations]);

  /**
   * Update location address and trigger validation
   */
  const updateLocationAddress = useCallback(async (id: string, address: string) => {
    setLocations(prev => prev.map(loc => 
      loc.id === id 
        ? { 
            ...loc, 
            address, 
            isValid: undefined, // Reset validation state
            errorMessage: undefined,
            coordinate: undefined,
          }
        : loc
    ));

    // Debounced validation would go here in a real implementation
    // For now, we'll validate immediately for demonstration
    if (address.trim()) {
      setTimeout(async () => {
        const updatedLocations = await validateAllLocations(
          locations.map(loc => loc.id === id ? { ...loc, address } : loc)
        );
        setLocations(updatedLocations);
      }, LOCATION_INPUT_CONFIG.DEBOUNCE_DELAY);
    }
  }, [locations, validateAllLocations]);

  /**
   * Update location transport mode
   */
  const updateLocationTransportMode = useCallback((id: string, mode: TransportMode) => {
    setLocations(prev => prev.map(loc => 
      loc.id === id ? { ...loc, transportMode: mode } : loc
    ));
  }, []);

  /**
   * Add current location as a new location entry
   */
  const addCurrentLocation = useCallback(async () => {
    if (!canAddMoreLocations) {
      Alert.alert(
        'Maximum Locations Reached',
        `You can add up to ${maxLocations} locations only.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);

    try {
      const coordinate = await getCurrentLocation();
      
      if (coordinate) {
        const currentLocationEntry: UserLocationInput = {
          id: generateLocationId(),
          address: 'Current Location',
          coordinate,
          transportMode: 'WALKING', // Default for current location
          isCurrentLocation: true,
          isValid: true,
        };

        setLocations(prev => [...prev, currentLocationEntry]);
      }
    } catch (error) {
      Alert.alert(
        'Location Error',
        ERROR_MESSAGES.LOCATION_UNAVAILABLE,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [canAddMoreLocations, maxLocations, getCurrentLocation]);

  /**
   * Start optimization process
   */
  const startOptimization = useCallback(() => {
    if (!formValidation.canStartOptimization) {
      Alert.alert(
        'Validation Error',
        formValidation.errors.join('\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    onStartOptimization(locations);
  }, [formValidation, locations, onStartOptimization]);

  /**
   * Notify parent component when locations change
   */
  useEffect(() => {
    onLocationsChange(locations);
  }, [locations, onLocationsChange]);

  return {
    locations,
    formValidation,
    isLoading: isLoading || currentLocationState.isLoading,
    addLocation,
    removeLocation,
    updateLocationAddress,
    updateLocationTransportMode,
    addCurrentLocation,
    startOptimization,
    canAddMoreLocations,
    canRemoveLocations,
  };
};