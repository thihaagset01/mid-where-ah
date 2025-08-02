// Cache Manager Utility
export class CacheManager {
    static PREFIX = 'midwhere_events_';
    static DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

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

    // Generate a cache key for the current user
    static async getCacheKey(keySuffix) {
        const userId = await this.getCurrentUserId();
        return `${this.PREFIX}${userId}_${keySuffix}`;
    }

    // Store data in cache with TTL
    static async set(keySuffix, data, ttl = this.DEFAULT_TTL) {
        try {
            const cacheKey = await this.getCacheKey(keySuffix);
            const now = new Date();
            
            const item = {
                data: data,
                expiry: now.getTime() + ttl,
                timestamp: now.toISOString()
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    // Retrieve data from cache if not expired
    static async get(keySuffix) {
        try {
            const cacheKey = await this.getCacheKey(keySuffix);
            const itemStr = localStorage.getItem(cacheKey);
            
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            // Check if item is expired
            if (now.getTime() > item.expiry) {
                // Remove expired item
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            return item.data;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    // Remove item from cache
    static async remove(keySuffix) {
        try {
            const cacheKey = await this.getCacheKey(keySuffix);
            localStorage.removeItem(cacheKey);
            return true;
        } catch (error) {
            console.error('Cache remove error:', error);
            return false;
        }
    }

    // Clear all cached events for the current user
    static async clearAll() {
        try {
            const prefix = await this.getCacheKey('');
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }
}

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CacheManager };
}
