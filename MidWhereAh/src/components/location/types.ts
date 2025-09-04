/**
 * TypeScript interfaces for LocationInput component
 * Extends existing types from maps/types.ts for consistency
 */

import { Coordinate, TransportMode } from '../maps/types';

export interface LocationInputProps {
  onLocationsChange: (locations: UserLocationInput[]) => void;
  onStartOptimization: (locations: UserLocationInput[]) => void;
  maxLocations?: number;
  minLocations?: number;
}

export interface UserLocationInput {
  id: string;
  address: string;
  coordinate?: Coordinate;
  transportMode: TransportMode;
  isCurrentLocation?: boolean;
  isValid?: boolean;
  errorMessage?: string;
}

export interface TransportModeOption {
  mode: TransportMode;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  coordinate?: Coordinate;
  formattedAddress?: string;
  errorMessage?: string;
}

export interface LocationItemProps {
  location: UserLocationInput;
  index: number;
  onRemove: (id: string) => void;
  onUpdateAddress: (id: string, address: string) => void;
  onUpdateTransportMode: (id: string, mode: TransportMode) => void;
  isRemovable: boolean;
}

export interface TransportModeSelectorProps {
  selectedMode: TransportMode;
  onModeSelect: (mode: TransportMode) => void;
  style?: any;
}

export interface AddLocationButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}

// Singapore-specific Google Places configuration
export interface PlacesConfig {
  key: string;
  language: string;
  components: string;
  location: string;
  radius: number;
  strictbounds: boolean;
}

// Location permission states
export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'restricted';

export interface CurrentLocationState {
  isLoading: boolean;
  hasPermission: LocationPermissionStatus;
  errorMessage?: string;
}

// Form validation types
export interface ValidationRule {
  validate: (locations: UserLocationInput[]) => boolean;
  errorMessage: string;
}

export interface FormValidationState {
  isValid: boolean;
  errors: string[];
  canStartOptimization: boolean;
}