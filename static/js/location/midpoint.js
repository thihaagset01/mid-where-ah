/**
 * midpoint.js - Midpoint calculation functionality for MidWhereAh
 * Handles calculation of central meeting points based on multiple locations
 * STREAMLINED VERSION - Goes directly to venues after calculation
 */

class MidpointCalculator {
    constructor() {
        // Store directionsRenderers for cleanup
        this.directionsRenderers = [];
        this.midpointMarker = null;
        
        console.log('MidpointCalculator initialized');
    }
    
    /**
     * Initialize midpoint calculator
     */
    init() {
        this.setupFindCentralButton();
        return this;
    }
    
    /**
     * Set up the find central location button
     */
    setupFindCentralButton() {
        const findCentralBtn = document.getElementById('find-central-btn');
        
        if (findCentralBtn) {
            findCentralBtn.addEventListener('click', () => {
                this.handleFindCentralLocation();
            });
            
            // Initial check
            this.updateFindButtonState();
        }
    }
    
    /**
     * Update the find button state based on valid locations
     */
    updateFindButtonState() {
        const findCentralBtn = document.getElementById('find-central-btn');
        if (!findCentralBtn) return;
        
        const locationData = this.getAllLocationData();
        const validLocations = locationData.filter(loc => loc.isValid);
        
        if (validLocations.length >= 2) {
            findCentralBtn.classList.remove('disabled');
            findCentralBtn.disabled = false;
        } else {
            findCentralBtn.classList.add('disabled');
            findCentralBtn.disabled = true;
        }
    }
    
    /**
     * Handle the find central location button click - STREAMLINED VERSION
     */
    async handleFindCentralLocation() {
        const findCentralBtn = document.getElementById('find-central-btn');
        const originalContent = findCentralBtn ? findCentralBtn.innerHTML : null;
        
        if (findCentralBtn) {
            findCentralBtn.innerHTML = '<i class="fas fa-brain fa-pulse"></i> Analyzing...';
            findCentralBtn.style.pointerEvents = 'none';
        }
    
        try {
            // Get locations from your LocationManager
            const locationData = this.getAllLocationData();
            const validLocations = locationData.filter(loc => loc.isValid);
            
            if (validLocations.length < 2) {
                this.showErrorMessage('Please add at least 2 valid locations');
                return;
            }
    
            // Convert to optimizer format
            const users = validLocations.map(loc => ({
                lat: loc.lat,
                lng: loc.lng,
                mode: loc.transportMode || 'TRANSIT',
                weight: 1.0,
                name: `Person ${loc.personId}`
            }));
    
            // Initialize visualizer if not exists
            if (!window.algorithmVisualizer && window.map) {
                window.algorithmVisualizer = new window.AlgorithmVisualizer(window.map);
            }
    
            // Check if user wants to see visualization (you can make this a setting)
            const showVisualization = true; // Set to false to disable visualization
            
            if (showVisualization && window.algorithmVisualizer) {
                console.log('🎬 Starting algorithm visualization');
                
                // Update button to show visualization is running
                if (findCentralBtn) {
                    findCentralBtn.innerHTML = '<i class="fas fa-eye fa-pulse"></i> Watch Algorithm...';
                }
                
                // Run visualization (this will also compute the actual result)
                window.algorithmVisualizer.visualizeOptimization(users, (result) => {
                    // Visualization complete callback
                    if (result) {
                        // Store the result
                        this.lastOptimalResult = result;
                        
                        // Show success message
                        this.showSuccessToast(`Found ${result.venues?.length || 0} venues • ${(result.fairness * 100).toFixed(1)}% fairness`);
                        
                        // Show post-optimization actions
                        this.showPostOptimizationActions(result);
                        
                        console.log(`🎯 Optimization: ${(result.fairness * 100).toFixed(1)}% fair, ${result.venues?.length || 0} venues`);
                    } else {
                        // Fallback if visualization fails
                        this.fallbackToBasicMidpointWithVenues();
                    }
                    
                    // Restore button
                    if (findCentralBtn && originalContent) {
                        setTimeout(() => {
                            findCentralBtn.innerHTML = originalContent;
                            findCentralBtn.style.pointerEvents = 'auto';
                        }, 1000);
                    }
                });
                
            } else {
                // Run optimization without visualization (original behavior)
                console.log('🚀 Running optimization without visualization');
                
                const result = await window.meetingPointOptimizer.findOptimalMeetingPoint(users);
                
                if (result) {
                    // Show brief success message
                    this.showSuccessToast(`Found ${result.venues?.length || 0} venues • ${(result.fairness * 100).toFixed(1)}% fairness`);
                    
                    // Show minimal marker on map (no popup)
                    this.showMinimalMarker(result);
                    
                    // Show post-optimization actions
                    this.showPostOptimizationActions(result);
                    
                    console.log(`🎯 Optimization: ${(result.fairness * 100).toFixed(1)}% fair, ${result.venues.length} venues, ${result.metadata.duration}ms`);
                } else {
                    throw new Error('Optimization returned no result');
                }
            }
    
        } catch (error) {
            console.error('❌ Optimization error:', error);
            // Fallback to basic midpoint with venues
            this.fallbackToBasicMidpointWithVenues();
            
            // Restore button
            if (findCentralBtn && originalContent) {
                findCentralBtn.innerHTML = originalContent;
                findCentralBtn.style.pointerEvents = 'auto';
            }
        }
    }
    
    /**
     * Show minimal marker without popup
     */
    showMinimalMarker(result) {
        // Clear existing midpoint marker
        if (this.midpointMarker) {
            this.midpointMarker.setMap(null);
        }

        if (!window.map) return;

        const isOptimal = result.metadata && !result.metadata.fallbackUsed;
        const color = isOptimal ? '#2E7D32' : '#FF9800';
        
        // Create minimal marker
        this.midpointMarker = new google.maps.Marker({
            position: result.point,
            map: window.map,
            title: `Meeting Point • ${result.venues?.length || 0} venues nearby`,
            animation: google.maps.Animation.DROP,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 15
            }
        });

        // Center map on optimal point
        window.map.panTo(result.point);
        window.map.setZoom(15);

        // Store result for other methods
        this.lastOptimalResult = result;
    }

    /**
     * Go directly to venues page
     */
    goDirectlyToVenues(result) {
        const point = result.point;
        const venues = result.venues || [];

        console.log('🚀 Going directly to venues...');

        // Store venues data in sessionStorage for temp venues page
        const tempSession = {
            midpoint: point,
            venues: venues.map(v => ({
                ...v,
                // Ensure we have the necessary properties for the venue card
                name: v.name || 'Unnamed Venue',
                vicinity: v.vicinity || v.formatted_address || 'No address available',
                rating: v.rating || 0,
                price_level: v.price_level || 0,
                photos: v.photos || [],
                geometry: v.geometry || { location: point }
            })),
            locationData: this.getAllLocationData().filter(loc => loc.isValid),
            timestamp: Date.now(),
            source: 'home_page_direct',
            fairness: result.fairness,
            avgTime: result.avgTime,
            timeRange: result.timeRange,
            // Add direct navigation flag
            directNavigation: true
        };

        try {
            // Store the data in sessionStorage
            sessionStorage.setItem('tempVenues', JSON.stringify(tempSession));
            
            // Navigate to the temp venues page
            window.location.href = '/mobile/venues/temp';
        } catch (error) {
            console.error('Error saving session data:', error);
            this.showErrorMessage('Failed to load venues. Please try again.');
        }
    }

    /**
     * Fallback with venues
     */
    fallbackToBasicMidpointWithVenues() {
        console.log('🔄 Using fallback to basic midpoint with venue search...');
        
        const locationData = this.getAllLocationData();
        const validLocations = locationData.filter(loc => loc.isValid);
        
        if (validLocations.length === 0) {
            this.showErrorMessage('No valid locations available');
            return;
        }

        // Calculate basic geometric midpoint
        const midpoint = this.calculateGeometricMidpoint(validLocations);
        
        if (!midpoint) {
            this.showErrorMessage('Could not calculate meeting point');
            return;
        }

        // Search for venues around the basic midpoint
        this.searchVenuesAroundPoint(midpoint).then(venues => {
            const basicResult = {
                point: midpoint,
                times: [],
                venues: venues,
                score: 0,
                fairness: 0,
                avgTime: 0,
                timeRange: 0,
                source: 'geometric_fallback',
                metadata: {
                    fallbackUsed: true,
                    duration: 0
                }
            };

            this.showSuccessToast(`Found ${venues.length} venues • Basic midpoint`);
            
            this.showMinimalMarker(basicResult);
            
            setTimeout(() => {
                this.goDirectlyToVenues(basicResult);
            }, 1500);
            
        }).catch(error => {
            console.error('Venue search failed:', error);
            this.showErrorMessage('Could not find venues nearby');
        });
    }

    /**
     * Search for venues around a point
     */
    searchVenuesAroundPoint(point) {
        return new Promise((resolve, reject) => {
            if (!window.google?.maps?.places?.PlacesService) {
                reject(new Error('Places service not available'));
                return;
            }

            const service = new google.maps.places.PlacesService(window.map);
            
            const request = {
                location: point,
                radius: 1000, // 1km radius
                type: ['restaurant', 'cafe', 'food'],
                keyword: 'restaurant cafe food'
            };

            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    // Sort by rating and limit to top venues
                    const sortedVenues = results
                        .filter(place => place.rating && place.rating > 3.0)
                        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                        .slice(0, 20);
                    
                    resolve(sortedVenues);
                } else {
                    resolve([]); // Return empty array if no venues found
                }
            });
        });
    }

    /**
     * Show success toast notification
     */
    showSuccessToast(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 12px 24px;
            border-radius: 25px;
            box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
            transition: all 0.3s ease;
            max-width: 90vw;
            text-align: center;
        `;
        
        toast.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 8px;"></i>${message}`;
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * Create a group with the given locations and midpoint
     */
    createGroupWithLocations(locations, midpoint) {
        // Check if user is authenticated
        const user = firebase.auth().currentUser;
        if (!user) {
            if (window.uiManager) {
                window.uiManager.showErrorNotification('Please sign in to create a group');
            }
            return;
        }
        
        // Generate a random group name
        const groupName = `Meetup ${new Date().toLocaleDateString()}`;
        
        // Create group in Firestore
        const groupData = {
            name: groupName,
            createdBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [user.uid],
            midpoint: {
                lat: midpoint.lat,
                lng: midpoint.lng
            },
            inviteCode: this.generateInviteCode(),
            status: 'active'
        };
        
        firebase.firestore().collection('groups').add(groupData)
            .then(groupRef => {
                const groupId = groupRef.id;
                console.log('Created group:', groupId);
                
                // Add locations to the group
                const locationPromises = locations.map(location => {
                    return firebase.firestore().collection('groups').doc(groupId)
                        .collection('locations').add({
                            userId: user.uid,
                            name: location.name || 'Unknown location',
                            lat: location.lat,
                            lng: location.lng,
                            transportMode: location.transportMode || 'TRANSIT',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                });
                
                return Promise.all(locationPromises).then(() => groupId);
            })
            .then(groupId => {
                // Redirect to the group page
                window.location.href = `/group/${groupId}`;
            })
            .catch(error => {
                console.error('Error creating group:', error);
                if (window.uiManager) {
                    window.uiManager.showErrorNotification('Error creating group: ' + error.message);
                }
            });
    }
    
    /**
     * Generate a random 6-character invite code
     */
    generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    /**
     * Get all location data from the LocationManager
     */
    getAllLocationData() {
        // If using LocationManager
        if (window.LocationModule && window.locationManager) {
            const locations = [];
            
            window.locationManager.locations.forEach((locationInput, personId) => {
                if (locationInput.isValid()) {
                    locations.push({
                        personId: personId,
                        lat: locationInput.lat,
                        lng: locationInput.lng,
                        name: locationInput.address,
                        transportMode: locationInput.transportMode,
                        isValid: true
                    });
                } else {
                    locations.push({
                        personId: personId,
                        isValid: false
                    });
                }
            });
            
            return locations;
        }
        
        // NEW: Check for LocationInputEnhancers (homepage)
        if (window.locationInputEnhancers) {
            const locations = [];
            
            window.locationInputEnhancers.forEach((enhancer, inputId) => {
                const personId = enhancer.personId;
                
                if (enhancer.state.isValid && enhancer.state.position) {
                    locations.push({
                        personId: personId,
                        lat: enhancer.state.position.lat(),
                        lng: enhancer.state.position.lng(),
                        name: enhancer.state.address,
                        transportMode: enhancer.state.transportMode,
                        isValid: true
                    });
                } else {
                    locations.push({
                        personId: personId,
                        isValid: false
                    });
                }
            });
            
            return locations;
        }
        
        // Legacy fallback
        const locations = [];
        if (!window.locationData) return locations;
        
        window.locationData.forEach((data, locationId) => {
            if (data.lat && data.lng) {
                const personId = locationId.replace('location-', '');
                locations.push({
                    personId: personId,
                    lat: data.lat,
                    lng: data.lng,
                    name: data.address,
                    transportMode: window.userTransportModes?.get(locationId) || 'TRANSIT',
                    isValid: true
                });
            } else {
                const personId = locationId.replace('location-', '');
                locations.push({
                    personId: personId,
                    isValid: false
                });
            }
        });
        
        return locations;
    }
    
    /**
     * Calculate the geometric midpoint of multiple locations
     */
    calculateGeometricMidpoint(locations) {
        if (locations.length === 0) return null;
        
        let totalLat = 0;
        let totalLng = 0;
        let validCount = 0;
        
        locations.forEach(location => {
            if (location.lat && location.lng) {
                totalLat += location.lat;
                totalLng += location.lng;
                validCount++;
            }
        });
        
        if (validCount === 0) return null;
        
        return {
            lat: totalLat / validCount,
            lng: totalLng / validCount
        };
    }
    
    /**
     * Calculate social midpoint (weighted by transport mode)
     * More complex algorithm that considers transport modes
     */
    calculateSocialMidpoint(locations) {
        if (locations.length === 0) return null;
        
        // Assign weights based on transport mode
        const weights = {
            'TRANSIT': 1.0,  // Public transport gets normal weight
            'DRIVING': 0.8,  // Driving is easier so gets less weight
            'WALKING': 1.5   // Walking is harder so gets more weight
        };
        
        let totalLat = 0;
        let totalLng = 0;
        let totalWeight = 0;
        
        locations.forEach(location => {
            if (location.lat && location.lng) {
                const weight = weights[location.transportMode] || 1.0;
                totalLat += location.lat * weight;
                totalLng += location.lng * weight;
                totalWeight += weight;
            }
        });
        
        if (totalWeight === 0) return null;
        
        return {
            lat: totalLat / totalWeight,
            lng: totalLng / totalWeight
        };
    }
    
    /**
     * Clear all directions renderers
     */
    clearDirections() {
        if (this.directionsRenderers) {
            this.directionsRenderers.forEach(renderer => {
                renderer.setMap(null);
            });
            this.directionsRenderers = [];
        }
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        console.error('❌', message);
        
        // Try to use existing notification system
        if (window.uiManager && window.uiManager.showErrorNotification) {
            window.uiManager.showErrorNotification(message);
        } else if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            // Fallback to alert
            alert('Error: ' + message);
        }
    }

    /**
     * Show info message
     */
    showInfoMessage(message) {
        console.log('ℹ️', message);
        
        // Try to use existing notification system
        if (window.uiManager && window.uiManager.showInfoNotification) {
            window.uiManager.showInfoNotification(message);
        } else if (typeof showNotification === 'function') {
            showNotification(message, 'info');
        } else {
            // Fallback to console
            console.log(message);
        }
    }

    /**
     * Share location (HOME PAGE appropriate - no group creation)
     */
    shareLocation() {
        if (!this.lastOptimalResult) {
            this.showErrorMessage('No meeting point to share');
            return;
        }
    
        const point = this.lastOptimalResult.point;
        const fairnessText = this.lastOptimalResult.fairness ? 
            ` (${(this.lastOptimalResult.fairness * 100).toFixed(1)}% fairness)` : '';
        
        // Create shareable Google Maps link
        const googleMapsUrl = `https://www.google.com/maps?q=${point.lat},${point.lng}`;
        const shareText = `Let's meet here!${fairnessText}\n${googleMapsUrl}`;
    
        // Try to use Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'Meeting Point - MidWhereAh',
                text: shareText,
                url: googleMapsUrl
            }).catch(err => {
                console.log('Error sharing:', err);
                this.fallbackShare(shareText);
            });
        } else {
            this.fallbackShare(shareText);
        }
    }
    
    /**
     * Fallback sharing method
     */
    fallbackShare(text) {
        // Copy to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showInfoMessage('📋 Meeting point copied to clipboard!');
            }).catch(() => {
                // Show shareable text in alert as last resort
                prompt('Copy this meeting point:', text);
            });
        } else {
            // Show shareable text in prompt for older browsers
            prompt('Copy this meeting point:', text);
        }
    }

    /**
     * Explore area around the optimal point (LEGACY - kept for compatibility)
     */
    exploreArea() {
        if (!this.lastOptimalResult) {
            this.showErrorMessage('No meeting point to explore');
            return;
        }
    
        // Just redirect to venues directly now
        this.goDirectlyToVenues(this.lastOptimalResult);
    }

    /**
     * Show post-optimization actions
     */
    showPostOptimizationActions(result) {
        // Create floating action buttons container
        let actionsContainer = document.getElementById('post-optimization-actions');
        
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.id = 'post-optimization-actions';
            actionsContainer.style.cssText = `
                position: fixed;
                bottom: 80px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
                z-index: 1000;
            `;
            document.body.appendChild(actionsContainer);
        }
        
        // Clear existing buttons
        actionsContainer.innerHTML = '';
        
        // Venues Button
        const venuesBtn = document.createElement('button');
        venuesBtn.innerHTML = `
            <i class="fas fa-utensils"></i>
            <span>Find Venues</span>
        `;
        venuesBtn.className = 'floating-action-btn venues-btn';
        venuesBtn.onclick = () => this.goToVenuesInterface(result);
        
        // Directions Button
        const directionsBtn = document.createElement('button');
        directionsBtn.innerHTML = `
            <i class="fas fa-directions"></i>
            <span>Get Directions</span>
        `;
        directionsBtn.className = 'floating-action-btn directions-btn';
        directionsBtn.onclick = () => this.showDirectionsOptions(result);
        
        // Share Button
        const shareBtn = document.createElement('button');
        shareBtn.innerHTML = `<i class="fas fa-share-alt"></i>`;
        shareBtn.className = 'floating-action-btn share-btn';
        shareBtn.title = 'Share Location';
        shareBtn.onclick = () => this.shareLocation();
        
        actionsContainer.appendChild(venuesBtn);
        actionsContainer.appendChild(directionsBtn);
        actionsContainer.appendChild(shareBtn);
        
        // Add CSS for buttons
        this.addActionButtonStyles();
        
        // Animate buttons in
        setTimeout(() => {
            actionsContainer.classList.add('show');
        }, 500);
    }
    
    /**
     * Go to venues swipe interface
     */
    goToVenuesInterface(result) {
        console.log('🏪 Going to venues interface');
        
        // Store result for venue interface
        sessionStorage.setItem('optimizationResult', JSON.stringify(result));
        sessionStorage.setItem('venueSearchPoint', JSON.stringify(result.point));
        
        // Navigate to swipe interface
        window.location.href = '/swipe?point=' + encodeURIComponent(JSON.stringify(result.point));
    }
    
    /**
     * Show directions options
     */
    showDirectionsOptions(result) {
        // Create modal for directions choice
        const modal = document.createElement('div');
        modal.className = 'directions-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 320px;
                width: 90%;
                text-align: center;
            ">
                <h3 style="margin: 0 0 20px 0; color: #333;">Get Directions</h3>
                
                <button class="direction-option-btn" onclick="window.openMapsDirections('${result.point.lat}', '${result.point.lng}', 'Meeting Point')">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <div class="option-title">To Meeting Point</div>
                        <div class="option-subtitle">Navigate to optimal location</div>
                    </div>
                </button>
                
                <button class="direction-option-btn" onclick="window.showVenueDirections()">
                    <i class="fas fa-utensils"></i>
                    <div>
                        <div class="option-title">To Selected Venue</div>
                        <div class="option-subtitle">Pick a venue first</div>
                    </div>
                </button>
                
                <button class="direction-option-btn" onclick="window.showTransitOptions('${result.point.lat}', '${result.point.lng}')">
                    <i class="fas fa-subway"></i>
                    <div>
                        <div class="option-title">Public Transport</div>
                        <div class="option-subtitle">Best MRT/Bus routes</div>
                    </div>
                </button>
                
                <button style="
                    margin-top: 20px;
                    background: #f0f0f0;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    width: 100%;
                " onclick="this.parentElement.parentElement.remove()">
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles for direction options
        this.addDirectionModalStyles();
    }
    
    /**
     * Add CSS styles for action buttons
     */
    addActionButtonStyles() {
        if (document.getElementById('post-optimization-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'post-optimization-styles';
        styles.textContent = `
            .floating-action-btn {
                background: #8B5DB8;
                color: white;
                border: none;
                padding: 12px 16px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(139, 93, 184, 0.3);
                transition: all 0.3s ease;
                cursor: pointer;
                min-width: 120px;
                opacity: 0;
                transform: translateX(100px);
            }
            
            .floating-action-btn:hover {
                transform: scale(1.05) translateX(0);
                box-shadow: 0 6px 20px rgba(139, 93, 184, 0.4);
            }
            
            .floating-action-btn.venues-btn {
                background: #4CAF50;
            }
            
            .floating-action-btn.directions-btn {
                background: #2196F3;
            }
            
            .floating-action-btn.share-btn {
                background: #FF9800;
                min-width: 48px;
                border-radius: 50%;
                padding: 12px;
            }
            
            #post-optimization-actions.show .floating-action-btn {
                opacity: 1;
                transform: translateX(0);
            }
            
            #post-optimization-actions.show .floating-action-btn:nth-child(1) {
                transition-delay: 0.1s;
            }
            
            #post-optimization-actions.show .floating-action-btn:nth-child(2) {
                transition-delay: 0.2s;
            }
            
            #post-optimization-actions.show .floating-action-btn:nth-child(3) {
                transition-delay: 0.3s;
            }
            
            .direction-option-btn {
                width: 100%;
                padding: 16px;
                margin: 8px 0;
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 12px;
                display: flex;
                align-items: center;
                gap: 16px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .direction-option-btn:hover {
                background: #e9ecef;
                border-color: #8B5DB8;
            }
            
            .direction-option-btn i {
                font-size: 24px;
                color: #8B5DB8;
                width: 32px;
                text-align: center;
            }
            
            .option-title {
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }
            
            .option-subtitle {
                font-size: 12px;
                color: #666;
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Add direction modal styles
     */
    addDirectionModalStyles() {
        // Styles already added in addActionButtonStyles
    }
    
    // Global functions for directions
    static setupGlobalFunctions() {
        window.openMapsDirections = function(lat, lng, name) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${name}`;
            window.open(url, '_blank');
            
            // Close modal
            document.querySelector('.directions-modal')?.remove();
        };

        window.showVenueDirections = function() {
            const selectedVenue = sessionStorage.getItem('selectedVenue');
            if (selectedVenue) {
                const venue = JSON.parse(selectedVenue);
                window.openMapsDirections(venue.lat, venue.lng, venue.name);
            } else {
                alert('Please select a venue first from the venues page!');
                // Redirect to venues
                window.location.href = '/swipe';
            }
        };

        window.showTransitOptions = function(lat, lng) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;
            window.open(url, '_blank');
            
            // Close modal
            document.querySelector('.directions-modal')?.remove();
        };
    }
}

// Create global instance
window.midpointCalculator = new MidpointCalculator();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize midpoint calculator
    window.midpointCalculator.init();
    
    // Setup global functions for directions
    MidpointCalculator.setupGlobalFunctions();
});