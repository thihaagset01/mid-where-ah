/**
 * Typed Redux hooks
 * Provides type-safe useSelector and useDispatch hooks
 */

import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Convenience selectors for common state access
export const useAuth = () => useAppSelector(state => state.auth);
export const useOptimization = () => useAppSelector(state => state.optimization);
export const useGroups = () => useAppSelector(state => state.groups);
export const useUser = () => useAppSelector(state => state.user);
export const useVenues = () => useAppSelector(state => state.venues);
