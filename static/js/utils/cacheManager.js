// Enhanced Cache Manager for instant page loading (Non-module version)
class CacheManager {
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
        },
        // New cache types for instant loading
        MESSAGES: {
            prefix: 'messages_',
            ttl: 2 * 60 * 1000,      // 2 minutes for recent messages
            maxItems: 10,             // Last 10 group message sets
            version: '1.0'
        },
        CHAT_EVENTS: {
            prefix: 'chat_events_',
            ttl: 10 * 60 * 1000,     // 10 minutes for events
            maxItems: 20,             // 20 event sets
            version: '1.0'
        },
        USER_PROFILE: {
            prefix: 'user_profile_',
            ttl: 30 * 60 * 1000,     // 30 minutes for user profiles
            maxItems: 5,              // 5 user profiles
            version: '1.0'
        },
        NAVIGATION_STATE: {
            prefix: 'nav_state_',
            ttl: 5 * 60 * 1000,      // 5 minutes for navigation states
            maxItems: 10,             // Last 10 page states
            version: '1.0'
        },
        PAGE_DATA: {
            prefix: 'page_data_',
            ttl: 3 * 60 * 1000,      // 3 minutes for page data
            maxItems: 15,             // 15 page data sets
            version: '1.0'
        },
        PRELOAD_QUEUE: {
            prefix: 'preload_',
            ttl: 1 * 60 * 1000,      // 1 minute for preload queue
            maxItems: 5,              // 5 preload sets
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
                type: cacheType,
                keySuffix: keySuffix
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(item));
            
            // Enforce max items if configured for this cache type
            this.enforceMaxItems(cacheType);
            
            // Mark as recently accessed for smart preloading
            this.markAccessed(cacheKey);
            
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
            
            // Mark as recently accessed
            this.markAccessed(cacheKey);
            
            return item.data;
        } catch (error) {
            console.error(`[Cache] Error getting ${cacheType} cache:`, error);
            return null;
        }
    }

    // Get data from cache immediately (synchronous) - for instant loading
    static getSync(cacheKey) {
        try {
            const itemStr = localStorage.getItem(cacheKey);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            // Check if item is expired
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(cacheKey);
                return null;
            }
            
            return item.data;
        } catch (error) {
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
            
            const userId = await this.getCurrentUserId();
            const prefix = `cache_${cacheConfig.prefix}${userId}`;
            const items = [];
            
            // Find all items for this cache type
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        items.push({
                            key: key,
                            timestamp: new Date(item.timestamp).getTime(),
                            accessed: this.getLastAccessed(key)
                        });
                    } catch (e) {
                        // Skip invalid items
                        continue;
                    }
                }
            }
            
            // If we're over the limit, remove the oldest/least accessed items
            if (items.length > cacheConfig.maxItems) {
                // Sort by last accessed time (least recently accessed first)
                items.sort((a, b) => a.accessed - b.accessed);
                
                // Remove oldest items
                const itemsToRemove = items.slice(0, items.length - cacheConfig.maxItems);
                itemsToRemove.forEach(item => {
                    localStorage.removeItem(item.key);
                    localStorage.removeItem(`access_${item.key}`);
                });
                
                console.log(`[Cache] Removed ${itemsToRemove.length} old ${cacheType} items from cache`);
            }
        } catch (error) {
            console.error(`[Cache] Error enforcing max items for ${cacheType}:`, error);
        }
    }

    // Mark item as recently accessed
    static markAccessed(cacheKey) {
        try {
            localStorage.setItem(`access_${cacheKey}`, Date.now().toString());
        } catch (error) {
            // Ignore access tracking errors
        }
    }

    // Get last accessed time
    static getLastAccessed(cacheKey) {
        try {
            const accessed = localStorage.getItem(`access_${cacheKey}`);
            return accessed ? parseInt(accessed) : 0;
        } catch (error) {
            return 0;
        }
    }

    // Preload data for instant page loading
    static async preloadPageData(pageType, pageId = '') {
        const preloadData = {};
        
        switch (pageType) {
            case 'group_chat':
                preloadData.group = await this.get('GROUPS', pageId);
                preloadData.messages = await this.get('MESSAGES', `recent_${pageId}`);
                preloadData.events = await this.get('CHAT_EVENTS', `upcoming_${pageId}`);
                break;
                
            case 'groups':
                const userId = await this.getCurrentUserId();
                preloadData.userGroups = await this.get('GROUPS', `user_groups_${userId}`);
                break;
                
            case 'profile':
                preloadData.profile = await this.get('USER_PROFILE', pageId || 'current');
                break;
        }
        
        // Cache the preloaded data
        await this.set('PAGE_DATA', `${pageType}_${pageId}`, preloadData, 3 * 60 * 1000);
        
        return preloadData;
    }

    // Get preloaded page data
    static async getPageData(pageType, pageId = '') {
        return await this.get('PAGE_DATA', `${pageType}_${pageId}`);
    }

    // Batch operations for performance
    static async setBatch(items) {
        const operations = items.map(item => 
            this.set(item.cacheType, item.keySuffix, item.data, item.customTtl)
        );
        
        return Promise.allSettled(operations);
    }

    // Get multiple cache items at once
    static async getBatch(requests) {
        const operations = requests.map(req => 
            this.get(req.cacheType, req.keySuffix)
        );
        
        return Promise.allSettled(operations);
    }

    // Smart cache warming based on user patterns
    static async warmCache(userId = null) {
        try {
            const currentUserId = userId || await this.getCurrentUserId();
            if (currentUserId === 'guest') return;

            // Get user's most accessed groups
            const userGroups = await this.get('GROUPS', `user_groups_${currentUserId}`);
            if (userGroups && Array.isArray(userGroups)) {
                // Preload data for top 3 groups
                const topGroups = userGroups.slice(0, 3);
                
                const warmupPromises = topGroups.map(async (group) => {
                    // Don't await these - let them run in background
                    this.preloadPageData('group_chat', group.id).catch(() => {});
                });
                
                // Don't wait for completion
                Promise.allSettled(warmupPromises);
            }
        } catch (error) {
            console.warn('[Cache] Error warming cache:', error);
        }
    }

    // Get cache stats (for debugging)
    static async getStats() {
        const userId = await this.getCurrentUserId();
        const stats = {
            totalItems: 0,
            totalSize: 0,
            byType: {}
        };
        
        // Initialize stats for each cache type
        Object.keys(this.CACHE_TYPES).forEach(type => {
            stats.byType[type] = { count: 0, size: 0 };
        });
        
        // Count items
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Skip access tracking keys
            if (key && key.startsWith('access_')) continue;
            
            // Check if this is one of our cache items
            if (key && key.startsWith('cache_') && key.includes(userId)) {
                const itemData = localStorage.getItem(key) || '';
                stats.totalItems++;
                stats.totalSize += itemData.length;
                
                // Find which cache type this belongs to
                for (const type in this.CACHE_TYPES) {
                    const prefix = `cache_${this.CACHE_TYPES[type].prefix}${userId}`;
                    if (key.startsWith(prefix)) {
                        stats.byType[type].count++;
                        stats.byType[type].size += itemData.length;
                        break;
                    }
                }
            }
        }
        
        return stats;
    }

    // Clean up expired items periodically
    static cleanupExpired() {
        const now = Date.now();
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cache_')) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item.expiry && now > item.expiry) {
                        keysToRemove.push(key);
                        keysToRemove.push(`access_${key}`);
                    }
                } catch (error) {
                    // Remove invalid items
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        if (keysToRemove.length > 0) {
            console.log(`[Cache] Cleaned up ${keysToRemove.length} expired items`);
        }
    }
}

// Make CacheManager globally available
window.CacheManager = CacheManager;

// Auto-cleanup expired items every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        CacheManager.cleanupExpired();
    }, 5 * 60 * 1000);
    
    // Warm cache on page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            CacheManager.warmCache().catch(() => {});
        }, 1000);
    });
}