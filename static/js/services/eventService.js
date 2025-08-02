import { CacheManager } from '../utils/cacheManager.js';

class EventService {
    static CACHE_KEY = 'events';
    static CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

    // Fetch events with caching support
    static async fetchEvents(forceRefresh = false) {
        // Try to get cached events first if not forcing refresh
        if (!forceRefresh) {
            try {
                const cachedEvents = await CacheManager.get(this.CACHE_KEY);
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
            CacheManager.set(this.CACHE_KEY, events, this.CACHE_TTL)
                .catch(error => console.warn('Failed to cache events:', error));
            
            console.log('Fetched fresh events from server');
            return events;
        } catch (error) {
            console.error('Error fetching events:', error);
            
            // If there's an error but we have cached data, return that instead
            try {
                const cachedEvents = await CacheManager.get(this.CACHE_KEY);
                if (cachedEvents) {
                    console.log('Using cached events due to fetch error');
                    return cachedEvents;
                }
            } catch (cacheError) {
                console.warn('Error reading from cache on error fallback:', cacheError);
            }
            
            throw error; // Re-throw if no cached data is available
        }
    }

    // Force refresh events from the server
    static async refreshEvents() {
        return this.fetchEvents(true);
    }

    // Get event by ID (checks cache first, then server if not found)
    static async getEventById(eventId) {
        try {
            // Try to get from cache first
            const events = await CacheManager.get(this.CACHE_KEY) || [];
            const cachedEvent = events.find(e => e.id === eventId);
            
            if (cachedEvent) {
                return cachedEvent;
            }
            
            // If not in cache, fetch from server
            const response = await fetch(`/api/events/${eventId}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch event: ${response.statusText}`);
            }
            
            return response.json();
        } catch (error) {
            console.error(`Error getting event ${eventId}:`, error);
            throw error;
        }
    }

    // Create a new event
    static async createEvent(eventData) {
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create event: ${response.statusText}`);
            }
            
            // Invalidate the cache since we've added a new event
            await this.invalidateCache();
            
            return response.json();
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }

    // Update an existing event
    static async updateEvent(eventId, eventData) {
        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update event: ${response.statusText}`);
            }
            
            // Invalidate the cache since we've updated an event
            await this.invalidateCache();
            
            return response.json();
        } catch (error) {
            console.error(`Error updating event ${eventId}:`, error);
            throw error;
        }
    }

    // Delete an event
    static async deleteEvent(eventId) {
        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete event: ${response.statusText}`);
            }
            
            // Invalidate the cache since we've removed an event
            await this.invalidateCache();
            
            return true;
        } catch (error) {
            console.error(`Error deleting event ${eventId}:`, error);
            throw error;
        }
    }

    // Invalidate the events cache
    static async invalidateCache() {
        try {
            await CacheManager.remove(this.CACHE_KEY);
            console.log('Cache invalidated');
            return true;
        } catch (error) {
            console.error('Error invalidating cache:', error);
            return false;
        }
    }
}

// Export individual methods for direct usage
export const fetchEvents = EventService.fetchEvents.bind(EventService);
export const refreshEvents = EventService.refreshEvents.bind(EventService);
export const getEventById = EventService.getEventById.bind(EventService);
export const createEvent = EventService.createEvent.bind(EventService);
export const updateEvent = EventService.updateEvent.bind(EventService);
export const deleteEvent = EventService.deleteEvent.bind(EventService);
export const invalidateCache = EventService.invalidateCache.bind(EventService);

// Also export the class itself for cases where it's needed
export { EventService };
