/**
 * Redux store configuration with RTK Query
 * Centralized state management for MidWhereAh
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// Import slices
import authSlice from './slices/authSlice';
import optimizationSlice from './slices/optimizationSlice';
import groupsSlice from './slices/groupsSlice';
import userSlice from './slices/userSlice';
import venuesSlice from './slices/venuesSlice';

// Import API middleware
import { apiMiddleware } from './middleware/apiMiddleware';
import { cacheMiddleware } from './middleware/cacheMiddleware';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    optimization: optimizationSlice,
    groups: groupsSlice,
    user: userSlice,
    venues: venuesSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
    .concat(apiMiddleware)
    .concat(cacheMiddleware),
  devTools: __DEV__,
});

// Enable listener behavior for RTK Query
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export { useAppDispatch, useAppSelector } from './hooks';