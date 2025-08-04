// Cache Manager Utility
export class CacheManager {
    // Cache types configuration
    static CACHE_TYPES = {
        EVENTS: {
            prefix: 'events_',
            ttl: 15 * 60 * 1000, // 15 minutes
            version: '1.0'
        },
        PROFILES: {
            prefix: 'profiles_',
            ttl: 30 * 60 * 1000, // 30 minutes
            version: '1.0',
            maxItems: 50 // Keep most recent 50 profiles
        },
        GROUPS: {
            prefix: 'groups_',
            ttl: 30 * 60 * 1000, // 30 minutes
            version: '1.0',
            maxItems: 20
        },
        USER_DATA: {
            prefix: 'user_',
            ttl: 60 * 60 * 1000, // 1 hour
            version: '1.0'
        }
    };

    // Get the current user ID, handling both immediate and delayed auth state
    static async getCurrentUserId() {
        // If Firebase auth is already initialized and we have a user
        if (firebase.auth().currentUser) {
            return firebase.auth().currentUser.uid;
        }
        
        // If auth is still initializing, wait for it
        return new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe(); // Unsubscribe after first call
                resolve(user ? user.uid : 'guest');
            });
            
            // Add a small timeout to prevent hanging if auth never resolves
            setTimeout(() => {
                unsubscribe();
                resolve('guest');
            }, 1000);
        });
    }

    // Generate a cache key for the current user and cache type
    static async getCacheKey(cacheType, keySuffix = '') {
        if (!this.CACHE_TYPES[cacheType]) {
            throw new Error(`Invalid cache type: ${cacheType}`);
        }
        
        const userId = await this.getCurrentUserId();
        const cacheConfig = this.CACHE_TYPES[cacheType];
        return `cache_${cacheConfig.prefix}${userId}${keySuffix ? '_' + keySuffix : ''}_v${cacheConfig.version}`;
    }

    // Store data in cache with TTL
    static async set(cacheType, keySuffix, data, customTtl = null) {
        try {
            if (!this.CACHE_TYPES[cacheType]) {
                throw new Error(`Invalid cache type: ${cacheType}`);
            }
            
            const cacheKey = await this.getCacheKey(cacheType, keySuffix);
            const now = new Date();
            const ttl = customTtl !== null ? customTtl : this.CACHE_TYPES[cacheType].ttl;
            
            const item = {
                data: data,
                expiry: now.getTime() + ttl,
                timestamp: now.toISOString(),
                type: cacheType
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(item));
            
            // Enforce max items if configured for this cache type
            this.enforceMaxItems(cacheType);
            
            return true;
        } catch (error) {
            console.error(`[Cache] Error setting ${cacheType} cache:`, error);
            return false;
        }
    }

    // Get data from cache if it exists and isn't expired
    static async get(cacheType, keySuffix) {
        try {
            const cacheKey = await this.getCacheKey(cacheType, keySuffix);
            const itemStr = localStorage.getItem(cacheKey);
            
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            // Check if item is expired
            if (now.getTime() > item.expiry) {
                this.remove(cacheType, keySuffix);
                return null;
            }
            
            return item.data;
        } catch (error) {
            console.error(`[Cache] Error getting ${cacheType} cache:`, error);
            return null;
        }
    }

    // Remove an item from cache
    static async remove(cacheType, keySuffix) {
        try {
            const cacheKey = await this.getCacheKey(cacheType, keySuffix);
            localStorage.removeItem(cacheKey);
            return true;
        } catch (error) {
            console.error(`[Cache] Error removing ${cacheType} cache:`, error);
            return false;
        }
    }

    // Clear all cache or specific type of cache
    static async clear(cacheType = null) {
        try {
            const userId = await this.getCurrentUserId();
            
            if (cacheType) {
                // Clear specific cache type
                if (!this.CACHE_TYPES[cacheType]) {
                    throw new Error(`Invalid cache type: ${cacheType}`);
                }
                
                const prefix = `cache_${this.CACHE_TYPES[cacheType].prefix}${userId}`;
                this.clearByPrefix(prefix);
            } else {
                // Clear all caches for the current user
                Object.keys(this.CACHE_TYPES).forEach(type => {
                    const prefix = `cache_${this.CACHE_TYPES[type].prefix}${userId}`;
                    this.clearByPrefix(prefix);
                });
            }
            
            return true;
        } catch (error) {
            console.error('[Cache] Error clearing cache:', error);
            return false;
        }
    }

    // Clear cache items by key prefix
    static clearByPrefix(prefix) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        });
    }

    // Enforce maximum items for a cache type
    static async enforceMaxItems(cacheType) {
        try {
            const cacheConfig = this.CACHE_TYPES[cacheType];
            if (!cacheConfig.maxItems) return;
            
            const prefix = await this.getCacheKey(cacheType, '');
            const items = [];
            
            // Find all items for this cache type
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(prefix)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        items.push({
                            key: key,
                            timestamp: new Date(item.timestamp).getTime()
                        });
                    } catch (e) {
                        // Skip invalid items
                        continue;
                    }
                }
            }
            
            // If we're over the limit, remove the oldest items
            if (items.length > cacheConfig.maxItems) {
                // Sort by timestamp (oldest first)
                items.sort((a, b) => a.timestamp - b.timestamp);
                
                // Remove oldest items
                const itemsToRemove = items.slice(0, items.length - cacheConfig.maxItems);
                itemsToRemove.forEach(item => {
                    localStorage.removeItem(item.key);
                });
                
                console.log(`[Cache] Removed ${itemsToRemove.length} old ${cacheType} items from cache`);
            }
        } catch (error) {
            console.error(`[Cache] Error enforcing max items for ${cacheType}:`, error);
        }
    }

    // Get cache stats (for debugging)
    static async getStats() {
        const userId = await this.getCurrentUserId();
        const stats = {
            totalItems: 0,
            byType: {}
        };
        
        // Initialize stats for each cache type
        Object.keys(this.CACHE_TYPES).forEach(type => {
            stats.byType[type] = { count: 0, size: 0 };
        });
        
        // Count items
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Check if this is one of our cache items
            if (key.startsWith('cache_') && key.includes(userId)) {
                stats.totalItems++;
                
                // Find which cache type this belongs to
                for (const type in this.CACHE_TYPES) {
                    const prefix = `cache_${this.CACHE_TYPES[type].prefix}${userId}`;
                    if (key.startsWith(prefix)) {
                        stats.byType[type].count++;
                        stats.byType[type].size += (localStorage.getItem(key) || '').length;
                        break;
                    }
                }
            }
        }
        
        return stats;
    }
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CacheManager };
}
