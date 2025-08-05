/**
 * AlgorithmVisualizer.js - UNBIASED Multi-Center Visualization
 * Shows the sophisticated multi-center optimization process with educational elements
 * 
 * Visual Elements:
 * - Multiple strategic centers (different colors for different strategies)
 * - Cluster detection and highlighting
 * - Source-coded candidate markers
 * - Educational tooltips explaining bias mitigation
 */

class AlgorithmVisualizer {
    constructor(map) {
        this.map = map;
        this.isVisualizing = false;
        
        // Marker collections
        this.strategicCenterMarkers = [];
        this.candidateMarkers = [];
        this.clusterMarkers = [];
        this.userMarkers = [];
        this.resultMarker = null;
        
        // Visual elements
        this.radiusCircles = [];
        this.clusterCircles = [];
        
        // Animation timing
        this.animationSpeed = 150; // ms between steps
        
        // Color scheme for different strategies
        this.colors = {
            geometric_centroid: '#FF9800',      // Orange - traditional approach
            weighted_centroid: '#9C27B0',       // Purple - weighted
            median_center: '#2196F3',           // Blue - outlier-resistant
            cluster_center: '#4CAF50',          // Green - cluster-aware
            balanced_center: '#00BCD4',         // Cyan - min-max optimized
            user_location: '#F44336',           // Red - actual user spots
            transit_hub: '#795548',             // Brown - MRT stations
            grid: '#607D8B',                    // Blue-gray - grid points
            outlier_line: '#E91E63'             // Pink - outlier mitigation
        };
        
        console.log('🎨 UNBIASED AlgorithmVisualizer initialized');
    }
    
    /**
     * Start visualization of the UNBIASED optimization process
     */
    async visualizeOptimization(users, onComplete) {
        if (this.isVisualizing) {
            console.warn('Visualization already in progress');
            return;
        }
        
        this.isVisualizing = true;
        this.clearPreviousVisualization();
        
        console.log('🎬 Starting UNBIASED visual optimization');
        
        try {
            // Phase 1: Show users and detect clusters
            const clusters = await this.visualizeClusterDetection(users);
            
            // Phase 2: Generate strategic centers
            const centers = await this.visualizeStrategicCenters(users, clusters);
            
            // Phase 3: Show candidate generation from multiple sources
            await this.visualizeMultiSourceCandidates(centers, users);
            
            // Phase 4: Evaluate candidates with real algorithm
            const result = await this.runRealOptimization(users);
            
            // Phase 5: Show optimal result with explanation
            await this.showOptimalResultWithExplanation(result);
            
            // Complete
            if (onComplete) onComplete(result);
            
        } catch (error) {
            console.error('❌ Visualization error:', error);
            if (onComplete) onComplete(null);
        } finally {
            this.isVisualizing = false;
        }
    }
    
    /**
     * Phase 1: Cluster Detection Visualization
     */
    async visualizeClusterDetection(users) {
        console.log('🔍 Phase 1: Detecting user clusters...');
        
        // Show user locations first
        users.forEach((user, index) => {
            const marker = new google.maps.Marker({
                position: { lat: user.lat, lng: user.lng },
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#333333',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 8
                },
                title: `User ${index + 1}: ${user.name || 'Person'}`,
                animation: google.maps.Animation.DROP
            });
            
            this.userMarkers.push(marker);
        });
        
        await this.delay(800);
        
        // Detect clusters using the same logic as optimizer
        const clusters = this.identifyUserClusters(users);
        
        // Visualize main cluster
        if (clusters.main) {
            const clusterCircle = new google.maps.Circle({
                center: clusters.main.center,
                radius: 5000, // 5km cluster visualization
                map: this.map,
                fillColor: this.colors.cluster_center,
                fillOpacity: 0.15,
                strokeColor: this.colors.cluster_center,
                strokeOpacity: 0.6,
                strokeWeight: 2
            });
            
            const clusterMarker = new google.maps.Marker({
                position: clusters.main.center,
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: this.colors.cluster_center,
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    scale: 12
                },
                title: `Main Cluster: ${clusters.main.size} users`,
                animation: google.maps.Animation.BOUNCE
            });
            
            this.clusterCircles.push(clusterCircle);
            this.clusterMarkers.push(clusterMarker);
            
            // Add educational info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="color: ${this.colors.cluster_center}; font-weight: 600;">
                        🎯 Main Cluster Detected<br>
                        <small>${clusters.main.size} users within 5km</small>
                    </div>
                `
            });
            
            setTimeout(() => {
                infoWindow.open(this.map, clusterMarker);
                setTimeout(() => infoWindow.close(), 2000);
            }, 500);
        }
        
        // Highlight outliers
        clusters.outliers.forEach((outlier, index) => {
            // Find the corresponding user marker and highlight it
            const userIndex = users.findIndex(u => u.lat === outlier.lat && u.lng === outlier.lng);
            if (userIndex !== -1 && this.userMarkers[userIndex]) {
                this.userMarkers[userIndex].setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: this.colors.outlier_line,
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    scale: 10
                });
                this.userMarkers[userIndex].setAnimation(google.maps.Animation.BOUNCE);
                
                setTimeout(() => {
                    if (this.userMarkers[userIndex]) {
                        this.userMarkers[userIndex].setAnimation(null);
                    }
                }, 1500);
            }
        });
        
        // Fit map to show all users and clusters
        const bounds = new google.maps.LatLngBounds();
        users.forEach(user => bounds.extend({ lat: user.lat, lng: user.lng }));
        if (clusters.main) bounds.extend(clusters.main.center);
        this.map.fitBounds(bounds);
        
        await this.delay(2000);
        
        return clusters;
    }
    
    /**
     * Phase 2: Strategic Centers Visualization
     */
    async visualizeStrategicCenters(users, clusters) {
        console.log('🎯 Phase 2: Generating strategic centers...');
        
        const centers = this.generateStrategicCenters(users, clusters);
        
        // Show each strategic center with explanation
        for (let i = 0; i < centers.length; i++) {
            const center = centers[i];
            const color = this.colors[center.source.split('_')[0]] || '#666666';
            
            const marker = new google.maps.Marker({
                position: center.point,
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: color,
                    fillOpacity: 0.9,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    scale: 14
                },
                title: this.getStrategicCenterTitle(center.source),
                animation: google.maps.Animation.DROP
            });
            
            this.strategicCenterMarkers.push(marker);
            
            // Show educational tooltip
            const tooltip = this.createEducationalTooltip(center.source, center.priority);
            const infoWindow = new google.maps.InfoWindow({
                content: tooltip
            });
            
            // Show tooltip briefly
            setTimeout(() => {
                infoWindow.open(this.map, marker);
                setTimeout(() => infoWindow.close(), 2500);
            }, i * 600 + 200);
            
            await this.delay(400);
        }
        
        await this.delay(1000);
        
        return centers;
    }
    
    /**
     * Phase 3: Multi-Source Candidate Generation
     */
    async visualizeMultiSourceCandidates(centers, users) {
        console.log('📍 Phase 3: Generating candidates from multiple sources...');
        
        // Generate candidates around each strategic center
        for (const center of centers) {
            const color = this.colors[center.source.split('_')[0]] || '#666666';
            
            // Show search radius around this center
            const searchRadius = new google.maps.Circle({
                center: center.point,
                radius: Math.min(2000 * center.priority, 3000),
                map: this.map,
                fillOpacity: 0,
                strokeColor: color,
                strokeOpacity: 0.4,
                strokeWeight: 1,
                strokeDashArray: [5, 5]
            });
            
            this.radiusCircles.push(searchRadius);
            
            // Generate grid points around this center
            const gridPoints = this.generatePriorityGrid(center.point, center.priority, center.source);
            
            // Show grid points with small delay
            for (let i = 0; i < Math.min(gridPoints.length, 8); i++) {
                const point = gridPoints[i];
                
                const marker = new google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: color,
                        fillOpacity: 0.6,
                        strokeColor: '#ffffff',
                        strokeWeight: 1,
                        scale: 4
                    },
                    animation: google.maps.Animation.DROP
                });
                
                this.candidateMarkers.push(marker);
                await this.delay(30);
            }
            
            await this.delay(200);
        }
        
        // Add user locations as candidates
        users.forEach((user, index) => {
            const marker = new google.maps.Marker({
                position: { lat: user.lat, lng: user.lng },
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: this.colors.user_location,
                    fillOpacity: 0.8,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 6
                },
                title: `User Location Candidate: ${user.name || 'Person'}`,
                animation: google.maps.Animation.DROP
            });
            
            this.candidateMarkers.push(marker);
        });
        
        // Add transit hubs
        const relevantHubs = this.selectRelevantTransitHubs(users);
        relevantHubs.forEach(hub => {
            const marker = new google.maps.Marker({
                position: { lat: hub.lat, lng: hub.lng },
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: this.colors.transit_hub,
                    fillOpacity: 0.8,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 6
                },
                title: `Transit Hub: ${hub.name}`,
                animation: google.maps.Animation.DROP
            });
            
            this.candidateMarkers.push(marker);
        });
        
        await this.delay(1000);
        
        // Visual evaluation phase
        await this.visualizeEvaluation();
    }
    
    /**
     * Phase 3.5: Visual Evaluation of Candidates
     */
    async visualizeEvaluation() {
        console.log('⚖️ Phase 3.5: Evaluating candidates...');
        
        // Evaluate candidates visually (simulate real evaluation)
        for (let i = 0; i < this.candidateMarkers.length; i++) {
            const marker = this.candidateMarkers[i];
            
            // Highlight current candidate being evaluated
            const originalIcon = marker.getIcon();
            marker.setIcon({
                ...originalIcon,
                fillColor: '#FF9800',
                scale: originalIcon.scale * 1.3
            });
            marker.setAnimation(google.maps.Animation.BOUNCE);
            
            await this.delay(50);
            
            // Simulate evaluation result (70% pass rate)
            const passed = Math.random() > 0.3;
            
            if (passed) {
                // Good candidate - enhance it
                marker.setIcon({
                    ...originalIcon,
                    fillOpacity: 1,
                    strokeWeight: 2,
                    scale: originalIcon.scale * 1.1
                });
            } else {
                // Failed candidate - fade it
                marker.setIcon({
                    ...originalIcon,
                    fillOpacity: 0.2,
                    scale: originalIcon.scale * 0.7
                });
                
                // Remove after delay
                setTimeout(() => {
                    marker.setMap(null);
                }, 1000);
            }
            
            marker.setAnimation(null);
        }
        
        await this.delay(800);
    }
    
    /**
     * Phase 4: Run Real Optimization
     */
    async runRealOptimization(users) {
        console.log('🧠 Phase 4: Running real optimization...');
        
        if (window.meetingPointOptimizer) {
            try {
                return await window.meetingPointOptimizer.findOptimalMeetingPoint(users);
            } catch (error) {
                console.error('Optimizer failed:', error);
                return null;
            }
        }
        
        return null;
    }
    
    /**
     * Phase 5: Show Optimal Result with Educational Explanation
     */
    async showOptimalResultWithExplanation(result) {
        if (!result) {
            console.warn('No optimization result to show');
            return;
        }
        
        console.log('🎯 Phase 5: Showing optimal result...');
        
        // Clear candidate markers but keep strategic centers visible
        this.candidateMarkers.forEach(marker => marker.setMap(null));
        this.candidateMarkers = [];
        
        // Create prominent winner marker
        this.resultMarker = new google.maps.Marker({
            position: result.point,
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4CAF50',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 4,
                scale: 20
            },
            title: `Optimal Meeting Point (${result.source})`,
            animation: google.maps.Animation.BOUNCE
        });
        
        // Pan to result
        this.map.panTo(result.point);
        this.map.setZoom(15);
        
        // Create educational info window
        const explanation = this.createResultExplanation(result);
        const infoWindow = new google.maps.InfoWindow({
            content: explanation
        });
        
        setTimeout(() => {
            infoWindow.open(this.map, this.resultMarker);
            setTimeout(() => infoWindow.close(), 5000);
        }, 500);
        
        await this.delay(2000);
    }
    
    /**
     * Create educational tooltip for strategic centers
     */
    createEducationalTooltip(source, priority) {
        const explanations = {
            geometric_centroid: 'Traditional simple average of all locations - can be biased by outliers',
            weighted_centroid: 'Considers user priorities and weights - more fair than simple average',
            median_center: 'Uses median instead of mean - highly resistant to outliers',
            cluster_center: 'Center of main user cluster - great for grouped scenarios',
            balanced_center: 'Minimizes maximum travel time - ensures fairness',
            user_location: 'Actual user location - sometimes best to meet at someone\'s place',
            transit_hub: 'MRT station location - excellent transport connectivity'
        };
        
        const sourceKey = source.split('_')[0] + '_' + source.split('_')[1];
        const explanation = explanations[sourceKey] || explanations[source.split('_')[0]] || 'Strategic meeting point candidate';
        
        return `
            <div style="max-width: 250px;">
                <h4 style="margin: 0 0 8px 0; color: ${this.colors[source.split('_')[0]]}">${this.getStrategicCenterTitle(source)}</h4>
                <p style="margin: 0; font-size: 13px; color: #666;">${explanation}</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #999;">Priority: ${priority.toFixed(1)}x</p>
            </div>
        `;
    }
    
    /**
     * Create result explanation
     */
    createResultExplanation(result) {
        const sourceType = result.source.split('_')[0];
        const isCluster = result.source.includes('cluster');
        const isOptimal = result.metadata && !result.metadata.fallbackUsed;
        
        let explanation = '';
        if (isCluster) {
            explanation = 'Found near main user cluster - excellent for grouped scenarios!';
        } else if (sourceType === 'median') {
            explanation = 'Median center chosen - robust against outliers!';
        } else if (sourceType === 'balanced') {
            explanation = 'Balanced point selected - minimizes maximum travel time!';
        } else if (sourceType === 'user') {
            explanation = 'Meeting at a user location - sometimes this is optimal!';
        } else if (sourceType === 'transit') {
            explanation = 'MRT station chosen - excellent public transport access!';
        } else {
            explanation = 'Strategic location found through multi-center analysis!';
        }
        
        return `
            <div style="text-align: center; max-width: 280px;">
                <h3 style="margin: 0 0 10px 0; color: #4CAF50;">🎯 Optimal Meeting Point</h3>
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #333; font-weight: 500;">${explanation}</p>
                <div style="font-size: 12px; color: #666; line-height: 1.4;">
                    <strong>Fairness:</strong> ${(result.fairness * 100).toFixed(1)}%<br>
                    <strong>Avg Travel:</strong> ${Math.round(result.avgTime)} min<br>
                    <strong>Venues:</strong> ${result.venues?.length || 0} nearby<br>
                    <strong>Source:</strong> ${result.source.replace(/_/g, ' ')}
                </div>
                ${isOptimal ? '' : '<p style="font-size: 11px; color: #FF9800; margin: 8px 0 0 0;">⚠️ Fallback algorithm used</p>'}
            </div>
        `;
    }
    
    /**
     * Get human-readable title for strategic center
     */
    getStrategicCenterTitle(source) {
        const titles = {
            geometric_centroid: '📍 Geographic Center',
            weighted_centroid: '⚖️ Weighted Center',
            median_center: '🛡️ Outlier-Resistant Center',
            cluster_center: '👥 Cluster Center',
            balanced_center: '⚖️ Balanced Center',
            user_location: '📍 User Location',
            transit_hub: '🚇 MRT Station'
        };
        
        const sourceKey = source.split('_')[0] + '_' + source.split('_')[1];
        return titles[sourceKey] || titles[source.split('_')[0]] || 'Strategic Center';
    }
    
    /**
     * Clear all visualization elements
     */
    clearPreviousVisualization() {
        // Remove all marker collections
        [this.strategicCenterMarkers, this.candidateMarkers, this.clusterMarkers, this.userMarkers].forEach(collection => {
            collection.forEach(marker => marker.setMap(null));
            collection.length = 0;
        });
        
        // Remove circles
        [this.radiusCircles, this.clusterCircles].forEach(collection => {
            collection.forEach(circle => circle.setMap(null));
            collection.length = 0;
        });
        
        // Remove result marker
        if (this.resultMarker) {
            this.resultMarker.setMap(null);
            this.resultMarker = null;
        }
    }
    
    /**
     * Utility: delay function for animations
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Check if visualization is running
     */
    isRunning() {
        return this.isVisualizing;
    }
    
    // ========================================================================
    // HELPER METHODS (copied from optimizer for consistency)
    // ========================================================================
    
    identifyUserClusters(users) {
        if (users.length < 2) return { main: null, secondary: [], outliers: [] };
        
        const clusters = [];
        const visited = new Set();
        const clusterThreshold = 5; // 5km
        
        users.forEach((user, index) => {
            if (visited.has(index)) return;
            
            const cluster = { users: [user], indices: [index] };
            visited.add(index);
            
            users.forEach((otherUser, otherIndex) => {
                if (otherIndex !== index && !visited.has(otherIndex)) {
                    const distance = this.haversineDistance(user, otherUser);
                    if (distance <= clusterThreshold) {
                        cluster.users.push(otherUser);
                        cluster.indices.push(otherIndex);
                        visited.add(otherIndex);
                    }
                }
            });
            
            cluster.center = this.calculateCentroid(cluster.users);
            cluster.size = cluster.users.length;
            
            clusters.push(cluster);
        });
        
        clusters.sort((a, b) => b.size - a.size);
        
        return {
            main: clusters.length > 0 && clusters[0].size > 1 ? clusters[0] : null,
            secondary: clusters.slice(1).filter(c => c.size > 1),
            outliers: clusters.filter(c => c.size === 1).map(c => c.users[0])
        };
    }
    
    generateStrategicCenters(users, clusters) {
        const centers = [];
        
        // Geometric centroid
        centers.push({ 
            point: this.calculateCentroid(users), 
            source: 'geometric_centroid',
            priority: 0.8
        });
        
        // Median center
        centers.push({ 
            point: this.calculateMedianCenter(users), 
            source: 'median_center',
            priority: 1.2
        });
        
        // Cluster centers
        if (clusters.main) {
            centers.push({
                point: clusters.main.center,
                source: `cluster_center_main`,
                priority: 1.5
            });
        }
        
        // Balanced center
        centers.push({
            point: this.calculateBalancedCenter(users),
            source: 'balanced_center',
            priority: 1.3
        });
        
        return centers;
    }
    
    calculateCentroid(users) {
        const totalLat = users.reduce((sum, user) => sum + user.lat, 0);
        const totalLng = users.reduce((sum, user) => sum + user.lng, 0);
        
        return {
            lat: totalLat / users.length,
            lng: totalLng / users.length
        };
    }
    
    calculateMedianCenter(users) {
        const lats = users.map(u => u.lat).sort((a, b) => a - b);
        const lngs = users.map(u => u.lng).sort((a, b) => a - b);
        
        const medianLat = this.getMedian(lats);
        const medianLng = this.getMedian(lngs);
        
        return { lat: medianLat, lng: medianLng };
    }
    
    calculateBalancedCenter(users) {
        let bestCenter = this.calculateCentroid(users);
        let bestMaxDistance = this.calculateMaxDistance(bestCenter, users);
        
        const adjustments = [
            { lat: 0.001, lng: 0 }, { lat: -0.001, lng: 0 },
            { lat: 0, lng: 0.001 }, { lat: 0, lng: -0.001 }
        ];
        
        for (let iteration = 0; iteration < 3; iteration++) {
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
    
    calculateMaxDistance(center, users) {
        return Math.max(...users.map(user => this.haversineDistance(center, user)));
    }
    
    getMedian(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);
        return sortedArray.length % 2 === 0 
            ? (sortedArray[mid - 1] + sortedArray[mid]) / 2
            : sortedArray[mid];
    }
    
    selectRelevantTransitHubs(users) {
        const hubs = [
            { lat: 1.3048, lng: 103.8318, name: "Raffles Place MRT" },
            { lat: 1.2966, lng: 103.8526, name: "Marina Bay MRT" },
            { lat: 1.3038, lng: 103.8303, name: "City Hall MRT" }
        ];
        
        return hubs.filter(hub => {
            const minDistanceToUsers = Math.min(...users.map(user => this.haversineDistance(user, hub)));
            return minDistanceToUsers <= 15;
        });
    }
    
    generatePriorityGrid(center, priority, source) {
        const candidates = [];
        const baseRadius = 1500 * Math.min(priority, 1.5);
        const numRings = Math.ceil(1.5 * priority);
        const pointsPerRing = Math.ceil(4 * priority);
        
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
                    priority: priority * 0.8
                });
            }
        }
        
        return candidates;
    }
    
    haversineDistance(point1, point2) {
        const R = 6371;
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
}

// Export for global access
window.AlgorithmVisualizer = AlgorithmVisualizer;