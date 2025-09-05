/**
 * Redux slice for optimization state management in MidWhereAh.
 * 
 * Manages real-time progress tracking, optimization results, and error handling
 * for the transport equity optimization workflow.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { UserLocationInput } from '../../components/location/types';
import { 
  startOptimization, 
  OptimizationProgress, 
  OptimizationResult 
} from '../../services/optimization';

/**
 * Optimization state interface
 */
export interface OptimizationState {
  /** Whether optimization is currently running */
  isOptimizing: boolean;
  /** Current optimization progress, null when not optimizing */
  progress: OptimizationProgress | null;
  /** Latest optimization result, null when no optimization completed */
  result: OptimizationResult | null;
  /** Error message if optimization failed, null when no error */
  error: string | null;
  /** Unique ID of the last optimization request */
  lastOptimizationId: string | null;
  /** User locations that were optimized */
  userLocations: UserLocationInput[];
}

/**
 * Initial state
 */
const initialState: OptimizationState = {
  isOptimizing: false,
  progress: null,
  result: null,
  error: null,
  lastOptimizationId: null,
  userLocations: [],
};

/**
 * Async thunk for starting optimization with real-time progress updates
 */
export const startOptimizationThunk = createAsyncThunk<
  OptimizationResult,
  UserLocationInput[],
  { rejectValue: string }
>(
  'optimization/start',
  async (locations: UserLocationInput[], { dispatch, rejectWithValue }) => {
    try {
      // Set up progress callback to dispatch updates
      const onProgress = (progress: OptimizationProgress) => {
        dispatch(updateProgress(progress));
      };
      
      // Start optimization with progress tracking
      const result = await startOptimization(locations, onProgress);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Optimization failed';
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Optimization slice
 */
export const optimizationSlice = createSlice({
  name: 'optimization',
  initialState,
  reducers: {
    /**
     * Update optimization progress
     */
    updateProgress: (state, action: PayloadAction<OptimizationProgress>) => {
      state.progress = action.payload;
    },
    
    /**
     * Clear optimization results and reset state
     */
    clearOptimization: (state) => {
      state.isOptimizing = false;
      state.progress = null;
      state.result = null;
      state.error = null;
      state.lastOptimizationId = null;
      state.userLocations = [];
    },
    
    /**
     * Clear error message
     */
    clearError: (state) => {
      state.error = null;
    },
    
    /**
     * Set user locations for optimization
     */
    setUserLocations: (state, action: PayloadAction<UserLocationInput[]>) => {
      state.userLocations = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle startOptimizationThunk pending
      .addCase(startOptimizationThunk.pending, (state, action) => {
        state.isOptimizing = true;
        state.progress = {
          stage: 'initializing',
          progress: 0,
          message: 'Starting optimization...'
        };
        state.result = null;
        state.error = null;
        state.lastOptimizationId = `opt_${Date.now()}`;
        state.userLocations = action.meta.arg;
      })
      
      // Handle startOptimizationThunk fulfilled
      .addCase(startOptimizationThunk.fulfilled, (state, action) => {
        state.isOptimizing = false;
        state.result = action.payload;
        state.progress = {
          stage: 'complete',
          progress: 100,
          message: 'Optimization completed successfully!'
        };
        state.error = null;
      })
      
      // Handle startOptimizationThunk rejected
      .addCase(startOptimizationThunk.rejected, (state, action) => {
        state.isOptimizing = false;
        state.progress = null;
        state.result = null;
        state.error = action.payload || 'Unknown optimization error';
      });
  },
});

// Export actions
export const { updateProgress, clearOptimization, clearError, setUserLocations } = optimizationSlice.actions;

// Export reducer
export default optimizationSlice.reducer;

// Selectors for easier state access
export const selectOptimizationState = (state: { optimization: OptimizationState }) => state.optimization;
export const selectIsOptimizing = (state: { optimization: OptimizationState }) => state.optimization.isOptimizing;
export const selectOptimizationProgress = (state: { optimization: OptimizationState }) => state.optimization.progress;
export const selectOptimizationResult = (state: { optimization: OptimizationState }) => state.optimization.result;
export const selectOptimizationError = (state: { optimization: OptimizationState }) => state.optimization.error;
export const selectUserLocations = (state: { optimization: OptimizationState }) => state.optimization.userLocations;