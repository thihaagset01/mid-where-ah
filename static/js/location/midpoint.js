/**
 * midpoint.js - Midpoint calculation functionality for MidWhereAh
 * Handles calculation of central meeting points based on multiple locations
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
     * Handle the find central location button click
     */
    // Update handleFindCentralLocation() method
    async handleFindCentralLocation() {
        const findCentralBtn = document.getElementById('find-central-btn');
        const originalContent = findCentralBtn ? findCentralBtn.innerHTML : null;
        
        if (findCentralBtn) {
            findCentralBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Optimizing...';
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

            // Use the sophisticated optimizer instead of basic midpoint
            const result = await window.meetingPointOptimizer.findOptimalMeetingPoint(users);
            
            if (result) {
                this.displayOptimalPoint(result);
                // Show success with algorithm details
                console.log(`🎯 Optimization: ${(result.fairness * 100).toFixed(1)}% fair, ${result.venues.length} venues, ${result.metadata.duration}ms`);
            }

        } catch (error) {
            console.error('❌ Optimization error:', error);
            // Fallback to basic geometric midpoint
            this.fallbackToBasicMidpoint();
        } finally {
            // Restore button
            if (findCentralBtn && originalContent) {
                findCentralBtn.innerHTML = originalContent;
                findCentralBtn.style.pointerEvents = 'auto';
            }
        }
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
                    transportMode: window.userTransportModes.get(locationId) || 'TRANSIT',
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
    }/**
     * Display optimal point (HOME PAGE VERSION)
     */
    displayOptimalPoint(result) {
        // Clear existing midpoint marker
        if (this.midpointMarker) {
            this.midpointMarker.setMap(null);
        }

        // Check if we have a map
        if (!window.map) {
            console.error('No map available to display optimal point');
            return;
        }

        // Determine if this is truly optimized or fallback
        const isOptimal = result.metadata && !result.metadata.fallbackUsed;
        const color = isOptimal ? '#2E7D32' : '#FF9800'; // Green for optimal, orange for fallback
        
        // Create enhanced marker
        this.midpointMarker = new google.maps.Marker({
            position: result.point,
            map: window.map,
            title: isOptimal ? 
                `Optimized Meeting Point (${(result.fairness * 100).toFixed(1)}% fair)` : 
                'Basic Meeting Point',
            animation: google.maps.Animation.DROP,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: isOptimal ? 18 : 15
            }
        });

        // Create detailed info window
        const travelInfo = result.times ? result.times.map((time, i) => 
            `<li>Person ${i + 1}: ${Math.round(time)} min</li>`
        ).join('') : '<li>Travel times not calculated</li>';

        const venueInfo = result.venues && result.venues.length > 0 ? 
            result.venues.slice(0, 3).map(v => `
                <div style="margin-bottom: 4px;">
                    <strong>${v.name}</strong> ⭐ ${v.rating || 'N/A'}
                </div>
            `).join('') : '<div style="color: #666;">No venues found nearby</div>';

        const infoContent = `
            <div class="optimal-point-info" style="max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <h4 style="color: ${color}; margin: 0 0 12px 0; font-size: 16px;">
                    ${isOptimal ? '🎯 Optimized' : '📍 Basic'} Meeting Point
                </h4>
                
                ${isOptimal && result.fairness ? `
                    <div class="optimization-stats" style="margin-bottom: 12px; font-size: 13px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span><strong>Fairness Score:</strong></span>
                            <span style="color: ${color}; font-weight: 500;">${(result.fairness * 100).toFixed(1)}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span><strong>Time Range:</strong></span>
                            <span>${Math.round(result.timeRange || 0)} min</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span><strong>Avg Travel:</strong></span>
                            <span>${Math.round(result.avgTime || 0)} min</span>
                        </div>
                        ${result.metadata?.duration ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span><strong>Algorithm:</strong></span>
                            <span style="font-size: 11px; color: #666;">${Math.round(result.metadata.duration)}ms</span>
                        </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="travel-times" style="margin-bottom: 12px;">
                    <h5 style="margin: 0 0 6px 0; font-size: 13px; color: #333;">🚶 Travel Times:</h5>
                    <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #555;">
                        ${travelInfo}
                    </ul>
                </div>
                
                ${result.venues && result.venues.length > 0 ? `
                    <div class="venues-info" style="margin-bottom: 12px;">
                        <h5 style="margin: 0 0 6px 0; font-size: 13px; color: #333;">📍 Nearby Venues:</h5>
                        <div style="font-size: 12px;">
                            ${venueInfo}
                        </div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="window.midpointCalculator.shareLocation()" 
                            style="background: ${color}; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 8px;">
                        📤 Share Location
                    </button>
                    <button onclick="window.midpointCalculator.exploreArea()" 
                            style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        🔍 Explore Area
                    </button>
                </div>
            </div>
        `;

        const infoWindow = new google.maps.InfoWindow({ 
            content: infoContent,
            maxWidth: 350
        });

        this.midpointMarker.addListener('click', () => {
            infoWindow.open(window.map, this.midpointMarker);
        });

        // Auto-open the info window to show results
        setTimeout(() => {
            infoWindow.open(window.map, this.midpointMarker);
        }, 800);

        // Center map on optimal point
        window.map.panTo(result.point);
        window.map.setZoom(15);

        // Store result for other methods
        this.lastOptimalResult = result;
        
        console.log('✅ Displayed optimal point:', {
            fairness: result.fairness ? `${(result.fairness * 100).toFixed(1)}%` : 'N/A',
            venues: result.venues?.length || 0,
            source: result.source || 'unknown',
            isOptimal: isOptimal
        });
    }

    /**
     * Fallback to basic geometric midpoint
     */
    fallbackToBasicMidpoint() {
        console.log('🔄 Using fallback to basic midpoint...');
        
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

        // Create a basic result object
        const basicResult = {
            point: midpoint,
            times: [], // Empty - no travel time calculation
            venues: [],
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

        this.displayOptimalPoint(basicResult);
        this.showInfoMessage('⚠️ Using basic midpoint - optimization not available');
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
     * Explore area around the optimal point
     */
    exploreArea() {
        if (!this.lastOptimalResult) {
            this.showErrorMessage('No meeting point to explore');
            return;
        }
    
        const point = this.lastOptimalResult.point;
        const venues = this.lastOptimalResult.venues || [];
    
        console.log('🔍 Exploring area from home page...');
    
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
            source: 'home_page',
            fairness: this.lastOptimalResult.fairness,
            avgTime: this.lastOptimalResult.avgTime,
            timeRange: this.lastOptimalResult.timeRange
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
}

// Create global instance
window.midpointCalculator = new MidpointCalculator();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize midpoint calculator
    window.midpointCalculator.init();
});
