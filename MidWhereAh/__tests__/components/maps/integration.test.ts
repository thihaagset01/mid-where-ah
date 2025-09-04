/**
 * Simple MapView Integration Test
 * Basic validation of algorithm integration without complex testing
 */

import { 
  calculateTransportAwareCenter,
  type UserLocation as AlgorithmUserLocation 
} from '../../../src/algorithms/initialization/transportAware';
import { calculateJainsIndex } from '../../../src/algorithms/equity/jainsIndex';
import { 
  UserLocation
} from '../../../src/components/maps/types';

describe('MapView Integration Basic Test', () => {
  const singaporeUsers: UserLocation[] = [
    {
      id: 'user1',
      coordinate: { latitude: 1.3521, longitude: 103.8198 }, // CBD
      transportMode: 'TRANSIT',
      name: 'Alex (CBD)',
      travelTime: 15,
    },
    {
      id: 'user2',
      coordinate: { latitude: 1.3048, longitude: 103.8318 }, // Chinatown
      transportMode: 'WALKING', 
      name: 'Sarah (Chinatown)',
      travelTime: 25,
    },
    {
      id: 'user3',
      coordinate: { latitude: 1.2966, longitude: 103.8764 }, // Marina Bay
      transportMode: 'CYCLING',
      name: 'Lisa (Marina Bay)',
      travelTime: 20,
    },
  ];

  it('should convert MapView users to algorithm format correctly', () => {
    const algorithmUsers: AlgorithmUserLocation[] = singaporeUsers.map(user => ({
      id: user.id,
      lat: user.coordinate.latitude,
      lng: user.coordinate.longitude,
      mode: user.transportMode,
      weight: 1.0,
    }));

    expect(algorithmUsers).toHaveLength(3);
    expect(algorithmUsers[0].id).toBe('user1');
    expect(algorithmUsers[0].lat).toBe(1.3521);
    expect(algorithmUsers[0].lng).toBe(103.8198);
    expect(algorithmUsers[0].mode).toBe('TRANSIT');
    expect(algorithmUsers[0].weight).toBe(1.0);
  });

  it('should run transport-aware algorithm with Singapore users', () => {
    const algorithmUsers: AlgorithmUserLocation[] = singaporeUsers.map(user => ({
      id: user.id,
      lat: user.coordinate.latitude,
      lng: user.coordinate.longitude,
      mode: user.transportMode,
      weight: 1.0,
    }));

    const result = calculateTransportAwareCenter(algorithmUsers);

    expect(result.center).toBeDefined();
    expect(result.method).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    
    // Result should be within Singapore bounds
    expect(result.center.lat).toBeGreaterThan(1.1);
    expect(result.center.lat).toBeLessThan(1.5);
    expect(result.center.lng).toBeGreaterThan(103.6);
    expect(result.center.lng).toBeLessThan(104.1);
  });

  it('should calculate Jains index for equity assessment', () => {
    const travelTimes = singaporeUsers.map(u => u.travelTime || 30);
    const jainsIndex = calculateJainsIndex(travelTimes);

    expect(jainsIndex).toBeGreaterThan(0);
    expect(jainsIndex).toBeLessThanOrEqual(1);
    expect(typeof jainsIndex).toBe('number');
    expect(isFinite(jainsIndex)).toBe(true);
  });

  it('should handle different transport modes', () => {
    const mixedUsers: AlgorithmUserLocation[] = [
      { id: 'driving', lat: 1.3644, lng: 103.9915, mode: 'DRIVING', weight: 1.0 },
      { id: 'transit', lat: 1.3521, lng: 103.8198, mode: 'TRANSIT', weight: 1.0 },
      { id: 'walking', lat: 1.3048, lng: 103.8318, mode: 'WALKING', weight: 1.0 },
      { id: 'cycling', lat: 1.2966, lng: 103.8764, mode: 'CYCLING', weight: 1.0 },
    ];

    const result = calculateTransportAwareCenter(mixedUsers);

    expect(result.center).toBeDefined();
    expect(result.method).toBeDefined();
    expect(['mrt_intersection', 'accessibility_weighted', 'enhanced_geometric']).toContain(result.method);
  });

  it('should work with large groups efficiently', () => {
    const startTime = performance.now();
    
    // Generate 20 users within Singapore bounds
    const manyUsers: AlgorithmUserLocation[] = Array.from({ length: 20 }, (_, i) => ({
      id: `user${i}`,
      lat: 1.2 + Math.random() * 0.3, // 1.2 to 1.5
      lng: 103.6 + Math.random() * 0.4, // 103.6 to 104.0
      mode: ['DRIVING', 'TRANSIT', 'WALKING', 'CYCLING'][i % 4] as any,
      weight: 1.0,
    }));

    const result = calculateTransportAwareCenter(manyUsers);
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(result.center).toBeDefined();
    expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    
    // Center should be within Singapore
    expect(result.center.lat).toBeGreaterThan(1.1);
    expect(result.center.lat).toBeLessThan(1.5);
    expect(result.center.lng).toBeGreaterThan(103.6);
    expect(result.center.lng).toBeLessThan(104.1);
  });
});