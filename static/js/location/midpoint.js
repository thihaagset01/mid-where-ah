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
        this.routeMarkers = [];
        
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
                        
                        // Show minimal marker on map (no popup)
                        this.showMinimalMarker(result);
                        
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
            
            // Also clear any existing markers
            if (this.routeMarkers) {
                this.routeMarkers.forEach(marker => marker.setMap(null));
                this.routeMarkers = [];
            }
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
        
        // Directions Button - Now shows all routes directly
        const directionsBtn = document.createElement('button');
        directionsBtn.innerHTML = `
            <i class="fas fa-route"></i>
            <span>Show Routes</span>
        `;
        directionsBtn.className = 'floating-action-btn directions-btn';
        directionsBtn.onclick = () => this.showAllRoutesToMeetingPoint(result.point);
        
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
     * Show routes from all user locations to the meeting point
     */
    showAllRoutesToMeetingPoint(destination) {
        // Clear any existing directions
        this.clearDirections();
        
        // Get all user locations
        const locations = this.getAllLocationData();
        if (!locations || locations.length === 0) {
            this.showErrorMessage('No user locations found');
            return;
        }
        
        // Show loading state
        this.showInfoMessage('Calculating routes...');
        
        // Create a DirectionsService instance
        const directionsService = new google.maps.DirectionsService();
        let routesDrawn = 0;
        const totalRoutes = locations.filter(loc => loc.lat && loc.lng).length;
        
        // Calculate and display route for each user
        locations.forEach((location, index) => {
            // Skip if location doesn't have coordinates
            if (!location.lat || !location.lng) return;
            
            // Get transport mode for this user (default to DRIVING if not set)
            const transportMode = window.userTransportModes?.get(`person-${index+1}`) || 'DRIVING';
            
            const request = {
                origin: { lat: parseFloat(location.lat), lng: parseFloat(location.lng) },
                destination: { lat: destination.lat, lng: destination.lng },
                travelMode: google.maps.TravelMode[transportMode],
                provideRouteAlternatives: false
            };
            
            // Calculate and display route
            directionsService.route(request, (response, status) => {
                if (status === 'OK') {
                    // Create a new renderer for this route
                    const routeRenderer = new google.maps.DirectionsRenderer({
                        suppressMarkers: true,
                        polylineOptions: {
                            strokeColor: this.getRouteColor(index),
                            strokeOpacity: 0.7,
                            strokeWeight: 4
                        },
                        preserveViewport: true
                    });
                    
                    routeRenderer.setMap(window.map);
                    routeRenderer.setDirections(response);
                    this.directionsRenderers.push(routeRenderer);
                    
                    // Add custom markers for origin and destination
                    this.addRouteMarkers(
                        response.routes[0].legs[0].start_location,
                        response.routes[0].legs[0].end_location,
                        index,
                        response.routes[0].legs[0].duration.text
                    );
                    
                    // Check if all routes are drawn
                    routesDrawn++;
                    if (routesDrawn === totalRoutes) {
                        this.showSuccessMessage('All routes displayed');
                        
                        // Fit map to show all routes
                        this.fitMapToRoutes();
                    }
                }
            });
        });
    }
    
    /**
     * Fit map to show all routes
     */
    fitMapToRoutes() {
        if (!this.directionsRenderers || this.directionsRenderers.length === 0) return;
        
        const bounds = new google.maps.LatLngBounds();
        
        // Extend bounds for each route
        this.directionsRenderers.forEach(renderer => {
            const route = renderer.getDirections();
            if (route && route.routes && route.routes[0]) {
                route.routes[0].legs.forEach(leg => {
                    if (leg.start_location) bounds.extend(leg.start_location);
                    if (leg.end_location) bounds.extend(leg.end_location);
                });
            }
        });
        
        // Only fit bounds if we have valid bounds
        if (!bounds.isEmpty()) {
            window.map.fitBounds(bounds);
            
            // Add some padding and set max zoom level
            const padding = 100; // pixels
            window.map.panToBounds(bounds, {
                top: padding,
                bottom: padding,
                left: padding,
                right: padding
            });
            
            // Set a maximum zoom level to prevent over-zooming
            const listener = google.maps.event.addListener(window.map, 'bounds_changed', function() {
                if (this.getZoom() > 12) {
                    this.setZoom(12);
                }
                google.maps.event.removeListener(listener);
            });
        }
    }

    /**
     * Get a color for the route based on index
     */
    getRouteColor(index) {
        const colors = [
            '#8B5DB8', // Purple
            '#4285F4', // Blue
            '#34A853', // Green
            '#EA4335', // Red
            '#FBBC05', // Yellow
            '#FF6D01', // Orange
            '#46BDC6'  // Teal
        ];
        return colors[index % colors.length];
    }
    
    /**
     * Add custom markers for route start and end points
     */
    addRouteMarkers(start, end, index, duration) {
        // Add start marker (user location)
        new google.maps.Marker({
            position: start,
            map: window.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: this.getRouteColor(index),
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: 'white'
            },
            label: {
                text: (index + 1).toString(),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '10px'
            },
            title: `Person ${index + 1} (${duration} to destination)`
        });
        
        // Add end marker (meeting point) - only once
        if (index === 0) {
            const marker = new google.maps.Marker({
                position: end,
                map: window.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#8B5DB8',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: 'white'
                },
                label: {
                    text: '★',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                },
                title: 'Meeting Point'
            });
            
            // Add info window for meeting point
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="font-weight: 500; margin-bottom: 8px;">Meeting Point</div>
                    <div style="color: #666; font-size: 13px;">
                        ${end.lat().toFixed(6)}, ${end.lng().toFixed(6)}
                    </div>
                `
            });
            
            // Show info window when clicking on the marker
            marker.addListener('click', () => {
                infoWindow.open({
                    anchor: marker,
                    map: window.map
                });
            });
        }
    }
    
    /**
     * Go to venues swipe interface
     */
    goToVenuesInterface(result) {
        console.log('🏪 Going to venues interface');
        
        // Store result for venue interface
        sessionStorage.setItem('optimizationResult', JSON.stringify(result));
        sessionStorage.setItem('venueSearchPoint', JSON.stringify(result.point));
        
        // Navigate to temp venues page for homepage users
        window.location.href = '/mobile/venues/temp';
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
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Show success message
     */
    showSuccessMessage(message) {
        console.log('🎉', message);
        
        // Try to use existing notification system
        if (window.uiManager && window.uiManager.showSuccessNotification) {
            window.uiManager.showSuccessNotification(message);
        } else if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        } else {
            // Fallback to console
            console.log(message);
        }
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