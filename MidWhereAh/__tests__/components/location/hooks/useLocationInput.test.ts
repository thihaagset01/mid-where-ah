/**
 * useLocationInput Hook Tests
 * Tests the main location input state management and business logic
 */

import { renderHook, act } from '@testing-library/react-native';
import { useLocationInput } from '../../../../src/components/location/hooks/useLocationInput';
import { UserLocationInput } from '../../../../src/components/location/types';

// Mock the validation and current location hooks
jest.mock('../../../../src/components/location/hooks/useLocationValidation', () => ({
  useLocationValidation: () => ({
    validateAllLocations: jest.fn().mockResolvedValue([]),
    isValidating: false,
  }),
}));

jest.mock('../../../../src/components/location/hooks/useCurrentLocation', () => ({
  useCurrentLocation: () => ({
    getCurrentLocation: jest.fn().mockResolvedValue({
      latitude: 1.3521,
      longitude: 103.8198,
    }),
    currentLocationState: {
      isLoading: false,
      hasPermission: 'granted',
    },
  }),
}));

describe('useLocationInput Hook', () => {
  const mockOnLocationsChange = jest.fn();
  const mockOnStartOptimization = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onLocationsChange: mockOnLocationsChange,
    onStartOptimization: mockOnStartOptimization,
    maxLocations: 10,
    minLocations: 2,
  };

  describe('Initial State', () => {
    it('should initialize with 2 empty locations', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      expect(result.current.locations).toHaveLength(2);
      expect(result.current.locations[0].address).toBe('');
      expect(result.current.locations[0].transportMode).toBe('TRANSIT');
      expect(result.current.locations[1].address).toBe('');
      expect(result.current.locations[1].transportMode).toBe('TRANSIT');
    });

    it('should have unique IDs for initial locations', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      const ids = result.current.locations.map(loc => loc.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should call onLocationsChange on mount', () => {
      renderHook(() => useLocationInput(defaultProps));
      
      expect(mockOnLocationsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ address: '', transportMode: 'TRANSIT' }),
          expect.objectContaining({ address: '', transportMode: 'TRANSIT' }),
        ])
      );
    });
  });

  describe('Location Management', () => {
    it('should add new location when addLocation is called', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      act(() => {
        result.current.addLocation();
      });
      
      expect(result.current.locations).toHaveLength(3);
      expect(result.current.locations[2].address).toBe('');
      expect(result.current.locations[2].transportMode).toBe('TRANSIT');
    });

    it('should not add location beyond maxLocations', () => {
      const props = { ...defaultProps, maxLocations: 3 };
      const { result } = renderHook(() => useLocationInput(props));
      
      // Add one more to reach max
      act(() => {
        result.current.addLocation();
      });
      
      expect(result.current.locations).toHaveLength(3);
      
      // Try to add beyond max
      act(() => {
        result.current.addLocation();
      });
      
      expect(result.current.locations).toHaveLength(3);
    });

    it('should remove location when removeLocation is called', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      const locationId = result.current.locations[0].id;
      
      // Add a third location first
      act(() => {
        result.current.addLocation();
      });
      
      expect(result.current.locations).toHaveLength(3);
      
      // Remove the first location
      act(() => {
        result.current.removeLocation(locationId);
      });
      
      expect(result.current.locations).toHaveLength(2);
      expect(result.current.locations.find(loc => loc.id === locationId)).toBeUndefined();
    });

    it('should not remove location below minLocations', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      const locationId = result.current.locations[0].id;
      
      expect(result.current.locations).toHaveLength(2);
      
      // Try to remove when at minimum
      act(() => {
        result.current.removeLocation(locationId);
      });
      
      expect(result.current.locations).toHaveLength(2);
    });
  });

  describe('Location Updates', () => {
    it('should update location address', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      const locationId = result.current.locations[0].id;
      const newAddress = 'Marina Bay Sands';
      
      act(() => {
        result.current.updateLocationAddress(locationId, newAddress);
      });
      
      const updatedLocation = result.current.locations.find(loc => loc.id === locationId);
      expect(updatedLocation?.address).toBe(newAddress);
    });

    it('should update transport mode', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      const locationId = result.current.locations[0].id;
      
      act(() => {
        result.current.updateLocationTransportMode(locationId, 'DRIVING');
      });
      
      const updatedLocation = result.current.locations.find(loc => loc.id === locationId);
      expect(updatedLocation?.transportMode).toBe('DRIVING');
    });

    it('should reset validation state when address is updated', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      const locationId = result.current.locations[0].id;
      
      act(() => {
        result.current.updateLocationAddress(locationId, 'New Address');
      });
      
      const updatedLocation = result.current.locations.find(loc => loc.id === locationId);
      expect(updatedLocation?.isValid).toBeUndefined();
      expect(updatedLocation?.errorMessage).toBeUndefined();
      expect(updatedLocation?.coordinate).toBeUndefined();
    });
  });

  describe('Form Validation', () => {
    it('should validate minimum locations requirement', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      // Initially should be valid (has 2 locations)
      expect(result.current.formValidation.errors).not.toContain('At least 2 locations are required');
      
      // Add a third location and remove two to go below minimum
      act(() => {
        result.current.addLocation();
      });
      
      // Remove one location (should still be valid)
      act(() => {
        result.current.removeLocation(result.current.locations[0].id);
      });
      
      expect(result.current.locations).toHaveLength(2);
      expect(result.current.formValidation.errors).not.toContain('At least 2 locations are required');
    });

    it('should validate addresses are not empty', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      // Initially should have error for empty addresses
      expect(result.current.formValidation.errors).toContain('All locations must have valid addresses');
      
      // Add addresses
      act(() => {
        result.current.updateLocationAddress(result.current.locations[0].id, 'Marina Bay Sands');
        result.current.updateLocationAddress(result.current.locations[1].id, 'Orchard Road');
      });
      
      // Should no longer have empty address error
      expect(result.current.formValidation.errors).not.toContain('All locations must have valid addresses');
    });

    it('should validate no duplicate addresses', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      // Add same address to both locations
      act(() => {
        result.current.updateLocationAddress(result.current.locations[0].id, 'Marina Bay Sands');
        result.current.updateLocationAddress(result.current.locations[1].id, 'Marina Bay Sands');
      });
      
      expect(result.current.formValidation.errors).toContain('Duplicate locations are not allowed');
    });
  });

  describe('Capability Flags', () => {
    it('should correctly indicate when more locations can be added', () => {
      const props = { ...defaultProps, maxLocations: 3 };
      const { result } = renderHook(() => useLocationInput(props));
      
      expect(result.current.canAddMoreLocations).toBe(true);
      
      // Add one more location
      act(() => {
        result.current.addLocation();
      });
      
      expect(result.current.canAddMoreLocations).toBe(false);
    });

    it('should correctly indicate when locations can be removed', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      expect(result.current.canRemoveLocations).toBe(false); // At minimum
      
      // Add one more location
      act(() => {
        result.current.addLocation();
      });
      
      expect(result.current.canRemoveLocations).toBe(true);
    });
  });

  describe('Current Location', () => {
    it('should add current location when addCurrentLocation is called', async () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      await act(async () => {
        await result.current.addCurrentLocation();
      });
      
      expect(result.current.locations).toHaveLength(3);
      const currentLocation = result.current.locations.find(loc => loc.isCurrentLocation);
      expect(currentLocation).toBeDefined();
      expect(currentLocation?.address).toBe('Current Location');
      expect(currentLocation?.transportMode).toBe('WALKING');
    });
  });

  describe('Start Optimization', () => {
    it('should call onStartOptimization when valid', () => {
      const { result } = renderHook(() => useLocationInput(defaultProps));
      
      // Set up valid state
      act(() => {
        result.current.updateLocationAddress(result.current.locations[0].id, 'Marina Bay Sands');
        result.current.updateLocationAddress(result.current.locations[1].id, 'Orchard Road');
      });
      
      // Mock validation as valid
      result.current.formValidation.canStartOptimization = true;
      
      act(() => {
        result.current.startOptimization();
      });
      
      expect(mockOnStartOptimization).toHaveBeenCalledWith(result.current.locations);
    });
  });
});