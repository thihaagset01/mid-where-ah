/**
 * useLocationValidation Hook Tests
 * Tests location validation logic, geocoding, and Singapore bounds checking
 */

import { renderHook, act } from '@testing-library/react-native';
import { useLocationValidation } from '../../../../src/components/location/hooks/useLocationValidation';
import { UserLocationInput } from '../../../../src/components/location/types';

describe('useLocationValidation Hook', () => {
  beforeEach(() => {
    // Clear any previous test state
    jest.clearAllMocks();
  });

  describe('validateLocation', () => {
    it('should return invalid for empty address', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('');
        expect(validation.isValid).toBe(false);
        expect(validation.errorMessage).toBe('Address cannot be empty');
      });
    });

    it('should return invalid for whitespace only address', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('   ');
        expect(validation.isValid).toBe(false);
        expect(validation.errorMessage).toBe('Address cannot be empty');
      });
    });

    it('should validate known Singapore addresses', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('Marina Bay Sands');
        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
        expect(validation.coordinate?.latitude).toBe(1.2834);
        expect(validation.coordinate?.longitude).toBe(103.8607);
      });
    });

    it('should validate MRT stations', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('Raffles Place');
        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
      });
    });

    it('should handle case insensitive addresses', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('ORCHARD ROAD');
        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
      });
    });

    it('should validate addresses with Singapore keywords', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('123 Somerset Road Singapore');
        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
        expect(validation.coordinate?.latitude).toBeGreaterThan(1.1496);
        expect(validation.coordinate?.latitude).toBeLessThan(1.4764);
      });
    });

    it('should reject non-Singapore addresses', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('Times Square New York');
        expect(validation.isValid).toBe(false);
        expect(validation.errorMessage).toContain('Singapore');
      });
    });

    it('should cache validation results', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      // First validation
      await act(async () => {
        const validation1 = await result.current.validateLocation('Marina Bay Sands');
        expect(validation1.isValid).toBe(true);
      });

      // Second validation of same address should be cached
      await act(async () => {
        const validation2 = await result.current.validateLocation('Marina Bay Sands');
        expect(validation2.isValid).toBe(true);
        expect(validation2.coordinate).toBeDefined();
      });
    });
  });

  describe('validateAllLocations', () => {
    it('should validate multiple locations', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      const locations: UserLocationInput[] = [
        {
          id: '1',
          address: 'Marina Bay Sands',
          transportMode: 'TRANSIT',
        },
        {
          id: '2',
          address: 'Orchard Road',
          transportMode: 'WALKING',
        },
      ];

      await act(async () => {
        const validatedLocations = await result.current.validateAllLocations(locations);
        
        expect(validatedLocations).toHaveLength(2);
        expect(validatedLocations[0].isValid).toBe(true);
        expect(validatedLocations[1].isValid).toBe(true);
        expect(validatedLocations[0].coordinate).toBeDefined();
        expect(validatedLocations[1].coordinate).toBeDefined();
      });
    });

    it('should handle mix of valid and invalid locations', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      const locations: UserLocationInput[] = [
        {
          id: '1',
          address: 'Marina Bay Sands',
          transportMode: 'TRANSIT',
        },
        {
          id: '2',
          address: '',
          transportMode: 'WALKING',
        },
        {
          id: '3',
          address: 'Times Square New York',
          transportMode: 'DRIVING',
        },
      ];

      await act(async () => {
        const validatedLocations = await result.current.validateAllLocations(locations);
        
        expect(validatedLocations).toHaveLength(3);
        expect(validatedLocations[0].isValid).toBe(true);
        expect(validatedLocations[1].isValid).toBe(false);
        expect(validatedLocations[2].isValid).toBe(false);
        
        expect(validatedLocations[1].errorMessage).toBe('Address cannot be empty');
        expect(validatedLocations[2].errorMessage).toContain('Singapore');
      });
    });

    it('should preserve original location properties', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      const locations: UserLocationInput[] = [
        {
          id: 'test-id',
          address: 'Marina Bay Sands',
          transportMode: 'TRANSIT',
          isCurrentLocation: false,
        },
      ];

      await act(async () => {
        const validatedLocations = await result.current.validateAllLocations(locations);
        
        expect(validatedLocations[0].id).toBe('test-id');
        expect(validatedLocations[0].transportMode).toBe('TRANSIT');
        expect(validatedLocations[0].isCurrentLocation).toBe(false);
      });
    });
  });

  describe('isValidating state', () => {
    it('should track validation state', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      expect(result.current.isValidating).toBe(false);
      
      // Start validation
      let validationPromise: Promise<any>;
      await act(async () => {
        validationPromise = result.current.validateLocation('Marina Bay Sands');
        // Note: We can't easily test the loading state in this simplified test
        // In a real app, you'd use more sophisticated testing with delayed responses
      });
      
      await act(async () => {
        await validationPromise;
      });
      
      expect(result.current.isValidating).toBe(false);
    });
  });

  describe('Singapore bounds validation', () => {
    it('should accept coordinates within Singapore bounds', async () => {
      const { result } = renderHook(() => useLocationValidation());
      
      await act(async () => {
        const validation = await result.current.validateLocation('Marina Bay Sands');
        expect(validation.isValid).toBe(true);
        expect(validation.coordinate).toBeDefined();
        
        if (validation.coordinate) {
          expect(validation.coordinate.latitude).toBeGreaterThan(1.1496);
          expect(validation.coordinate.latitude).toBeLessThan(1.4764);
          expect(validation.coordinate.longitude).toBeGreaterThan(103.6057);
          expect(validation.coordinate.longitude).toBeLessThan(104.0270);
        }
      });
    });
  });
});