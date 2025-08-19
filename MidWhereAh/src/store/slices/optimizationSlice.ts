/**
 * Optimization state slice
 * Manages equity optimization process and results
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { UserLocation, EquityMetrics } from '../../types';
import { calculateTransportAwareCenter } from '../../algorithms/equity/initialization';
import { calculateEquityMetrics } from '../../algorithms/equity/scoring';

interface OptimizationState {
  isOptimizing: boolean;
  progress: number;
  users: UserLocation[];
  currentCenter: { lat: number; lng: number } | null;
  equityMetrics: EquityMetrics | null;
  candidates: Array<{
    coordinate: { lat: number; lng: number };
    equityScore: number;
    travelTimes: number[];
  }>;
  selectedCandidate: number | null;
  error: string | null;
}

const initialState: OptimizationState = {
  isOptimizing: false,
  progress: 0,
  users: [],
  currentCenter: null,
  equityMetrics: null,
  candidates: [],
  selectedCandidate: null,
  error: null,
};

// Async thunks
export const optimizeLocation = createAsyncThunk(
  'optimization/optimizeLocation',
  async (users: UserLocation[], { dispatch }) => {
    dispatch(setProgress(10));
    
    // Step 1: Transport-aware initialization
    const center = await calculateTransportAwareCenter(users);
    dispatch(setProgress(30));
    
    // Step 2: Generate candidates around center
    const candidates = await generateOptimizationCandidates(center, users);
    dispatch(setProgress(60));
    
    // Step 3: Calculate equity metrics for each candidate
    const evaluatedCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const travelTimes = await calculateTravelTimesToCandidate(candidate, users);
        const metrics = calculateEquityMetrics(
          travelTimes,
          users.map(u => u.transportMode)
        );
        
        return {
          coordinate: candidate,
          equityScore: metrics.equityScore,
          travelTimes,
          metrics
        };
      })
    );
    
    dispatch(setProgress(90));
    
    // Step 4: Sort by equity score (lower = better)
    evaluatedCandidates.sort((a, b) => a.equityScore - b.equityScore);
    
    dispatch(setProgress(100));
    
    return {
      center,
      candidates: evaluatedCandidates,
      bestCandidate: evaluatedCandidates[0]
    };
  }
);

// Helper functions (would be moved to services in production)
async function generateOptimizationCandidates(
  center: { lat: number; lng: number },
  users: UserLocation[]
): Promise<Array<{ lat: number; lng: number }>> {
  // Generate grid of candidates around center
  const candidates: Array<{ lat: number; lng: number }> = [];
  const radius = 0.01; // ~1km radius
  const steps = 5;
  
  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      candidates.push({
        lat: center.lat + (i * radius / steps),
        lng: center.lng + (j * radius / steps)
      });
    }
  }
  
  return candidates;
}

async function calculateTravelTimesToCandidate(
  candidate: { lat: number; lng: number },
  users: UserLocation[]
): Promise<number[]> {
  // Simplified travel time calculation
  // In production, would use OneMap Singapore API
  return users.map(user => {
    const distance = calculateDistance(user.coordinate, candidate);
    const speed = user.transportMode === 'TRANSIT' ? 400 : 80; // m/min
    return Math.round(distance / speed);
  });
}

function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const optimizationSlice = createSlice({
  name: 'optimization',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<UserLocation[]>) => {
      state.users = action.payload;
    },
    addUser: (state, action: PayloadAction<UserLocation>) => {
      state.users.push(action.payload);
    },
    removeUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
    },
    updateUser: (state, action: PayloadAction<UserLocation>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    selectCandidate: (state, action: PayloadAction<number>) => {
      state.selectedCandidate = action.payload;
    },
    clearOptimization: (state) => {
      state.isOptimizing = false;
      state.progress = 0;
      state.currentCenter = null;
      state.equityMetrics = null;
      state.candidates = [];
      state.selectedCandidate = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(optimizeLocation.pending, (state) => {
        state.isOptimizing = true;
        state.progress = 0;
        state.error = null;
      })
      .addCase(optimizeLocation.fulfilled, (state, action) => {
        state.isOptimizing = false;
        state.progress = 100;
        state.currentCenter = action.payload.center;
        state.candidates = action.payload.candidates;
        state.selectedCandidate = 0; // Select best candidate
        state.equityMetrics = action.payload.bestCandidate?.metrics || null;
      })
      .addCase(optimizeLocation.rejected, (state, action) => {
        state.isOptimizing = false;
        state.progress = 0;
        state.error = action.error.message || 'Optimization failed';
      });
  },
});

export const {
  setUsers,
  addUser,
  removeUser,
  updateUser,
  setProgress,
  selectCandidate,
  clearOptimization,
} = optimizationSlice.actions;

export default optimizationSlice.reducer;