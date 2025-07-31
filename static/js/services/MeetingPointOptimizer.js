/**
 * MeetingPointOptimizer.js - Shared optimization engine
 * Works for both home page manual inputs AND group database locations
 */

class MeetingPointOptimizer {
    constructor(config = {}) {
        this.distanceService = window.distanceMatrixService;
        this.cache = new Map();
        
        // Singapore-optimized defaults
        this.config = {
            max_time: 60,           // minutes
            max_range: 20,          // minutes  
            coarse_spacing: 500,    // meters
            fine_spacing: 100,      // meters
            region_config: {
                mode_factors: {
                    'DRIVING': 1.3,    // Singapore traffic penalty
                    'TRANSIT': 1.0,    // Excellent MRT system
                    'WALKING': 1.2     // Hot weather consideration
                },
                transit_hubs: [
                    { lat: 1.3048, lng: 103.8318, name: "Raffles Place MRT" },
                    { lat: 1.2966, lng: 103.8526, name: "Marina Bay MRT" },
                    { lat: 1.3038, lng: 103.8303, name: "City Hall MRT" },
                    { lat: 1.2834, lng: 103.8611, name: "Marina South Pier MRT" },
                    { lat: 1.3062, lng: 103.8395, name: "Esplanade MRT" }
                ],
                venue_types: ['restaurant', 'cafe', 'shopping_mall', 'food_court']
            },
            ...config
        };
    }

    /**
     * MAIN OPTIMIZATION METHOD - Works for both home page and groups
     * @param {Array} users - Array of {lat, lng, mode, weight?, name?}
     * @returns {Promise<Object>} - {point, times, venues, score, fairness, metadata}
     */
    async findOptimalMeetingPoint(users) {
        const startTime = performance.now();
        console.log('🚀 Starting optimization for', users.length, 'users');
        
        if (users.length < 2) {
            throw new Error('Need at least 2 users for optimization');
        }

        // Validate users have required fields
        const validUsers = users.filter(u => u.lat && u.lng && u.mode);
        if (validUsers.length < 2) {
            throw new Error('Need at least 2 users with valid coordinates and transport modes');
        }

        let result = null;
        let fallbackUsed = false;

        try {
            // Phase 1: Generate candidate points
            const centroid = this.calculateCentroid(validUsers);
            const candidates = this.generateCandidates(validUsers, centroid);
            
            console.log('📍 Generated', candidates.length, 'candidate points');

            // Phase 2: Coarse evaluation with real travel times
            const topCandidates = await this.coarseSearch(candidates, validUsers);
            
            if (topCandidates.length === 0) {
                console.warn('⚠️ No candidates passed time constraints, using fallback');
                result = await this.fallbackToGeometricMidpoint(validUsers);
                fallbackUsed = true;
            } else {
                // Phase 3: Fine search with venue validation
                result = await this.fineSearch(topCandidates.slice(0, 3), validUsers);
                
                if (!result) {
                    // Phase 4: Fallback without venue requirement
                    console.warn('⚠️ Fine search failed, trying fallback strategies');
                    result = await this.fallbackSearch(topCandidates, validUsers);
                    fallbackUsed = true;
                }
            }

        } catch (error) {
            console.error('❌ Optimization failed:', error);
            result = await this.fallbackToGeometricMidpoint(validUsers);
            fallbackUsed = true;
        }

        // Add metadata
        if (result) {
            result.metadata = {
                userCount: validUsers.length,
                fallbackUsed: fallbackUsed,
                duration: performance.now() - startTime,
                algorithmVersion: '2.0',
                generatedAt: new Date().toISOString()
            };
        }

        console.log(`🎯 Optimization completed in ${(performance.now() - startTime).toFixed(0)}ms`);
        return result;
    }

    /**
     * Calculate geographic centroid
     */
    calculateCentroid(users) {
        const totalLat = users.reduce((sum, user) => sum + user.lat, 0);
        const totalLng = users.reduce((sum, user) => sum + user.lng, 0);
        
        return {
            lat: totalLat / users.length,
            lng: totalLng / users.length
        };
    }

    /**
     * Generate candidate meeting points
     */
    generateCandidates(users, centroid) {
        const candidates = [];
        
        // Start with centroid
        candidates.push({ ...centroid, source: 'centroid' });
        
        // Add transit hubs within reasonable distance
        this.config.region_config.transit_hubs.forEach(hub => {
            const distance = this.haversineDistance(centroid, hub);
            if (distance <= 10) { // Within 10km
                candidates.push({ 
                    lat: hub.lat, 
                    lng: hub.lng, 
                    source: `transit_hub_${hub.name}` 
                });
            }
        });
        
        // Add grid points around centroid
        const gridRadius = 2000; // 2km radius
        const numRings = 2;
        const pointsPerRing = 6;
        
        for (let ring = 1; ring <= numRings; ring++) {
            const ringRadius = (gridRadius * ring) / numRings;
            
            for (let i = 0; i < pointsPerRing; i++) {
                const angle = (2 * Math.PI * i) / pointsPerRing;
                const latOffset = (ringRadius * Math.cos(angle)) / 111000; // Convert to degrees
                const lngOffset = (ringRadius * Math.sin(angle)) / (111000 * Math.cos(centroid.lat * Math.PI / 180));
                
                candidates.push({
                    lat: centroid.lat + latOffset,
                    lng: centroid.lng + lngOffset,
                    source: `grid_ring${ring}_point${i}`
                });
            }
        }
        
        // Add outlier handling - points between centroid and distant users
        const outlier = this.detectOutlier(users);
        if (outlier) {
            const linePoints = this.generateLinePoints(centroid, outlier, 3);
            linePoints.forEach((point, index) => {
                candidates.push({ 
                    ...point, 
                    source: `outlier_line_point${index}` 
                });
            });
        }
        
        console.log('📊 Candidate sources:', 
            candidates.reduce((acc, c) => {
                acc[c.source.split('_')[0]] = (acc[c.source.split('_')[0]] || 0) + 1;
                return acc;
            }, {})
        );
        
        return candidates;
    }

    /**
     * Coarse search - evaluate all candidates with travel time constraints
     */
    async coarseSearch(candidates, users) {
        console.log('⏳ Starting coarse search...');
        const results = [];
        
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            
            try {
                // Get travel times for all users to this candidate
                const travelTimes = await this.distanceService.getTravelTimes(users, candidate);
                
                // Apply time constraints
                const maxTime = Math.max(...travelTimes);
                const minTime = Math.min(...travelTimes);
                const timeRange = maxTime - minTime;
                
                // Skip if constraints not met
                if (maxTime > this.config.max_time || timeRange > this.config.max_range) {
                    continue;
                }
                
                // Calculate scores
                const jfi = this.calculateJFI(travelTimes);
                const equityScore = this.calculateEquityScore(travelTimes);
                const avgTime = travelTimes.reduce((a, b) => a + b, 0) / travelTimes.length;
                
                results.push({
                    point: candidate,
                    travelTimes: travelTimes,
                    jfi: jfi,
                    equityScore: equityScore,
                    avgTime: avgTime,
                    timeRange: timeRange,
                    source: candidate.source
                });
                
            } catch (error) {
                console.warn(`⚠️ Failed to evaluate candidate ${i+1}:`, error);
                continue;
            }
            
            // Show progress every 10 candidates
            if (i % 10 === 0 && i > 0) {
                console.log(`⏳ Evaluated ${i}/${candidates.length} candidates...`);
            }
        }
        
        // Sort by equity score (lower is better)
        results.sort((a, b) => a.equityScore - b.equityScore);
        
        console.log(`✅ Coarse search complete: ${results.length}/${candidates.length} candidates passed constraints`);
        return results.slice(0, 5); // Return top 5
    }

    /**
     * Fine search - validate venues for top candidates
     */
    async fineSearch(topCandidates, users) {
        console.log('🔍 Starting fine search with venue validation...');
        
        for (const candidate of topCandidates) {
            try {
                // Find venues near this candidate
                const venues = await this.findVenues(candidate.point, 500);
                
                if (venues && venues.length > 0) {
                    console.log(`🎯 Found optimal point with ${venues.length} venues`);
                    
                    return {
                        point: candidate.point,
                        times: candidate.travelTimes,
                        venues: venues,
                        score: candidate.equityScore,
                        fairness: candidate.jfi,
                        avgTime: candidate.avgTime,
                        timeRange: candidate.timeRange,
                        source: candidate.source
                    };
                }
                
            } catch (error) {
                console.warn('⚠️ Venue search failed for candidate:', error);
                continue;
            }
        }
        
        console.log('❌ Fine search failed - no candidates with venues found');
        return null;
    }

    /**
     * Fallback search strategies
     */
    async fallbackSearch(topCandidates, users) {
        console.log('🔄 Trying fallback strategies...');
        
        // Strategy 1: Expand venue search radius to 1km
        for (const candidate of topCandidates) {
            try {
                const venues = await this.findVenues(candidate.point, 1000);
                
                if (venues && venues.length > 0) {
                    console.log('✅ Fallback successful with expanded venue search');
                    return {
                        point: candidate.point,
                        times: candidate.travelTimes,
                        venues: venues,
                        score: candidate.equityScore,
                        fairness: candidate.jfi,
                        avgTime: candidate.avgTime,
                        timeRange: candidate.timeRange,
                        source: candidate.source
                    };
                }
            } catch (error) {
                continue;
            }
        }
        
        // Strategy 2: Return best candidate without venue requirement
        if (topCandidates.length > 0) {
            const best = topCandidates[0];
            console.log('⚠️ Fallback: returning best candidate without venues');
            
            return {
                point: best.point,
                times: best.travelTimes,
                venues: [],
                score: best.equityScore,
                fairness: best.jfi,
                avgTime: best.avgTime,
                timeRange: best.timeRange,
                source: best.source
            };
        }
        
        return null;
    }

    /**
     * Final fallback to geometric midpoint
     */
    async fallbackToGeometricMidpoint(users) {
        console.log('🆘 Using geometric midpoint fallback');
        
        const centroid = this.calculateCentroid(users);
        
        // Try to get travel times for centroid
        let times = [];
        try {
            times = await this.distanceService.getTravelTimes(users, centroid);
        } catch (error) {
            console.warn('Could not get travel times for centroid:', error);
            // Estimate times using distance and speed
            times = users.map(user => {
                const distance = this.haversineDistance(user, centroid);
                const speed = user.mode === 'WALKING' ? 4 : user.mode === 'DRIVING' ? 25 : 20; // km/h
                return (distance / speed) * 60; // minutes
            });
        }
        
        // Try to find venues
        let venues = [];
        try {
            venues = await this.findVenues(centroid, 1000) || [];
        } catch (error) {
            console.warn('Could not find venues for centroid:', error);
        }
        
        return {
            point: centroid,
            times: times,
            venues: venues,
            score: this.calculateEquityScore(times),
            fairness: this.calculateJFI(times),
            avgTime: times.reduce((a, b) => a + b, 0) / times.length,
            timeRange: Math.max(...times) - Math.min(...times),
            source: 'geometric_fallback'
        };
    }

    /**
     * Find venues using Google Places API
     */
    async findVenues(point, radius = 500) {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.warn('Google Places API not available');
            return [];
        }
        
        return new Promise((resolve, reject) => {
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            
            const request = {
                location: new google.maps.LatLng(point.lat, point.lng),
                radius: radius,
                type: this.config.region_config.venue_types,
                fields: ['name', 'rating', 'user_ratings_total', 'price_level', 'place_id', 'formatted_address']
            };
            
            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // Filter and sort results
                    const filteredVenues = results
                        .filter(place => 
                            place.business_status === 'OPERATIONAL' &&
                            place.rating && place.rating >= 3.5 &&
                            place.user_ratings_total >= 10
                        )
                        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                        .slice(0, 10); // Top 10 venues
                    
                    console.log(`📍 Found ${filteredVenues.length} quality venues within ${radius}m`);
                    resolve(filteredVenues);
                } else {
                    console.warn('Places search failed:', status);
                    resolve([]);
                }
            });
        });
    }

    /**
     * Calculate Jain's Fairness Index (higher is better, max 1.0)
     */
    calculateJFI(times) {
        if (times.length === 0) return 0;
        
        const sum = times.reduce((a, b) => a + b, 0);
        const sumSquares = times.reduce((a, b) => a + b * b, 0);
        
        if (sumSquares === 0) return 1.0; // Perfect fairness if all times are 0
        
        return (sum * sum) / (times.length * sumSquares);
    }

    /**
     * Calculate equity score (lower is better)
     * Combines fairness, range penalty, and average time penalty
     */
    calculateEquityScore(times) {
        if (times.length === 0) return Infinity;
        
        const jfi = this.calculateJFI(times);
        const range = Math.max(...times) - Math.min(...times);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        
        // Weighted formula: 70% fairness, 20% range penalty, 10% avg time penalty
        return 0.7 * (1 - jfi) + 0.2 * (range / 60) + 0.1 * (avg / 60);
    }

    /**
     * Detect geographic outlier using IQR method
     */
    detectOutlier(users) {
        if (users.length < 4) return null; // Need at least 4 points for meaningful outlier detection
        
        const centroid = this.calculateCentroid(users);
        const distances = users.map(user => ({
            user: user,
            distance: this.haversineDistance(user, centroid)
        }));
        
        // Sort by distance
        distances.sort((a, b) => a.distance - b.distance);
        
        // Calculate IQR
        const q1Index = Math.floor(0.25 * distances.length);
        const q3Index = Math.floor(0.75 * distances.length);
        const q1 = distances[q1Index].distance;
        const q3 = distances[q3Index].distance;
        const iqr = q3 - q1;
        const threshold = q3 + 1.5 * iqr;
        
        // Find outliers
        const outliers = distances.filter(d => d.distance > threshold);
        
        if (outliers.length > 0) {
            console.log(`🎯 Detected ${outliers.length} outlier(s), furthest at ${outliers[0].distance.toFixed(2)}km`);
            return outliers[0].user; // Return the furthest outlier
        }
        
        return null;
    }

    /**
     * Generate points along a line between two locations
     */
    generateLinePoints(start, end, numPoints = 3) {
        const points = [];
        
        for (let i = 1; i <= numPoints; i++) {
            const fraction = i / (numPoints + 1);
            
            points.push({
                lat: start.lat + fraction * (end.lat - start.lat),
                lng: start.lng + fraction * (end.lng - start.lng)
            });
        }
        
        return points;
    }

    /**
     * Calculate distance between two points using Haversine formula
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
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 Configuration updated:', this.config);
    }

    /**
     * Clear cache (useful for testing)
     */
    clearCache() {
        this.cache.clear();
        if (this.distanceService && this.distanceService.cache) {
            this.distanceService.cache.clear();
        }
        console.log('🧹 Cache cleared');
    }

    /**
     * Get performance statistics
     */
    getStats() {
        return {
            cacheSize: this.cache.size,
            distanceServiceCacheSize: this.distanceService?.cache?.size || 0,
            config: this.config
        };
    }
}

// Create global instance
window.meetingPointOptimizer = new MeetingPointOptimizer();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeetingPointOptimizer;
}