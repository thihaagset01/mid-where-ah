/**
 * MeetingPointOptimizer.js - UNBIASED Multi-Center Optimization Engine
 * REWRITTEN to eliminate centroid bias and handle cluster-outlier scenarios
 * 
 * Key Improvements:
 * - Multiple strategic centers (geometric, weighted, median, cluster)
 * - Unbiased transit hub selection (distance to ANY user)
 * - User location candidates (sometimes best meeting point IS someone's location)
 * - Cluster-aware candidate generation
 */

class MeetingPointOptimizer {
    constructor(config = {}) {
        this.distanceService = window.distanceMatrixService;
        this.cache = new Map();
        
        // Singapore-optimized defaults
        this.config = {
            max_time: 90,           // minutes
            max_range: 20,          // minutes  
            coarse_spacing: 500,    // meters
            fine_spacing: 100,      // meters
            cluster_threshold: 5,   // km - users within this distance form a cluster
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
                    { lat: 1.3062, lng: 103.8395, name: "Esplanade MRT" },
                    { lat: 1.2868, lng: 103.8545, name: "Bayfront MRT" },
                    { lat: 1.3016, lng: 103.8381, name: "Clarke Quay MRT" },
                    { lat: 1.3033, lng: 103.8367, name: "Fort Canning MRT" }
                ],
                venue_types: ['restaurant', 'cafe', 'shopping_mall']
            },
            ...config
        };
    }

    /**
     * MAIN OPTIMIZATION METHOD - Multi-Center Unbiased Approach
     */
    async findOptimalMeetingPoint(users) {
        const startTime = performance.now();
        console.log('🚀 Starting UNBIASED optimization for', users.length, 'users');
        
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
            // PHASE 1: Multi-Center Candidate Generation (UNBIASED)
            const candidateData = this.generateUnbiasedCandidates(validUsers);
            
            console.log('📍 Generated', candidateData.candidates.length, 'candidates from', candidateData.sources.length, 'strategic centers');
            console.log('📊 Strategic centers:', candidateData.centers);

            // PHASE 2: Coarse evaluation with real travel times
            const topCandidates = await this.coarseSearch(candidateData.candidates, validUsers);
            
            if (topCandidates.length === 0) {
                console.warn('⚠️ No candidates passed time constraints, using fallback');
                result = await this.fallbackToWeightedMidpoint(validUsers);
                fallbackUsed = true;
            } else {
                // PHASE 3: Fine search with venue validation
                result = await this.fineSearch(topCandidates.slice(0, 3), validUsers);
                
                if (!result) {
                    // PHASE 4: Fallback without venue requirement
                    console.warn('⚠️ Fine search failed, trying fallback strategies');
                    result = await this.fallbackSearch(topCandidates, validUsers);
                    fallbackUsed = true;
                }
            }

        } catch (error) {
            console.error('❌ Optimization failed:', error);
            result = await this.fallbackToWeightedMidpoint(validUsers);
            fallbackUsed = true;
        }

        // Add comprehensive metadata
        if (result) {
            result.metadata = {
                userCount: validUsers.length,
                fallbackUsed: fallbackUsed,
                duration: performance.now() - startTime,
                algorithmVersion: '3.0-unbiased',
                generatedAt: new Date().toISOString(),
                strategicCenters: candidateData?.sources || [],
                clusters: candidateData?.clusters || []
            };
        }

        console.log(`🎯 UNBIASED optimization completed in ${(performance.now() - startTime).toFixed(0)}ms`);
        return result;
    }

    /**
     * CORE INNOVATION: Generate candidates from multiple strategic centers
     * This eliminates the bias of only using geometric centroid
     */
    generateUnbiasedCandidates(users) {
        const candidates = [];
        const centers = [];
        const clusters = this.identifyUserClusters(users);
        
        // STRATEGY 1: Multiple Center Points
        const strategicCenters = this.generateStrategicCenters(users, clusters);
        
        strategicCenters.forEach(centerData => {
            centers.push(centerData.source);
            
            // Add the center itself as a candidate
            candidates.push({ 
                ...centerData.point, 
                source: centerData.source,
                priority: centerData.priority 
            });
            
            // Generate grid around each center with priority weighting
            const gridPoints = this.generatePriorityGrid(centerData.point, centerData.priority, centerData.source);
            candidates.push(...gridPoints);
        });

        // STRATEGY 2: User Locations as Candidates
        users.forEach((user, index) => {
            candidates.push({
                lat: user.lat,
                lng: user.lng,
                source: `user_location_${user.name || index}`,
                priority: 1.0
            });
        });

        // STRATEGY 3: Unbiased Transit Hub Selection
        const relevantHubs = this.selectRelevantTransitHubs(users);
        relevantHubs.forEach(hub => {
            candidates.push({
                lat: hub.lat,
                lng: hub.lng,
                source: `transit_hub_${hub.name}`,
                priority: 0.9
            });
        });

        // STRATEGY 4: Cluster-Outlier Line Points
        if (clusters.main && clusters.outliers.length > 0) {
            clusters.outliers.forEach((outlier, index) => {
                const linePoints = this.generateLinePoints(clusters.main.center, outlier, 3);
                linePoints.forEach((point, pointIndex) => {
                    candidates.push({
                        ...point,
                        source: `cluster_outlier_line_${index}_${pointIndex}`,
                        priority: 0.8
                    });
                });
            });
        }

        console.log('📊 Unbiased candidate breakdown:', this.analyzeCandidateSources(candidates));
        
        return {
            candidates: candidates,
            centers: centers,
            sources: strategicCenters.map(c => c.source),
            clusters: clusters
        };
    }

    /**
     * Generate multiple strategic centers instead of just geometric centroid
     */
    generateStrategicCenters(users, clusters) {
        const centers = [];
        
        // 1. Geometric centroid (for comparison)
        const geoCentroid = this.calculateCentroid(users);
        centers.push({ 
            point: geoCentroid, 
            source: 'geometric_centroid',
            priority: 0.8  // Lower priority due to bias potential
        });
        
        // 2. Weighted centroid (considers user weights if available)
        const weightedCentroid = this.calculateWeightedCentroid(users);
        if (this.haversineDistance(geoCentroid, weightedCentroid) > 0.1) { // Only if significantly different
            centers.push({ 
                point: weightedCentroid, 
                source: 'weighted_centroid',
                priority: 1.0 
            });
        }
        
        // 3. Median center (more robust to outliers)
        const medianCenter = this.calculateMedianCenter(users);
        centers.push({ 
            point: medianCenter, 
            source: 'median_center',
            priority: 1.2  // Higher priority - better for outliers
        });
        
        // 4. Cluster centers (if clusters exist)
        if (clusters.main) {
            centers.push({
                point: clusters.main.center,
                source: `cluster_center_main_${clusters.main.users.length}users`,
                priority: 1.5  // High priority for main cluster
            });
        }
        
        clusters.secondary.forEach((cluster, index) => {
            centers.push({
                point: cluster.center,
                source: `cluster_center_secondary${index}_${cluster.users.length}users`,
                priority: 1.1
            });
        });
        
        // 5. Balanced point (minimizes maximum distance)
        const balancedCenter = this.calculateBalancedCenter(users);
        centers.push({
            point: balancedCenter,
            source: 'balanced_center',
            priority: 1.3
        });

        return centers;
    }

    /**
     * Identify user clusters using improved clustering
     */
    identifyUserClusters(users) {
        if (users.length < 2) return { main: null, secondary: [], outliers: [] };
        
        const clusters = [];
        const visited = new Set();
        
        // Find clusters using distance-based grouping
        users.forEach((user, index) => {
            if (visited.has(index)) return;
            
            const cluster = { users: [user], indices: [index] };
            visited.add(index);
            
            // Find nearby users
            users.forEach((otherUser, otherIndex) => {
                if (otherIndex !== index && !visited.has(otherIndex)) {
                    const distance = this.haversineDistance(user, otherUser);
                    if (distance <= this.config.cluster_threshold) {
                        cluster.users.push(otherUser);
                        cluster.indices.push(otherIndex);
                        visited.add(otherIndex);
                    }
                }
            });
            
            // Calculate cluster center
            cluster.center = this.calculateCentroid(cluster.users);
            cluster.size = cluster.users.length;
            
            clusters.push(cluster);
        });
        
        // Sort clusters by size (largest first)
        clusters.sort((a, b) => b.size - a.size);
        
        // Identify main cluster, secondary clusters, and outliers
        const result = {
            main: clusters.length > 0 && clusters[0].size > 1 ? clusters[0] : null,
            secondary: clusters.slice(1).filter(c => c.size > 1),
            outliers: clusters.filter(c => c.size === 1).map(c => c.users[0])
        };
        
        console.log(`🎯 Cluster analysis: main(${result.main?.size || 0}), secondary(${result.secondary.length}), outliers(${result.outliers.length})`);
        
        return result;
    }

    /**
     * Calculate weighted centroid (considers user weights)
     */
    calculateWeightedCentroid(users) {
        let totalWeight = 0;
        let weightedLat = 0;
        let weightedLng = 0;
        
        users.forEach(user => {
            const weight = user.weight || 1.0;
            totalWeight += weight;
            weightedLat += user.lat * weight;
            weightedLng += user.lng * weight;
        });
        
        return {
            lat: weightedLat / totalWeight,
            lng: weightedLng / totalWeight
        };
    }

    /**
     * Calculate median center (more robust to outliers than mean)
     */
    calculateMedianCenter(users) {
        const lats = users.map(u => u.lat).sort((a, b) => a - b);
        const lngs = users.map(u => u.lng).sort((a, b) => a - b);
        
        const medianLat = this.getMedian(lats);
        const medianLng = this.getMedian(lngs);
        
        return { lat: medianLat, lng: medianLng };
    }

    /**
     * Calculate balanced center (minimizes maximum distance to any user)
     */
    calculateBalancedCenter(users) {
        // Start with geometric centroid and iteratively improve
        let bestCenter = this.calculateCentroid(users);
        let bestMaxDistance = this.calculateMaxDistance(bestCenter, users);
        
        // Try small adjustments to minimize max distance
        const adjustments = [
            { lat: 0.001, lng: 0 }, { lat: -0.001, lng: 0 },
            { lat: 0, lng: 0.001 }, { lat: 0, lng: -0.001 },
            { lat: 0.001, lng: 0.001 }, { lat: -0.001, lng: -0.001 },
            { lat: 0.001, lng: -0.001 }, { lat: -0.001, lng: 0.001 }
        ];
        
        for (let iteration = 0; iteration < 5; iteration++) {
            let improved = false;
            
            adjustments.forEach(adj => {
                const testCenter = {
                    lat: bestCenter.lat + adj.lat,
                    lng: bestCenter.lng + adj.lng
                };
                
                const maxDistance = this.calculateMaxDistance(testCenter, users);
                if (maxDistance < bestMaxDistance) {
                    bestCenter = testCenter;
                    bestMaxDistance = maxDistance;
                    improved = true;
                }
            });
            
            if (!improved) break;
        }
        
        return bestCenter;
    }

    /**
     * Calculate maximum distance from center to any user
     */
    calculateMaxDistance(center, users) {
        return Math.max(...users.map(user => this.haversineDistance(center, user)));
    }

    /**
     * Get median value from sorted array
     */
    getMedian(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);
        return sortedArray.length % 2 === 0 
            ? (sortedArray[mid - 1] + sortedArray[mid]) / 2
            : sortedArray[mid];
    }

    /**
     * Select relevant transit hubs based on distance to ANY user (not just centroid)
     */
    selectRelevantTransitHubs(users) {
        return this.config.region_config.transit_hubs.filter(hub => {
            // Hub is relevant if it's within 15km of ANY user
            const minDistanceToUsers = Math.min(...users.map(user => this.haversineDistance(user, hub)));
            return minDistanceToUsers <= 15;
        });
    }

    /**
     * Generate priority-weighted grid around a center point
     */
    generatePriorityGrid(center, priority, source) {
        const candidates = [];
        const baseRadius = 2000 * Math.min(priority, 1.5); // Max 3km radius
        const numRings = Math.ceil(2 * priority);
        const pointsPerRing = Math.ceil(6 * priority);
        
        for (let ring = 1; ring <= numRings; ring++) {
            const ringRadius = (baseRadius * ring) / numRings;
            
            for (let i = 0; i < pointsPerRing; i++) {
                const angle = (2 * Math.PI * i) / pointsPerRing;
                const latOffset = (ringRadius * Math.cos(angle)) / 111000;
                const lngOffset = (ringRadius * Math.sin(angle)) / (111000 * Math.cos(center.lat * Math.PI / 180));
                
                candidates.push({
                    lat: center.lat + latOffset,
                    lng: center.lng + lngOffset,
                    source: `grid_${source}_ring${ring}_point${i}`,
                    priority: priority * 0.8 // Grid points slightly lower priority than centers
                });
            }
        }
        
        return candidates;
    }

    /**
     * Analyze candidate sources for debugging
     */
    analyzeCandidateSources(candidates) {
        return candidates.reduce((acc, candidate) => {
            const sourceType = candidate.source.split('_')[0];
            acc[sourceType] = (acc[sourceType] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * Enhanced fallback to weighted midpoint instead of geometric
     */
    async fallbackToWeightedMidpoint(users) {
        console.log('🆘 Using weighted midpoint fallback');
        
        const weightedCenter = this.calculateWeightedCentroid(users);
        
        // Try to get travel times
        let times = [];
        try {
            times = await this.distanceService.getTravelTimes(users, weightedCenter);
        } catch (error) {
            console.warn('Could not get travel times for weighted center:', error);
            times = users.map(user => {
                const distance = this.haversineDistance(user, weightedCenter);
                const speed = user.mode === 'WALKING' ? 4 : user.mode === 'DRIVING' ? 25 : 20;
                return (distance / speed) * 60;
            });
        }
        
        // Try to find venues
        let venues = [];
        try {
            venues = await this.findVenues(weightedCenter, 1000) || [];
        } catch (error) {
            console.warn('Could not find venues for weighted center:', error);
        }
        
        return {
            point: weightedCenter,
            times: times,
            venues: venues,
            score: this.calculateEquityScore(times),
            fairness: this.calculateJFI(times),
            avgTime: times.reduce((a, b) => a + b, 0) / times.length,
            timeRange: Math.max(...times) - Math.min(...times),
            source: 'weighted_fallback'
        };
    }

    // ========================================================================
    // EXISTING METHODS (unchanged but improved)
    // ========================================================================

    /**
     * Calculate geographic centroid (kept for compatibility)
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
                
                // Apply priority weighting to equity score
                const priorityWeight = candidate.priority || 1.0;
                const weightedScore = equityScore / priorityWeight;
                
                results.push({
                    point: candidate,
                    travelTimes: travelTimes,
                    jfi: jfi,
                    equityScore: weightedScore,
                    avgTime: avgTime,
                    timeRange: timeRange,
                    source: candidate.source,
                    priority: priorityWeight
                });
                
            } catch (error) {
                console.warn(`⚠️ Failed to evaluate candidate ${i+1}:`, error);
                continue;
            }
            
            // Show progress every 20 candidates
            if (i % 20 === 0 && i > 0) {
                console.log(`⏳ Evaluated ${i}/${candidates.length} candidates...`);
            }
        }
        
        // Sort by weighted equity score (lower is better)
        results.sort((a, b) => a.equityScore - b.equityScore);
        
        console.log(`✅ Coarse search complete: ${results.length}/${candidates.length} candidates passed constraints`);
        return results.slice(0, 8); // Return top 8 for more options
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
                    console.log(`🎯 Found optimal point with ${venues.length} venues (source: ${candidate.source})`);
                    
                    return {
                        point: candidate.point,
                        times: candidate.travelTimes,
                        venues: venues,
                        score: candidate.equityScore,
                        fairness: candidate.jfi,
                        avgTime: candidate.avgTime,
                        timeRange: candidate.timeRange,
                        source: candidate.source,
                        priority: candidate.priority
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
     * Find venues using Google Places API
     */
    async findVenues(point, radius = 500) {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.warn('Google Maps Places API not available');
            return [];
        }
    
        try {
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            const request = {
                location: new google.maps.LatLng(point.lat, point.lng),
                radius: radius,
                types: this.config.region_config.venue_types
            };
    
            return new Promise((resolve) => {
                service.nearbySearch(request, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                        const filteredVenues = results
                            .filter(place => 
                                place.business_status === 'OPERATIONAL' &&
                                place.rating && place.rating >= 3.5 &&
                                place.user_ratings_total >= 10
                            )
                            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                            .slice(0, 15) // Increased from 10
                            .map(place => ({
                                name: place.name,
                                rating: place.rating,
                                place_id: place.place_id,
                                vicinity: place.vicinity,
                                formatted_address: place.vicinity,
                                price_level: place.price_level,
                                geometry: {
                                    location: place.geometry.location.toJSON()
                                },
                                photos: place.photos ? [{
                                    photo_reference: place.photos[0].photo_reference
                                }] : []
                            }));
                        
                        console.log(`📍 Found ${filteredVenues.length} quality venues within ${radius}m`);
                        resolve(filteredVenues);
                    } else {
                        console.warn('Places search returned no results:', status);
                        resolve([]);
                    }
                });
            });
        } catch (error) {
            console.error('Error in findVenues:', error);
            return [];
        }
    }

    /**
     * Calculate Jain's Fairness Index (higher is better, max 1.0)
     */
    calculateJFI(times) {
        if (times.length === 0) return 0;
        
        const sum = times.reduce((a, b) => a + b, 0);
        const sumSquares = times.reduce((a, b) => a + b * b, 0);
        
        if (sumSquares === 0) return 1.0;
        
        return (sum * sum) / (times.length * sumSquares);
    }

    /**
     * Calculate equity score (lower is better)
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
     * Clear cache
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