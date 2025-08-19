/**
 * Transport-aware initialization algorithms
 * Replaces geometric centroid with Singapore MRT-network-aware calculation
 */

import type { Coordinate, UserLocation, MRTStation } from '@/types';

// Singapore MRT stations data (high-priority optimization candidates)
const MRT_MAJOR_INTERCHANGES: MRTStation[] = [
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
  },
  {
    id: 'tampines',
    name: 'Tampines',
    coordinate: { lat: 1.35454, lng: 103.94434 },
    lines: ['EW', 'DT'],
    isInterchange: true
  },
  {
    id: 'bugis',
    name: 'Bugis',
    coordinate: { lat: 1.30063, lng: 103.85582 },
    lines: ['EW', 'DT'],
    isInterchange: true
  }
];

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

async function findNearbyMRTStations(coordinate: Coordinate, walkingDistanceMeters: number): Promise<MRTStation[]> {
  // Filter MRT stations within walking distance
  return MRT_MAJOR_INTERCHANGES.filter((station: MRTStation) => {
    const distance = calculateHaversineDistance(coordinate, station.coordinate);
    return distance <= walkingDistanceMeters;
  });
}

function calculateHaversineDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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

function calculateWeightedCentroid(
  stations: MRTStation[], 
  users: UserLocation[]
): Coordinate {
  // Weighted centroid based on station accessibility and user preferences
  let totalWeightedLat = 0;
  let totalWeightedLng = 0;
  let totalWeight = 0;
  
  stations.forEach(station => {
    // Higher weight for interchange stations (better connectivity)
    const stationWeight = station.isInterchange ? 2.0 : 1.0;
    
    // User preference weight
    const userWeight = users.reduce((sum, user) => sum + (user.weight || 1.0), 0) / users.length;
    
    const combinedWeight = stationWeight * userWeight;
    
    totalWeightedLat += station.coordinate.lat * combinedWeight;
    totalWeightedLng += station.coordinate.lng * combinedWeight;
    totalWeight += combinedWeight;
  });
  
  return {
    lat: totalWeightedLat / totalWeight,
    lng: totalWeightedLng / totalWeight
  };
}

async function calculateIsochrone(
  coordinate: Coordinate, 
  timeMinutes: number, 
  transportMode: string
): Promise<{ area: number }> {
  // Simplified isochrone calculation
  // In production, this would use OneMap Singapore API
  const baseRadius = timeMinutes * 50; // meters per minute (rough estimate)
  
  // Adjust radius based on transport mode
  const modeMultiplier = {
    'TRANSIT': 1.5,  // MRT/bus covers more distance
    'WALKING': 0.8,  // Walking is slower
    'DRIVING': 2.0,  // Driving covers most distance
    'CYCLING': 1.2   // Cycling is faster than walking
  }[transportMode] || 1.0;
  
  const adjustedRadius = baseRadius * modeMultiplier;
  const area = Math.PI * adjustedRadius * adjustedRadius;
  
  return { area };
}
