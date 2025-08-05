/**
 * AlgorithmVisualizer.js - Simplified real-time visualization
 * Shows the optimization process with animated markers (NO POPUPS)
 */

class AlgorithmVisualizer {
    constructor(map) {
        this.map = map;
        this.isVisualizing = false;
        this.candidateMarkers = [];
        this.centroidMarker = null;
        this.radiusCircles = [];
        this.resultMarker = null;
        
        // Animation timing
        this.animationSpeed = 120; // ms between candidate evaluations
        
        console.log('🎨 AlgorithmVisualizer initialized (simplified)');
    }
    
    /**
     * Start visualization of the optimization process (simplified)
     */
    async visualizeOptimization(users, onComplete) {
        if (this.isVisualizing) {
            console.warn('Visualization already in progress');
            return;
        }
        
        this.isVisualizing = true;
        this.clearPreviousVisualization();
        
        console.log('🎬 Starting visual optimization');
        
        try {
            // Show user locations and calculate centroid
            const centroid = await this.showCentroidAndSearchArea(users);
            
            // Generate and evaluate candidates visually
            const candidates = await this.visualizeCandidateSearch(centroid);
            
            // Find best candidate and run actual optimization
            const result = await this.runRealOptimization(users);
            
            // Show final result
            await this.showOptimalResult(result);
            
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
     * Phase 1: Show centroid and search area
     */
    async showCentroidAndSearchArea(users) {
        // Calculate centroid
        const centroid = {
            lat: users.reduce((sum, user) => sum + user.lat, 0) / users.length,
            lng: users.reduce((sum, user) => sum + user.lng, 0) / users.length
        };
        
        // Show pulsing centroid
        this.centroidMarker = new google.maps.Marker({
            position: centroid,
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#3F51B5',
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 10
            },
            title: 'Search Center',
            animation: google.maps.Animation.BOUNCE
        });
        
        // Show search radius with animation
        const searchRadius = new google.maps.Circle({
            center: centroid,
            radius: 2000, // 2km search radius
            map: this.map,
            fillColor: '#3F51B5',
            fillOpacity: 0.1,
            strokeColor: '#3F51B5',
            strokeOpacity: 0.3,
            strokeWeight: 2
        });
        
        this.radiusCircles.push(searchRadius);
        
        // Animate the search radius
        let scale = 0;
        const animateRadius = () => {
            scale += 0.1;
            if (scale <= 1) {
                searchRadius.setRadius(2000 * scale);
                setTimeout(animateRadius, 50);
            }
        };
        animateRadius();
        
        // Fit bounds to show all locations
        const bounds = new google.maps.LatLngBounds();
        users.forEach(user => bounds.extend({ lat: user.lat, lng: user.lng }));
        bounds.extend(centroid);
        this.map.fitBounds(bounds);
        
        await this.delay(1000);
        
        // Stop bouncing after a bit
        setTimeout(() => {
            if (this.centroidMarker) {
                this.centroidMarker.setAnimation(null);
            }
        }, 2000);
        
        return centroid;
    }
    
    /**
     * Phase 2: Visual candidate search
     */
    async visualizeCandidateSearch(centroid) {
        const candidates = [];
        
        // Generate grid points around centroid
        const gridRadius = 2000;
        const numRings = 2;
        const pointsPerRing = 6;
        
        // Add candidates in animated waves
        for (let ring = 1; ring <= numRings; ring++) {
            const ringRadius = (gridRadius * ring) / numRings;
            
            for (let i = 0; i < pointsPerRing; i++) {
                const angle = (2 * Math.PI * i) / pointsPerRing;
                const latOffset = (ringRadius * Math.cos(angle)) / 111000;
                const lngOffset = (ringRadius * Math.sin(angle)) / (111000 * Math.cos(centroid.lat * Math.PI / 180));
                
                const candidate = {
                    lat: centroid.lat + latOffset,
                    lng: centroid.lng + lngOffset
                };
                
                candidates.push(candidate);
                
                // Add candidate marker with drop animation
                const marker = new google.maps.Marker({
                    position: candidate,
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#9C27B0',
                        fillOpacity: 0.7,
                        strokeColor: '#ffffff',
                        strokeWeight: 1,
                        scale: 5
                    },
                    animation: google.maps.Animation.DROP
                });
                
                this.candidateMarkers.push(marker);
                await this.delay(this.animationSpeed);
            }
        }
        
        // Evaluate candidates visually (turn good ones green, bad ones red)
        for (let i = 0; i < this.candidateMarkers.length; i++) {
            const marker = this.candidateMarkers[i];
            
            // Highlight current candidate
            marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#FF9800',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 8
            });
            marker.setAnimation(google.maps.Animation.BOUNCE);
            
            await this.delay(this.animationSpeed);
            
            // Simulate evaluation (70% pass rate)
            const passed = Math.random() > 0.3;
            
            if (passed) {
                // Good candidate - turn green
                marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#4CAF50',
                    fillOpacity: 0.8,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 6
                });
            } else {
                // Bad candidate - turn red and fade out
                marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#F44336',
                    fillOpacity: 0.5,
                    strokeColor: '#ffffff',
                    strokeWeight: 1,
                    scale: 3
                });
                
                // Fade out after delay
                setTimeout(() => {
                    marker.setMap(null);
                }, 1000);
            }
            
            marker.setAnimation(null);
        }
        
        await this.delay(800);
        return candidates;
    }
    
    /**
     * Phase 3: Run actual optimization (behind the scenes)
     */
    async runRealOptimization(users) {
        console.log('🧠 Running real optimization...');
        
        // Use the actual optimizer
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
     * Phase 4: Show optimal result
     */
    async showOptimalResult(result) {
        if (!result) {
            console.warn('No optimization result to show');
            return;
        }
        
        // Clear candidate markers
        this.candidateMarkers.forEach(marker => marker.setMap(null));
        this.candidateMarkers = [];
        
        // Create big winner marker
        this.resultMarker = new google.maps.Marker({
            position: result.point,
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4CAF50',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 4,
                scale: 18
            },
            title: `Optimal Meeting Point (${(result.fairness * 100).toFixed(1)}% fair)`,
            animation: google.maps.Animation.BOUNCE
        });
        
        // Pan to result
        this.map.panTo(result.point);
        this.map.setZoom(15);
        
        // Show subtle success info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="text-align: center; color: #4CAF50; font-weight: 600;">
                    🎯 ${(result.fairness * 100).toFixed(1)}% Fairness<br>
                    <small style="color: #666;">${result.venues?.length || 0} venues nearby</small>
                </div>
            `
        });
        
        infoWindow.open(this.map, this.resultMarker);
        
        // Auto-close info window after 3 seconds
        setTimeout(() => {
            infoWindow.close();
        }, 3000);
        
        await this.delay(1500);
    }
    
    /**
     * Clear all visualization elements
     */
    clearPreviousVisualization() {
        // Remove candidate markers
        this.candidateMarkers.forEach(marker => marker.setMap(null));
        this.candidateMarkers = [];
        
        // Remove radius circles
        this.radiusCircles.forEach(circle => circle.setMap(null));
        this.radiusCircles = [];
        
        // Remove centroid marker
        if (this.centroidMarker) {
            this.centroidMarker.setMap(null);
            this.centroidMarker = null;
        }
        
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
}

// Export for global access
window.AlgorithmVisualizer = AlgorithmVisualizer;