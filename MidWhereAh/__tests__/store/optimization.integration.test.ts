/**
 * Integration test for Redux optimization workflow
 * Tests the complete user journey from location input to results
 */

import { configureStore } from '@reduxjs/toolkit';
import optimizationReducer, {
  startOptimizationThunk,
  updateProgress,
  clearOptimization,
  selectIsOptimizing,
  selectOptimizationProgress,
  selectOptimizationResult,
  selectOptimizationError
} from '../../src/store/optimization/optimizationSlice';
import { UserLocationInput } from '../../src/components/location/types';

// Create test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      optimization: optimizationReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['optimization/start/fulfilled'],
          ignoredActionsPaths: ['payload.completedAt', 'payload.equityAnalysis.calculatedAt'],
          ignoredPaths: ['optimization.result.completedAt', 'optimization.result.equityAnalysis.calculatedAt'],
        },
      }),
  });
};

// Mock user locations for Singapore
const mockUserLocations: UserLocationInput[] = [
  {
    id: 'user1',
    address: 'Marina Bay Sands, Singapore',
    coordinate: { latitude: 1.2834, longitude: 103.8607 },
    transportMode: 'TRANSIT',
  },
  {
    id: 'user2', 
    address: 'Sentosa Island, Singapore',
    coordinate: { latitude: 1.2494, longitude: 103.8303 },
    transportMode: 'DRIVING',
  },
  {
    id: 'user3',
    address: 'Orchard Road, Singapore', 
    coordinate: { latitude: 1.3048, longitude: 103.8318 },
    transportMode: 'WALKING',
  },
];

describe('Redux Optimization Integration', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().optimization;
      
      expect(state.isOptimizing).toBe(false);
      expect(state.progress).toBeNull();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
      expect(state.lastOptimizationId).toBeNull();
      expect(state.userLocations).toEqual([]);
    });
  });

  describe('Optimization Flow', () => {
    it('should handle complete optimization flow successfully', async () => {
      // Start optimization
      const optimizationPromise = store.dispatch(startOptimizationThunk(mockUserLocations));
      
      // Check initial pending state
      let state = store.getState().optimization;
      expect(selectIsOptimizing(store.getState())).toBe(true);
      expect(state.userLocations).toEqual(mockUserLocations);
      expect(state.error).toBeNull();
      expect(state.lastOptimizationId).toBeTruthy();
      
      // Check progress is initialized
      const progress = selectOptimizationProgress(store.getState());
      expect(progress).toBeTruthy();
      expect(progress?.stage).toBe('initializing');
      expect(progress?.progress).toBe(0);
      
      // Wait for optimization to complete
      const result = await optimizationPromise;
      
      // Check final state
      state = store.getState().optimization;
      expect(selectIsOptimizing(store.getState())).toBe(false);
      expect(selectOptimizationError(store.getState())).toBeNull();
      
      const optimizationResult = selectOptimizationResult(store.getState());
      expect(optimizationResult).toBeTruthy();
      expect(optimizationResult?.id).toBeTruthy();
      expect(optimizationResult?.optimalLocation).toBeTruthy();
      expect(optimizationResult?.equityAnalysis).toBeTruthy();
      expect(optimizationResult?.equityLevel).toBeTruthy();
      expect(optimizationResult?.participantTravelTimes).toHaveLength(3);
      expect(optimizationResult?.calculationTime).toBeGreaterThan(0);
      expect(optimizationResult?.confidence).toBeGreaterThan(0);
      expect(optimizationResult?.completedAt).toBeInstanceOf(Date);
      
      // Verify equity analysis
      expect(optimizationResult?.equityAnalysis.fairnessIndex).toBeGreaterThan(0);
      expect(optimizationResult?.equityAnalysis.fairnessIndex).toBeLessThanOrEqual(1);
      expect(optimizationResult?.equityAnalysis.meanTravelTime).toBeGreaterThan(0);
      expect(optimizationResult?.equityAnalysis.standardDeviation).toBeGreaterThanOrEqual(0);
      expect(optimizationResult?.equityAnalysis.sampleSize).toBe(3);
      
      // Verify travel times
      optimizationResult?.participantTravelTimes.forEach(participant => {
        expect(participant.id).toBeTruthy();
        expect(participant.travelTimeMinutes).toBeGreaterThan(0);
        expect(participant.userId).toBeTruthy();
      });
      
      // Check final progress
      const finalProgress = selectOptimizationProgress(store.getState());
      expect(finalProgress?.stage).toBe('complete');
      expect(finalProgress?.progress).toBe(100);
    }, 10000); // 10 second timeout for optimization
    
    it('should handle optimization errors gracefully', async () => {
      // Test with invalid locations (empty array)
      const optimizationPromise = store.dispatch(startOptimizationThunk([]));
      
      const result = await optimizationPromise;
      
      // Check error state
      const state = store.getState().optimization;
      expect(selectIsOptimizing(store.getState())).toBe(false);
      expect(selectOptimizationError(store.getState())).toBeTruthy();
      expect(selectOptimizationResult(store.getState())).toBeNull();
      
      const error = selectOptimizationError(store.getState());
      expect(error).toContain('At least 2 locations are required');
    });
    
    it('should update progress during optimization', async () => {
      const progressUpdates: any[] = [];
      
      // Subscribe to store updates to track progress
      const unsubscribe = store.subscribe(() => {
        const progress = selectOptimizationProgress(store.getState());
        if (progress) {
          progressUpdates.push({ ...progress });
        }
      });
      
      // Start optimization
      await store.dispatch(startOptimizationThunk(mockUserLocations));
      
      unsubscribe();
      
      // Check that we received multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(1);
      
      // Check that progress increased over time
      const progressValues = progressUpdates.map(p => p.progress);
      expect(progressValues[0]).toBe(0); // Initial progress
      expect(progressValues[progressValues.length - 1]).toBe(100); // Final progress
      
      // Check that we went through expected stages
      const stages = progressUpdates.map(p => p.stage);
      expect(stages).toContain('initializing');
      expect(stages).toContain('calculating');
      expect(stages).toContain('analyzing');
      expect(stages).toContain('complete');
    });
  });

  describe('Redux Actions', () => {
    it('should handle manual progress updates', () => {
      const testProgress = {
        stage: 'calculating' as const,
        progress: 50,
        message: 'Test progress update'
      };
      
      store.dispatch(updateProgress(testProgress));
      
      const progress = selectOptimizationProgress(store.getState());
      expect(progress).toEqual(testProgress);
    });
    
    it('should clear optimization state', async () => {
      // First run an optimization
      await store.dispatch(startOptimizationThunk(mockUserLocations));
      
      // Verify state has data
      let state = store.getState().optimization;
      expect(state.result).toBeTruthy();
      expect(state.userLocations).toHaveLength(3);
      
      // Clear optimization
      store.dispatch(clearOptimization());
      
      // Verify state is cleared
      state = store.getState().optimization;
      expect(state.isOptimizing).toBe(false);
      expect(state.progress).toBeNull();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
      expect(state.lastOptimizationId).toBeNull();
      expect(state.userLocations).toEqual([]);
    });
  });

  describe('Selectors', () => {
    it('should return correct values from selectors', async () => {
      // Before optimization
      expect(selectIsOptimizing(store.getState())).toBe(false);
      expect(selectOptimizationProgress(store.getState())).toBeNull();
      expect(selectOptimizationResult(store.getState())).toBeNull();
      expect(selectOptimizationError(store.getState())).toBeNull();
      
      // During optimization
      const optimizationPromise = store.dispatch(startOptimizationThunk(mockUserLocations));
      expect(selectIsOptimizing(store.getState())).toBe(true);
      expect(selectOptimizationProgress(store.getState())).toBeTruthy();
      
      // After optimization
      await optimizationPromise;
      expect(selectIsOptimizing(store.getState())).toBe(false);
      expect(selectOptimizationResult(store.getState())).toBeTruthy();
      expect(selectOptimizationError(store.getState())).toBeNull();
    });
  });

  describe('Performance Requirements', () => {
    it('should complete optimization within 2 seconds', async () => {
      const startTime = Date.now();
      
      await store.dispatch(startOptimizationThunk(mockUserLocations));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should meet the <2 second requirement
      expect(duration).toBeLessThan(2000);
      
      // Verify the calculation time is recorded
      const result = selectOptimizationResult(store.getState());
      expect(result?.calculationTime).toBeLessThan(2000);
    });
  });
});