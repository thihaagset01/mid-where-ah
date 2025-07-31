/**
 * DistanceMatrixService.js - Google Distance Matrix API integration
 * This replaces your basic distance calculations with real travel times
 */

class DistanceMatrixService {
    constructor() {
        this.cache = new Map();
        this.rateLimiter = new APIThrottler(10); // 10 requests/second
        this.requestQueue = [];
        this.isProcessing = false;
    }

    /**
     * Get travel times between origins and destinations
     * @param {Array} origins - Array of {lat, lng, mode} objects
     * @param {Object} destination - {lat, lng} object
     * @returns {Promise<Array>} Array of travel times in minutes
     */
    async getTravelTimes(origins, destination) {
        const promises = origins.map(async (origin, index) => {
            const cacheKey = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}|${origin.mode}`;
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                console.log('🎯 Cache hit for', cacheKey);
                return this.cache.get(cacheKey);
            }

            // Make API call
            try {
                const travelTime = await this.rateLimiter.throttle(() => 
                    this.makeDistanceMatrixCall(origin, destination, origin.mode)
                );
                
                // Cache the result
                this.cache.set(cacheKey, travelTime);
                console.log('📡 API call completed for', cacheKey, '=', travelTime, 'minutes');
                
                return travelTime;
            } catch (error) {
                console.error('❌ Distance Matrix API error:', error);
                // Fallback to straight-line distance * time factor
                return this.calculateFallbackTime(origin, destination, origin.mode);
            }
        });

        return Promise.all(promises);
    }

    /**
     * Make actual Google Distance Matrix API call
     */
    async makeDistanceMatrixCall(origin, destination, mode) {
        return new Promise((resolve, reject) => {
            const service = new google.maps.DistanceMatrixService();
            
            service.getDistanceMatrix({
                origins: [new google.maps.LatLng(origin.lat, origin.lng)],
                destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
                travelMode: this.convertMode(mode),
                unitSystem: google.maps.UnitSystem.METRIC,
                avoidHighways: false,
                avoidTolls: false
            }, (response, status) => {
                if (status === 'OK') {
                    const element = response.rows[0].elements[0];
                    
                    if (element.status === 'OK') {
                        const durationMinutes = element.duration.value / 60;
                        const adjustedTime = this.applyModeFactors(durationMinutes, mode);
                        resolve(adjustedTime);
                    } else {
                        console.warn('⚠️ Route not found:', element.status);
                        resolve(this.calculateFallbackTime(origin, destination, mode));
                    }
                } else {
                    console.error('❌ Distance Matrix API error:', status);
                    reject(new Error(`Distance Matrix API error: ${status}`));
                }
            });
        });
    }

    /**
     * Convert your transport modes to Google Maps modes
     */
    convertMode(mode) {
        const modeMap = {
            'DRIVING': google.maps.TravelMode.DRIVING,
            'TRANSIT': google.maps.TravelMode.TRANSIT,
            'WALKING': google.maps.TravelMode.WALKING
        };
        
        return modeMap[mode] || google.maps.TravelMode.TRANSIT;
    }

    /**
     * Apply Singapore-specific mode factors
     */
    applyModeFactors(timeMinutes, mode) {
        const factors = {
            'DRIVING': 1.3,    // Singapore traffic penalty
            'TRANSIT': 1.0,    // Excellent MRT system
            'WALKING': 1.2     // Hot weather consideration
        };
        
        const factor = factors[mode] || 1.0;
        return timeMinutes * factor;
    }

    /**
     * Fallback calculation when API fails
     */
    calculateFallbackTime(origin, destination, mode) {
        const distance = this.haversineDistance(origin, destination);
        
        // Rough speed estimates (km/h)
        const speeds = {
            'DRIVING': 25,   // Singapore city driving
            'TRANSIT': 20,   // MRT + walking
            'WALKING': 4     // Walking speed
        };
        
        const speed = speeds[mode] || 20;
        const timeHours = distance / speed;
        const timeMinutes = timeHours * 60;
        
        return this.applyModeFactors(timeMinutes, mode);
    }

    /**
     * Calculate straight-line distance using Haversine formula
     */
    haversineDistance(point1, point2) {
        const R = 6371; // Earth's radius in km
        const φ1 = point1.lat * Math.PI / 180;
        const φ2 = point2.lat * Math.PI / 180;
        const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
        const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache() {
        const now = Date.now();
        const maxAge = 60 * 60 * 1000; // 1 hour

        for (const [key, value] of this.cache.entries()) {
            if (value.timestamp && (now - value.timestamp) > maxAge) {
                this.cache.delete(key);
            }
        }
    }
}

/**
 * API Rate Limiter to prevent quota exhaustion
 */
class APIThrottler {
    constructor(requestsPerSecond = 10) {
        this.requestQueue = [];
        this.isProcessing = false;
        this.interval = 1000 / requestsPerSecond;
        this.lastRequestTime = 0;
    }

    async throttle(apiCall) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ apiCall, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) return;

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const { apiCall, resolve, reject } = this.requestQueue.shift();

            // Ensure we don't exceed rate limit
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < this.interval) {
                await new Promise(res => setTimeout(res, this.interval - timeSinceLastRequest));
            }

            try {
                const result = await apiCall();
                this.lastRequestTime = Date.now();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.isProcessing = false;
    }
}

// Create global instance
window.distanceMatrixService = new DistanceMatrixService();

// Clean cache periodically
setInterval(() => {
    window.distanceMatrixService.clearExpiredCache();
}, 30 * 60 * 1000); // Every 30 minutes