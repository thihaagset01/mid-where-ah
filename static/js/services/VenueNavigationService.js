/**
 * VenueNavigationService - Handles venue navigation and data management
 * Provides consistent venue data handling and navigation between map and venue views
 */

class VenueNavigationService {
    constructor() {
        // Session storage keys
        this.STORAGE_KEYS = {
            OPTIMIZATION_RESULT: 'optimizationResult',
            VENUE_SEARCH_POINT: 'venueSearchPoint',
            VENUES: 'venues',
            EVENT_DATA: 'eventData',
            GROUP_ID: 'groupId',
            SOURCE_PAGE: 'sourcePage'
        };
        
        // Navigation paths
        this.PATHS = {
            VENUES_TEMP: '/mobile/venues/temp',
            SWIPE: '/swipe',
            VENUE_DETAIL: '/venue'
        };
        
        console.log('VenueNavigationService initialized');
    }
    
    /**
     * Save optimization results for venue exploration
     * @param {Object} result - Optimization result from MeetingPointOptimizer
     * @param {string} source - Source of the navigation (e.g., 'homepage', 'event')
     * @param {Object} additionalData - Any additional data to store
     */
    saveOptimizationResults(result, source = 'homepage', additionalData = {}) {
        if (!result) {
            console.error('No result provided to save');
            return false;
        }
        
        try {
            // Prepare data for storage
            const storageData = {
                ...result,
                _source: source,
                _timestamp: new Date().toISOString(),
                ...additionalData
            };
            
            // Store in session storage
            sessionStorage.setItem(this.STORAGE_KEYS.OPTIMIZATION_RESULT, JSON.stringify(storageData));
            
            // Store venue search point separately for backward compatibility
            if (result.point) {
                sessionStorage.setItem(this.STORAGE_KEYS.VENUE_SEARCH_POINT, JSON.stringify(result.point));
            }
            
            // Store venues if available
            if (result.venues && Array.isArray(result.venues)) {
                this.saveVenues(result.venues);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving optimization results:', error);
            return false;
        }
    }
    
    /**
     * Save venues to session storage
     * @param {Array} venues - Array of venue objects
     */
    saveVenues(venues) {
        if (!venues || !Array.isArray(venues)) return;
        
        try {
            const venuesData = {
                venues,
                _timestamp: new Date().toISOString()
            };
            
            sessionStorage.setItem(this.STORAGE_KEYS.VENUES, JSON.stringify(venuesData));
        } catch (error) {
            console.error('Error saving venues:', error);
        }
    }
    
    /**
     * Get saved optimization results
     * @returns {Object|null} Saved optimization results or null if not found
     */
    getOptimizationResults() {
        try {
            const data = sessionStorage.getItem(this.STORAGE_KEYS.OPTIMIZATION_RESULT);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting optimization results:', error);
            return null;
        }
    }
    
    /**
     * Get saved venues
     * @returns {Array} Array of venues or empty array if none found
     */
    getVenues() {
        try {
            const data = sessionStorage.getItem(this.STORAGE_KEYS.VENUES);
            if (!data) return [];
            
            const parsed = JSON.parse(data);
            return parsed.venues || [];
        } catch (error) {
            console.error('Error getting venues:', error);
            return [];
        }
    }
    
    /**
     * Navigate to venue exploration
     * @param {Object} options - Navigation options
     * @param {string} options.source - Source of navigation
     * @param {string} options.groupId - Group ID (for event navigation)
     * @param {boolean} options.swipeMode - Whether to use swipe interface
     */
    navigateToVenueExploration(options = {}) {
        const {
            source = 'homepage',
            groupId = null,
            swipeMode = false
        } = options;
        
        // Store source page for back navigation
        sessionStorage.setItem(this.STORAGE_KEYS.SOURCE_PAGE, source);
        
        // Store group ID if provided
        if (groupId) {
            sessionStorage.setItem(this.STORAGE_KEYS.GROUP_ID, groupId);
        }
        
        // Determine target URL
        let targetUrl = this.PATHS.VENUES_TEMP;
        
        if (swipeMode && groupId) {
            targetUrl = `${this.PATHS.SWIPE}/${groupId}`;
        }
        
        // Navigate
        window.location.href = targetUrl;
    }
    
    /**
     * Navigate to venue details
     * @param {string} venueId - Venue ID
     * @param {Object} venueData - Additional venue data
     */
    navigateToVenueDetails(venueId, venueData = {}) {
        if (!venueId) {
            console.error('No venue ID provided for navigation');
            return;
        }
        
        // Store venue data in session storage
        try {
            sessionStorage.setItem('currentVenue', JSON.stringify({
                ...venueData,
                id: venueId,
                _timestamp: new Date().toISOString()
            }));
            
            // Navigate to venue details page
            window.location.href = `${this.PATHS.VENUE_DETAIL}/${venueId}`;
        } catch (error) {
            console.error('Error navigating to venue details:', error);
        }
    }
    
    /**
     * Get the source of the current navigation
     * @returns {string} Source of navigation (e.g., 'homepage', 'event')
     */
    getNavigationSource() {
        try {
            const data = this.getOptimizationResults();
            return data?._source || 'homepage';
        } catch (error) {
            console.error('Error getting navigation source:', error);
            return 'homepage';
        }
    }
    
    /**
     * Get the group ID from session storage
     * @returns {string|null} Group ID or null if not found
     */
    getGroupId() {
        return sessionStorage.getItem(this.STORAGE_KEYS.GROUP_ID);
    }
    
    /**
     * Clear all navigation-related data from session storage
     */
    clearNavigationData() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            sessionStorage.removeItem(key);
        });
    }
    
    /**
     * Get directions to a venue
     * @param {Object} venue - Venue object with location data
     * @param {string} transportMode - Transport mode (driving, walking, transit, etc.)
     * @returns {string} Google Maps directions URL
     */
    getDirectionsUrl(venue, transportMode = 'driving') {
        if (!venue || !venue.geometry || !venue.geometry.location) {
            console.error('Invalid venue data for directions');
            return '#';
        }
        
        const { lat, lng } = venue.geometry.location;
        const origin = this.getUserLocation();
        
        if (!origin) {
            // If we can't get user location, just center on the venue
            return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${transportMode}`;
        }
        
        return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=${transportMode}`;
    }
    
    /**
     * Get the user's current location if available
     * @private
     */
    getUserLocation() {
        // Try to get from browser geolocation
        if (navigator.geolocation) {
            let userLocation = null;
            
            // This is a simplified version - in a real app, you'd want to handle this asynchronously
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                },
                (error) => {
                    console.warn('Could not get user location:', error);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
            
            return userLocation;
        }
        
        return null;
    }
    
    /**
     * Format venue data for display
     * @param {Object} venue - Raw venue data
     * @returns {Object} Formatted venue data
     */
    formatVenueData(venue) {
        if (!venue) return null;
        
        return {
            id: venue.place_id || venue.id || `venue-${Date.now()}`,
            name: venue.name || 'Unnamed Venue',
            address: venue.vicinity || venue.formatted_address || 'Address not available',
            rating: venue.rating || 0,
            ratingCount: venue.user_ratings_total || 0,
            priceLevel: venue.price_level ? '$'.repeat(venue.price_level) : 'N/A',
            location: venue.geometry?.location || null,
            types: venue.types || [],
            photos: venue.photos || [],
            placeId: venue.place_id || venue.id,
            rawData: venue // Keep original data for reference
        };
    }
    
    /**
     * Open directions in a new tab
     * @param {Object} venue - Venue object with location data
     * @param {string} transportMode - Transport mode (driving, walking, transit, etc.)
     */
    openDirections(venue, transportMode = 'driving') {
        const url = this.getDirectionsUrl(venue, transportMode);
        window.open(url, '_blank');
    }
}

// Create global instance
window.venueNavigationService = new VenueNavigationService();

export default VenueNavigationService;
