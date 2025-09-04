/**
 * Configuration constants for LocationInput component
 * Includes transport modes, validation rules, and Singapore-specific settings
 */

import { TransportModeOption, ValidationRule, PlacesConfig } from './types';
import { SINGAPORE_REGION } from '../maps/types';

export const TRANSPORT_MODES: TransportModeOption[] = [
  {
    mode: 'DRIVING',
    label: 'Drive',
    icon: '🚗',
    color: '#6B7280',
    description: 'Private vehicle'
  },
  {
    mode: 'TRANSIT',
    label: 'MRT/Bus',
    icon: '🚇',
    color: '#0066CC',
    description: 'Public transport'
  },
  {
    mode: 'WALKING',
    label: 'Walk',
    icon: '🚶',
    color: '#10B981',
    description: 'Walking only'
  },
  {
    mode: 'CYCLING',
    label: 'Cycle',
    icon: '🚲',
    color: '#F59E0B',
    description: 'Bicycle'
  }
];

// Default component configuration
export const LOCATION_INPUT_CONFIG = {
  DEFAULT_MIN_LOCATIONS: 2,
  DEFAULT_MAX_LOCATIONS: 10,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 500,
  VALIDATION_DELAY: 1000,
  DISTANCE_CALCULATION_THRESHOLD: 5, // locations
};

// Singapore-specific Google Places configuration
export const SINGAPORE_PLACES_CONFIG: Omit<PlacesConfig, 'key'> = {
  language: 'en',
  components: 'country:sg',
  location: `${SINGAPORE_REGION.latitude},${SINGAPORE_REGION.longitude}`,
  radius: 50000, // 50km radius from Singapore center
  strictbounds: true,
};

// Form validation rules
export const VALIDATION_RULES: ValidationRule[] = [
  {
    validate: (locations) => locations.length >= LOCATION_INPUT_CONFIG.DEFAULT_MIN_LOCATIONS,
    errorMessage: 'At least 2 locations are required'
  },
  {
    validate: (locations) => locations.length <= LOCATION_INPUT_CONFIG.DEFAULT_MAX_LOCATIONS,
    errorMessage: 'Maximum 10 locations allowed'
  },
  {
    validate: (locations) => locations.every(loc => loc.address.trim().length > 0),
    errorMessage: 'All locations must have valid addresses'
  },
  {
    validate: (locations) => locations.every(loc => loc.transportMode),
    errorMessage: 'All locations must have selected transport mode'
  },
  {
    validate: (locations) => {
      const addresses = locations.map(loc => loc.address.toLowerCase().trim());
      return addresses.length === new Set(addresses).size;
    },
    errorMessage: 'Duplicate locations are not allowed'
  },
  {
    validate: (locations) => locations.every(loc => loc.isValid !== false),
    errorMessage: 'All locations must be valid Singapore addresses'
  }
];

// Singapore bounds for validation
export const SINGAPORE_BOUNDS = {
  north: 1.4764,
  south: 1.1496,
  east: 104.0270,
  west: 103.6057,
};

// Common Singapore landmarks and MRT stations for autocomplete suggestions
export const SINGAPORE_LANDMARKS = [
  'Marina Bay Sands',
  'Sentosa Island',
  'Orchard Road',
  'Changi Airport',
  'Marina Bay Financial Centre',
  'Singapore Botanic Gardens',
  'Clarke Quay',
  'Raffles Place MRT Station',
  'Dhoby Ghaut MRT Station',
  'City Hall MRT Station',
  'Jurong East MRT Station',
  'Tampines MRT Station',
  'Woodlands MRT Station',
  'Bishan MRT Station',
  'Ang Mo Kio MRT Station',
];

// Accessibility labels
export const ACCESSIBILITY_LABELS = {
  LOCATION_INPUT: 'Location address input',
  TRANSPORT_MODE_SELECTOR: 'Transport mode selector',
  ADD_LOCATION_BUTTON: 'Add new location',
  REMOVE_LOCATION_BUTTON: 'Remove location',
  CURRENT_LOCATION_BUTTON: 'Use current location',
  START_OPTIMIZATION_BUTTON: 'Start optimization',
  LOCATION_ITEM: 'Location item',
  TRANSPORT_MODE_OPTION: 'Transport mode option',
};

// Animation configurations
export const ANIMATION_CONFIG = {
  ADD_LOCATION: {
    duration: LOCATION_INPUT_CONFIG.ANIMATION_DURATION,
    useNativeDriver: true,
  },
  REMOVE_LOCATION: {
    duration: LOCATION_INPUT_CONFIG.ANIMATION_DURATION,
    useNativeDriver: true,
  },
  FADE_IN: {
    duration: 200,
    useNativeDriver: true,
  },
  SCALE_IN: {
    duration: 150,
    useNativeDriver: true,
  },
};

// Error messages
export const ERROR_MESSAGES = {
  LOCATION_PERMISSION_DENIED: 'Location permission is required to use current location',
  LOCATION_UNAVAILABLE: 'Current location is not available',
  GEOCODING_FAILED: 'Unable to validate address location',
  INVALID_SINGAPORE_ADDRESS: 'Address must be within Singapore',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred',
};