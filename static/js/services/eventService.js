// EventService - Non-module version
class EventService {
    static CACHE_TYPE = 'EVENTS';  // Changed to match CacheManager.CACHE_TYPES
    static CACHE_KEY_SUFFIX = 'explore';  // Added suffix for cache key
    static CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

    // Fetch events with caching support
    static async fetchEvents(forceRefresh = false) {
        // Try to get cached events first if not forcing refresh
        if (!forceRefresh && typeof CacheManager !== 'undefined') {
            try {
                const cachedEvents = await CacheManager.get(this.CACHE_TYPE, this.CACHE_KEY_SUFFIX);
                if (cachedEvents) {
                    console.log('Returning cached events');
                    return cachedEvents;
                }
            } catch (error) {
                console.warn('Error reading from cache:', error);
                // Continue to fetch from server if cache read fails
            }
        }

        try {
            // Fetch fresh events from the server
            const response = await fetch('/api/events');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch events: ${response.statusText}`);
            }
            
            const events = await response.json();
            
            // Cache the fresh events (don't await to avoid blocking)
            if (typeof CacheManager !== 'undefined') {
                CacheManager.set(this.CACHE_TYPE, this.CACHE_KEY_SUFFIX, events, this.CACHE_TTL)
                    .catch(error => console.warn('Failed to cache events:', error));
            }
            
            console.log('Fetched fresh events from server');
            return events;
        } catch (error) {
            console.error('Error fetching events:', error);
            
            // If there's a network error, try to return stale cached data
            if (typeof CacheManager !== 'undefined') {
                try {
                    const staleEvents = await CacheManager.get(this.CACHE_TYPE, this.CACHE_KEY_SUFFIX);
                    if (staleEvents) {
                        console.log('Returning stale cached events due to network error');
                        return staleEvents;
                    }
                } catch (cacheError) {
                    console.warn('Could not retrieve stale cache:', cacheError);
                }
            }
            
            throw error;
        }
    }
}

// Make EventService globally available
window.EventService = EventService;