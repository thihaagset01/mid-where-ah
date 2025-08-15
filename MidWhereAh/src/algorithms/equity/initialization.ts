/**
 * Transport-aware initialization algorithms
 * Replaces geometric centroid with Singapore MRT-network-aware calculation
 */

import type { Coordinate, UserLocation, MRTStation } from '@/types';

export async function calculateTransportAwareCenter(
  users: UserLocation[]
): Promise<Coordinate> {
  // Method 1: MRT network intersection (Singapore-specific)
  const transitUsers = users.filter(u => u.transportMode === 'TRANSIT');
  
  if (transitUsers.length >= 2) {
    const commonStations = await findCommonMRTStations(transitUsers);
    if (commonStations.length > 0) {
      return calculateWeightedCentroid(commonStations, transitUsers);
    }
  }
  
  // Method 2: Accessibility-weighted center
  const accessibilityWeights = await Promise.all(
    users.map(async (user) => {
      // Calculate 15-minute isochrone area for each user
      const isochrone = await calculateIsochrone(user.coordinate, 15, user.transportMode);
      return {
        user,
        weight: 1 / Math.log(isochrone.area + 1) // Less accessible = higher weight
      };
    })
  );
  
  return calculateWeightedGeographicCenter(accessibilityWeights);
}

async function findCommonMRTStations(users: UserLocation[]): Promise<MRTStation[]> {
  const userStations = await Promise.all(
    users.map(user => findNearbyMRTStations(user.coordinate, 800)) // 10-minute walk
  );
  
  // Find intersection of accessible stations
  if (userStations.length === 0) return [];
  
  return userStations.reduce((common, stations) => 
    common.filter(station => 
      stations.some(s => s.id === station.id)
    )
  );
}

function calculateWeightedGeographicCenter(
  weightedUsers: Array<{ user: UserLocation; weight: number }>
): Coordinate {
  let totalWeightedLat = 0;
  let totalWeightedLng = 0;
  let totalWeight = 0;
  
  for (const item of weightedUsers) {
    const adjustedWeight = item.weight * (item.user.weight || 1.0);
    totalWeightedLat += item.user.coordinate.lat * adjustedWeight;
    totalWeightedLng += item.user.coordinate.lng * adjustedWeight;
    totalWeight += adjustedWeight;
  }
  
  return {
    lat: totalWeightedLat / totalWeight,
    lng: totalWeightedLng / totalWeight
  };
}

// Singapore MRT stations data (high-priority optimization candidates)
export const MRT_MAJOR_INTERCHANGES: MRTStation[] = [
  {
    id: 'raffles-place',
    name: 'Raffles Place',
    coordinate: { lat: 1.28399, lng: 103.85153 },
    lines: ['EW', 'NS'],
    isInterchange: true
  },
  {
    id: 'city-hall',
    name: 'City Hall',
    coordinate: { lat: 1.29303, lng: 103.85235 },
    lines: ['EW', 'NS'],
    isInterchange: true
  },
  {
    id: 'dhoby-ghaut',
    name: 'Dhoby Ghaut',
    coordinate: { lat: 1.29866, lng: 103.84615 },
    lines: ['CC', 'NE', 'NS'],
    isInterchange: true
  },
  {
    id: 'orchard',
    name: 'Orchard',
    coordinate: { lat: 1.30408, lng: 103.83231 },
    lines: ['NS'],
    isInterchange: false
  },
  {
    id: 'jurong-east',
    name: 'Jurong East',
    coordinate: { lat: 1.33326, lng: 103.74205 },
    lines: ['EW', 'NS'],
    isInterchange: true
  },
  {
    id: 'bishan',
    name: 'Bishan',
    coordinate: { lat: 1.35114, lng: 103.84827 },
    lines: ['CC', 'NS'],
    isInterchange: true
  }
];