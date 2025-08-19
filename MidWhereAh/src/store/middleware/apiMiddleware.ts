/**
 * API middleware for Redux
 * Handles API call logging and error handling
 */

import { Middleware } from '@reduxjs/toolkit';

export const apiMiddleware: Middleware = (store) => (next) => (action: any) => {
  // Log API actions in development
  if (__DEV__ && action.type?.includes('/pending')) {
    console.log('🔄 API Request:', action.type);
  }
  
  if (__DEV__ && action.type?.includes('/fulfilled')) {
    console.log('✅ API Success:', action.type);
  }
  
  if (__DEV__ && action.type?.includes('/rejected')) {
    console.error('❌ API Error:', action.type, action.error);
  }
  
  return next(action);
};