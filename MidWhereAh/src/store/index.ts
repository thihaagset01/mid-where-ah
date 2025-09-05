/**
 * Redux store configuration for MidWhereAh transport equity optimization.
 * 
 * Centralizes optimization state management for real-time progress tracking,
 * results storage, and navigation flow coordination.
 */

import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import optimizationReducer from './optimization/optimizationSlice';

/**
 * Configure Redux store with RTK
 */
export const store = configureStore({
  reducer: {
    optimization: optimizationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for Date objects in optimization results
        ignoredActions: ['optimization/start/fulfilled', 'optimization/updateProgress'],
        // Ignore these field paths for Date serialization
        ignoredActionsPaths: ['payload.completedAt', 'payload.timestamp', 'payload.equityAnalysis.calculatedAt'],
        ignoredPaths: ['optimization.result.completedAt', 'optimization.result.equityAnalysis.calculatedAt'],
      },
    }),
  devTools: __DEV__,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;