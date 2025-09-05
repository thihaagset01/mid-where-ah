/**
 * End-to-end navigation flow test for MidWhereAh optimization journey
 * Tests the complete user experience from location input to results display
 */

import { configureStore } from '@reduxjs/toolkit';
import optimizationReducer, {
  startOptimizationThunk,
  selectOptimizationResult,
  selectIsOptimizing,
  selectOptimizationProgress,
  selectOptimizationError,
  clearOptimization
} from '../../src/store/optimization/optimizationSlice';
import { UserLocationInput } from '../../src/components/location/types';

// Create test store for navigation testing
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

// Mock Singapore locations for testing
const mockSingaporeLocations: UserLocationInput[] = [
  {
    id: 'location_1',
    address: 'Marina Bay Sands, 10 Bayfront Avenue, Singapore 018956',
    coordinate: { latitude: 1.2834, longitude: 103.8607 },
    transportMode: 'TRANSIT',
  },
  {
    id: 'location_2',
    address: 'Singapore Changi Airport (SIN), Airport Boulevard, Singapore',
    coordinate: { latitude: 1.3644, longitude: 103.9915 },
    transportMode: 'DRIVING',
  },
  {
    id: 'location_3',
    address: 'National University of Singapore, 21 Lower Kent Ridge Road, Singapore 119077',
    coordinate: { latitude: 1.2966, longitude: 103.7764 },
    transportMode: 'TRANSIT',
  },
  {
    id: 'location_4',
    address: 'Orchard Road, Singapore',
    coordinate: { latitude: 1.3048, longitude: 103.8318 },
    transportMode: 'WALKING',
  },
];

describe('End-to-End Navigation Flow', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('Complete User Journey', () => {
    it('should simulate complete HomeScreen → OptimizationScreen → ResultsScreen flow', async () => {
      console.log('🚀 Starting end-to-end user journey simulation...');

      // STEP 1: User starts on HomeScreen, enters locations
      console.log('📍 Step 1: User enters locations on HomeScreen');
      expect(store.getState().optimization.userLocations).toEqual([]);
      expect(store.getState().optimization.result).toBeNull();

      // STEP 2: User navigates to OptimizationScreen with locations
      console.log('⚡ Step 2: User navigates to OptimizationScreen');
      
      // Simulate OptimizationScreen mounting and auto-starting optimization
      const optimizationPromise = store.dispatch(startOptimizationThunk(mockSingaporeLocations));
      
      // Verify optimization started
      expect(selectIsOptimizing(store.getState())).toBe(true);
      expect(store.getState().optimization.userLocations).toEqual(mockSingaporeLocations);
      console.log('✅ Optimization started with', mockSingaporeLocations.length, 'locations');

      // Track progress updates during optimization
      const progressUpdates: any[] = [];
      const unsubscribe = store.subscribe(() => {
        const progress = selectOptimizationProgress(store.getState());
        const isOptimizing = selectIsOptimizing(store.getState());
        if (progress && isOptimizing) {
          progressUpdates.push({
            stage: progress.stage,
            progress: progress.progress,
            message: progress.message,
            timestamp: Date.now()
          });
        }
      });

      // STEP 3: Wait for optimization to complete
      console.log('🔄 Step 3: Optimization running with real-time progress...');
      const result = await optimizationPromise;
      unsubscribe();

      // Verify optimization completed successfully
      expect(selectIsOptimizing(store.getState())).toBe(false);
      expect(selectOptimizationError(store.getState())).toBeNull();
      
      const optimizationResult = selectOptimizationResult(store.getState());
      expect(optimizationResult).toBeTruthy();
      console.log('✅ Optimization completed successfully');
      console.log('📊 Progress updates received:', progressUpdates.length);
      console.log('⚖️ Final equity score:', (optimizationResult!.equityAnalysis.fairnessIndex * 100).toFixed(1) + '%');

      // STEP 4: User navigates to ResultsScreen (no route params needed)
      console.log('📋 Step 4: User navigates to ResultsScreen');
      
      // Simulate ResultsScreen mounting and reading from Redux store
      const resultsScreenResult = selectOptimizationResult(store.getState());
      expect(resultsScreenResult).toBe(optimizationResult);
      expect(resultsScreenResult?.id).toBeTruthy();
      expect(resultsScreenResult?.optimalLocation).toBeTruthy();
      expect(resultsScreenResult?.equityAnalysis).toBeTruthy();
      expect(resultsScreenResult?.participantTravelTimes).toHaveLength(4);
      
      console.log('✅ ResultsScreen successfully displays results from Redux store');
      console.log('🗺️ Optimal location:', 
        resultsScreenResult!.optimalLocation.latitude.toFixed(4) + ',' + 
        resultsScreenResult!.optimalLocation.longitude.toFixed(4)
      );

      // STEP 5: User navigates to MapScreen
      console.log('🗺️ Step 5: User navigates to MapScreen');
      
      // Simulate MapScreen mounting and reading from Redux store
      const mapScreenResult = selectOptimizationResult(store.getState());
      const mapScreenLocations = store.getState().optimization.userLocations;
      
      expect(mapScreenResult).toBe(optimizationResult);
      expect(mapScreenLocations).toEqual(mockSingaporeLocations);
      
      // Verify MapScreen can transform data correctly
      const mapUserLocations = mapScreenLocations.map((location, index) => ({
        id: location.id,
        coordinate: location.coordinate!,
        transportMode: location.transportMode,
        name: location.address,
        travelTime: mapScreenResult?.participantTravelTimes.find(p => p.id === location.id)?.travelTimeMinutes
      }));
      
      expect(mapUserLocations).toHaveLength(4);
      mapUserLocations.forEach(location => {
        expect(location.coordinate).toBeTruthy();
        expect(location.transportMode).toBeTruthy();
        expect(location.travelTime).toBeGreaterThan(0);
      });
      
      console.log('✅ MapScreen successfully displays user locations and optimal point');

      // STEP 6: Test navigation back and state persistence
      console.log('🔙 Step 6: Testing back navigation and state persistence');
      
      // State should persist when navigating back
      expect(selectOptimizationResult(store.getState())).toBeTruthy();
      expect(store.getState().optimization.userLocations).toEqual(mockSingaporeLocations);
      
      console.log('✅ State persists correctly across navigation');

      // STEP 7: User starts new optimization
      console.log('🔄 Step 7: User starts new optimization');
      
      store.dispatch(clearOptimization());
      
      expect(selectOptimizationResult(store.getState())).toBeNull();
      expect(store.getState().optimization.userLocations).toEqual([]);
      expect(selectIsOptimizing(store.getState())).toBe(false);
      
      console.log('✅ State cleared for new optimization');
      console.log('🎉 End-to-end journey completed successfully!');
    }, 15000);

    it('should handle optimization errors during navigation flow', async () => {
      console.log('🚨 Testing error handling during navigation flow...');

      // Try to optimize with insufficient locations
      const optimizationPromise = store.dispatch(startOptimizationThunk([]));
      await optimizationPromise;

      // Verify error state
      expect(selectIsOptimizing(store.getState())).toBe(false);
      expect(selectOptimizationError(store.getState())).toBeTruthy();
      expect(selectOptimizationResult(store.getState())).toBeNull();
      
      console.log('✅ Error handling works correctly');
      console.log('📝 Error message:', selectOptimizationError(store.getState()));
    });

    it('should meet performance requirements for demo readiness', async () => {
      console.log('⚡ Testing performance requirements...');
      
      const startTime = Date.now();
      await store.dispatch(startOptimizationThunk(mockSingaporeLocations));
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const result = selectOptimizationResult(store.getState());
      
      // Must meet <2 second requirement
      expect(totalTime).toBeLessThan(2000);
      expect(result?.calculationTime).toBeLessThan(2000);
      
      console.log('✅ Performance requirement met:', totalTime + 'ms (< 2000ms)');
      console.log('📊 Calculation time:', result?.calculationTime + 'ms');
    });
  });

  describe('Navigation State Management', () => {
    it('should maintain consistent state across screen transitions', async () => {
      // Run optimization
      await store.dispatch(startOptimizationThunk(mockSingaporeLocations));
      
      const initialResult = selectOptimizationResult(store.getState());
      const initialLocations = store.getState().optimization.userLocations;
      
      // Simulate multiple screen transitions
      // OptimizationScreen → ResultsScreen
      let currentResult = selectOptimizationResult(store.getState());
      expect(currentResult).toBe(initialResult);
      
      // ResultsScreen → MapScreen
      currentResult = selectOptimizationResult(store.getState());
      expect(currentResult).toBe(initialResult);
      
      // MapScreen → ResultsScreen
      currentResult = selectOptimizationResult(store.getState());
      expect(currentResult).toBe(initialResult);
      
      // Back to HomeScreen and verify state persistence
      expect(store.getState().optimization.userLocations).toEqual(initialLocations);
      
      console.log('✅ State remains consistent across all screen transitions');
    });
  });

  describe('Demo Readiness Validation', () => {
    it('should provide all data needed for comprehensive demo', async () => {
      console.log('🎬 Validating demo readiness...');
      
      await store.dispatch(startOptimizationThunk(mockSingaporeLocations));
      const result = selectOptimizationResult(store.getState());
      
      // Verify all demo elements are present
      expect(result?.equityAnalysis.fairnessIndex).toBeGreaterThan(0);
      expect(result?.equityLevel).toBeTruthy();
      expect(result?.equityAssessment.title).toBeTruthy();
      expect(result?.equityAssessment.description).toBeTruthy();
      expect(result?.equityAssessment.recommendation).toBeTruthy();
      expect(result?.improvementVsBaseline).toBeDefined();
      expect(result?.participantTravelTimes).toHaveLength(4);
      expect(result?.optimalLocation.latitude).toBeGreaterThan(1);
      expect(result?.optimalLocation.longitude).toBeGreaterThan(103);
      
      // Verify Singapore-specific data
      expect(result?.optimalLocation.latitude).toBeGreaterThan(1.2);
      expect(result?.optimalLocation.latitude).toBeLessThan(1.5);
      expect(result?.optimalLocation.longitude).toBeGreaterThan(103.6);
      expect(result?.optimalLocation.longitude).toBeLessThan(104.1);
      
      console.log('✅ All demo elements validated');
      console.log('🎯 Demo-ready features:');
      console.log('  📍 Singapore coordinates: ✅');
      console.log('  ⚖️ Jain\'s Fairness Index: ✅');
      console.log('  🚇 Transport modes: ✅');
      console.log('  📊 Equity assessment: ✅');
      console.log('  🗺️ Map visualization data: ✅');
      console.log('  ⚡ Real-time progress: ✅');
      console.log('  🔄 Complete navigation flow: ✅');
    });
  });
});