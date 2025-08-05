/**
 * AlgorithmVisualizer.js - Real-time visualization of the MeetingPointOptimizer
 * Shows the optimization process with animated markers and progress indicators
 */

class AlgorithmVisualizer {
    constructor(map) {
        this.map = map;
        this.isVisualizing = false;
        this.visualMarkers = [];
        this.candidateMarkers = [];
        this.progressOverlay = null;
        this.centroidMarker = null;
        this.radiusCircles = [];
        
        // Animation timing
        this.animationSpeed = 150; // ms between candidate evaluations
        this.fadeOutDelay = 2000;  // ms before cleaning up markers
        
        console.log('🎨 AlgorithmVisualizer initialized');
    }
    
    /**
     * Start visualization of the optimization process
     */
    async visualizeOptimization(users, onComplete) {
        if (this.isVisualizing) {
            console.warn('Visualization already in progress');
            return;
        }
        
        this.isVisualizing = true;
        this.clearPreviousVisualization();
        
        console.log('🎬 Starting optimization visualization');
        
        try {
            // Create progress overlay
            this.createProgressOverlay();
            
            // Phase 1: Show user locations and centroid
            await this.visualizePhase1(users);
            
            // Phase 2: Generate and show candidate grid
            const candidates = await this.visualizePhase2(users);
            
            // Phase 3: Evaluate candidates with travel time analysis
            const topCandidates = await this.visualizePhase3(candidates, users);
            
            // Phase 4: Fine search with venue validation
            const result = await this.visualizePhase4(topCandidates, users);
            
            // Phase 5: Show final result
            await this.visualizePhase5(result);
            
            // Complete
            this.updateProgress('Optimization Complete!', 100);
            setTimeout(() => {
                this.hideProgressOverlay();
                if (onComplete) onComplete(result);
            }, 1500);
            
        } catch (error) {
            console.error('❌ Visualization error:', error);
            this.hideProgressOverlay();
            if (onComplete) onComplete(null);
        } finally {
            this.isVisualizing = false;
        }
    }
    
    /**
     * Phase 1: Show user locations and calculate centroid
     */
    async visualizePhase1(users) {
        this.updateProgress('Analyzing locations...', 10);
        
        // Calculate centroid
        const centroid = {
            lat: users.reduce((sum, user) => sum + user.lat, 0) / users.length,
            lng: users.reduce((sum, user) => sum + user.lng, 0) / users.length
        };
        
        // Show centroid with pulsing animation
        this.centroidMarker = new google.maps.Marker({
            position: centroid,
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#3F51B5',
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 12
            },
            title: 'Geographic Center',
            animation: google.maps.Animation.BOUNCE
        });
        
        // Add info window for centroid
        const infoWindow = new google.maps.InfoWindow({
            content: '<div style="color: #3F51B5; font-weight: bold;">📍 Geographic Center</div>'
        });
        
        this.centroidMarker.addListener('click', () => {
            infoWindow.open(this.map, this.centroidMarker);
        });
        
        // Show search radius
        this.radiusCircles.push(new google.maps.Circle({
            center: centroid,
            radius: 2000, // 2km search radius
            map: this.map,
            fillColor: '#3F51B5',
            fillOpacity: 0.1,
            strokeColor: '#3F51B5',
            strokeOpacity: 0.3,
            strokeWeight: 2
        }));
        
        // Pan to show all user locations and centroid
        const bounds = new google.maps.LatLngBounds();
        users.forEach(user => bounds.extend({ lat: user.lat, lng: user.lng }));
        bounds.extend(centroid);
        this.map.fitBounds(bounds);
        
        await this.delay(1000);
    }
    
    /**
     * Phase 2: Generate candidate grid
     */
    async visualizePhase2(users) {
        this.updateProgress('Generating search grid...', 25);
        
        // Calculate centroid (same as MeetingPointOptimizer)
        const centroid = {
            lat: users.reduce((sum, user) => sum + user.lat, 0) / users.length,
            lng: users.reduce((sum, user) => sum + user.lng, 0) / users.length
        };
        
        const candidates = [];
        
        // Add centroid as first candidate
        candidates.push({ ...centroid, source: 'centroid' });
        
        // Generate grid points (matching MeetingPointOptimizer logic)
        const gridRadius = 2000; // 2km radius
        const numRings = 2;
        const pointsPerRing = 6;
        
        for (let ring = 1; ring <= numRings; ring++) {
            const ringRadius = (gridRadius * ring) / numRings;
            
            // Show radius ring
            this.radiusCircles.push(new google.maps.Circle({
                center: centroid,
                radius: ringRadius,
                map: this.map,
                fillOpacity: 0,
                strokeColor: '#9C27B0',
                strokeOpacity: 0.4,
                strokeWeight: 1,
                strokeDashArray: [5, 5]
            }));
            
            for (let i = 0; i < pointsPerRing; i++) {
                const angle = (2 * Math.PI * i) / pointsPerRing;
                const latOffset = (ringRadius * Math.cos(angle)) / 111000;
                const lngOffset = (ringRadius * Math.sin(angle)) / (111000 * Math.cos(centroid.lat * Math.PI / 180));
                
                const candidate = {
                    lat: centroid.lat + latOffset,
                    lng: centroid.lng + lngOffset,
                    source: `grid_ring${ring}_point${i}`
                };
                
                candidates.push(candidate);
                
                // Add candidate marker with animation
                const marker = new google.maps.Marker({
                    position: candidate,
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#9C27B0',
                        fillOpacity: 0.6,
                        strokeColor: '#ffffff',
                        strokeWeight: 1,
                        scale: 4
                    },
                    title: `Candidate ${candidates.length}`,
                    animation: google.maps.Animation.DROP
                });
                
                this.candidateMarkers.push(marker);
                await this.delay(50); // Small delay for visual effect
            }
        }
        
        this.updateProgress(`Generated ${candidates.length} candidates`, 35);
        await this.delay(500);
        
        return candidates;
    }
    
    /**
     * Phase 3: Evaluate candidates with travel time analysis
     */
    async visualizePhase3(candidates, users) {
        this.updateProgress('Evaluating travel times...', 50);
        
        const validCandidates = [];
        
        // Simulate the coarse search evaluation
        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const marker = this.candidateMarkers[i];
            
            if (marker) {
                // Highlight current candidate being evaluated
                marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#FF9800',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 8
                });
                marker.setAnimation(google.maps.Animation.BOUNCE);
            }
            
            // Simulate travel time calculation (in real implementation, this calls DistanceMatrixService)
            await this.delay(this.animationSpeed);
            
            // Simulate evaluation result (60% pass rate for visualization)
            const passed = Math.random() > 0.4;
            
            if (marker) {
                if (passed) {
                    // Mark as good candidate (green)
                    marker.setIcon({
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#4CAF50',
                        fillOpacity: 0.8,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 6
                    });
                    marker.setAnimation(null);
                    validCandidates.push({ ...candidate, marker });
                } else {
                    // Mark as rejected (red, will fade)
                    marker.setIcon({
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#F44336',
                        fillOpacity: 0.5,
                        strokeColor: '#ffffff',
                        strokeWeight: 1,
                        scale: 3
                    });
                    marker.setAnimation(null);
                    
                    // Fade out rejected candidates
                    setTimeout(() => {
                        marker.setMap(null);
                    }, 1000);
                }
            }
            
            // Update progress
            const progress = 50 + (25 * (i + 1)) / candidates.length;
            this.updateProgress(`Evaluating candidate ${i + 1}/${candidates.length}...`, progress);
        }
        
        this.updateProgress(`${validCandidates.length} candidates passed evaluation`, 75);
        await this.delay(800);
        
        return validCandidates.slice(0, 5); // Top 5 candidates
    }
    
    /**
     * Phase 4: Fine search with venue validation
     */
    async visualizePhase4(topCandidates, users) {
        this.updateProgress('Finding nearby venues...', 85);
        
        for (let i = 0; i < topCandidates.length; i++) {
            const candidate = topCandidates[i];
            
            if (candidate.marker) {
                // Highlight candidate being checked for venues
                candidate.marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#2196F3',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    scale: 10
                });
                candidate.marker.setAnimation(google.maps.Animation.BOUNCE);
                
                // Show search radius around candidate
                const searchCircle = new google.maps.Circle({
                    center: { lat: candidate.lat, lng: candidate.lng },
                    radius: 500, // 500m venue search radius
                    map: this.map,
                    fillColor: '#2196F3',
                    fillOpacity: 0.1,
                    strokeColor: '#2196F3',
                    strokeOpacity: 0.5,
                    strokeWeight: 2
                });
                
                this.radiusCircles.push(searchCircle);
            }
            
            await this.delay(600);
            
            // Simulate venue search (80% success rate for first few candidates)
            const foundVenues = i < 3 ? Math.random() > 0.2 : Math.random() > 0.7;
            
            if (foundVenues) {
                // Success! Found venues
                if (candidate.marker) {
                    candidate.marker.setIcon({
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#4CAF50',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 4,
                        scale: 15
                    });
                    candidate.marker.setAnimation(google.maps.Animation.BOUNCE);
                }
                
                this.updateProgress('✅ Optimal location found!', 95);
                
                // Return successful result (simulate the actual optimizer result structure)
                return {
                    point: { lat: candidate.lat, lng: candidate.lng },
                    venues: this.generateMockVenues(candidate), // Mock venues for visualization
                    fairness: 0.85 + Math.random() * 0.15, // High fairness score
                    avgTime: 20 + Math.random() * 15,
                    timeRange: 5 + Math.random() * 10,
                    source: candidate.source,
                    marker: candidate.marker
                };
            }
            
            // No venues found, try next candidate
            if (candidate.marker) {
                candidate.marker.setAnimation(null);
                candidate.marker.setIcon({
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#FF9800',
                    fillOpacity: 0.6,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 6
                });
            }
        }
        
        // If we get here, no candidates had venues (fallback scenario)
        return null;
    }
    
    /**
     * Phase 5: Show final result
     */
    async visualizePhase5(result) {
        if (!result) {
            this.updateProgress('Using fallback location...', 100);
            return;
        }
        
        // Highlight the chosen optimal point
        if (result.marker) {
            result.marker.setIcon({
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4CAF50',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 4,
                scale: 20
            });
            result.marker.setAnimation(google.maps.Animation.BOUNCE);
            
            // Create success info window
            const successInfo = new google.maps.InfoWindow({
                content: `
                    <div style="text-align: center; color: #4CAF50;">
                        <h4>🎯 Optimal Meeting Point</h4>
                        <p><strong>Fairness:</strong> ${(result.fairness * 100).toFixed(1)}%</p>
                        <p><strong>Avg Travel:</strong> ${Math.round(result.avgTime)} min</p>
                        <p><strong>Venues Found:</strong> ${result.venues?.length || 0}</p>
                    </div>
                `
            });
            
            successInfo.open(this.map, result.marker);
        }
        
        // Pan to optimal point
        this.map.panTo(result.point);
        this.map.setZoom(15);
        
        await this.delay(1000);
    }
    
    /**
     * Create progress overlay UI
     */
    createProgressOverlay() {
        this.progressOverlay = document.createElement('div');
        this.progressOverlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.95);
            border-radius: 12px;
            padding: 20px 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            min-width: 300px;
            text-align: center;
            backdrop-filter: blur(10px);
        `;
        
        this.progressOverlay.innerHTML = `
            <div style="font-size: 18px; font-weight: 600; color: #333; margin-bottom: 15px;">
                🧠 Optimizing Meeting Point
            </div>
            <div style="background: #f0f0f0; border-radius: 10px; height: 8px; overflow: hidden; margin-bottom: 10px;">
                <div id="progress-bar" style="background: linear-gradient(90deg, #4CAF50, #2196F3); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <div id="progress-text" style="font-size: 14px; color: #666;">Initializing...</div>
        `;
        
        document.body.appendChild(this.progressOverlay);
    }
    
    /**
     * Update progress overlay
     */
    updateProgress(text, percentage) {
        if (!this.progressOverlay) return;
        
        const progressBar = this.progressOverlay.querySelector('#progress-bar');
        const progressText = this.progressOverlay.querySelector('#progress-text');
        
        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = text;
    }
    
    /**
     * Hide progress overlay
     */
    hideProgressOverlay() {
        if (this.progressOverlay) {
            this.progressOverlay.style.opacity = '0';
            setTimeout(() => {
                if (this.progressOverlay && this.progressOverlay.parentNode) {
                    this.progressOverlay.parentNode.removeChild(this.progressOverlay);
                }
                this.progressOverlay = null;
            }, 300);
        }
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
        
        // Hide progress overlay
        this.hideProgressOverlay();
    }
    
    /**
     * Generate mock venues for visualization
     */
    generateMockVenues(candidate) {
        const venueTypes = ['Restaurant', 'Cafe', 'Shopping Mall', 'Food Court'];
        const venues = [];
        
        for (let i = 0; i < 5 + Math.floor(Math.random() * 10); i++) {
            venues.push({
                name: `${venueTypes[Math.floor(Math.random() * venueTypes.length)]} ${i + 1}`,
                rating: 3.5 + Math.random() * 1.5,
                vicinity: 'Near optimal meeting point'
            });
        }
        
        return venues;
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