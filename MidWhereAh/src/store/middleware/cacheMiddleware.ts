/**
 * Cache middleware for Redux
 * Handles intelligent caching for API responses
 */

import { Middleware } from '@reduxjs/toolkit';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cacheManager = new CacheManager();

export const cacheMiddleware: Middleware = (store) => (next) => (action: any) => {
  // Cache optimization results
  if (action.type?.includes('optimization/optimizeLocation/fulfilled')) {
    const cacheKey = `optimization_${JSON.stringify(action.meta.arg)}`;
    cacheManager.set(cacheKey, action.payload, 10 * 60 * 1000); // 10 minutes
  }

  // Cache venue data
  if (action.type?.includes('venues/') && action.type?.includes('/fulfilled')) {
    const cacheKey = `venues_${action.meta.arg}`;
    cacheManager.set(cacheKey, action.payload);
  }

  // Clear cache on logout
  if (action.type === 'auth/logout') {
    cacheManager.clear();
  }

  return next(action);
};

export { cacheManager };