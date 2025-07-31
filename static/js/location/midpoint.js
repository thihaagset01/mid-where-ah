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
    handleFindCentralLocation() {
        const locationData = this.getAllLocationData();
        const validLocations = locationData.filter(loc => loc.isValid);
        
        if (validLocations.length < 2) {
            if (window.uiManager) {
                window.uiManager.showErrorNotification('Please enter at least two valid locations');
            } else {
                console.error('Please enter at least two valid locations');
            }
            return;
        }
        
        // Clear previous directions and markers
        this.clearDirections();
        
        // Calculate midpoint
        const midpoint = this.calculateGeometricMidpoint(validLocations);
        
        // Show loading state
        const findCentralBtn = document.getElementById('find-central-btn');
        if (findCentralBtn) {
            const originalText = findCentralBtn.innerHTML;
            findCentralBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding...';
            findCentralBtn.disabled = true;
            
            // Reset button after delay
            setTimeout(() => {
                findCentralBtn.innerHTML = originalText;
                findCentralBtn.disabled = false;
            }, 3000);
        }
        
        // Add midpoint marker to the map
        if (window.map) {
            // Clear any existing midpoint markers
            if (this.midpointMarker) {
                this.midpointMarker.setMap(null);
            }
            
            // Create a new marker for the midpoint
            this.midpointMarker = new google.maps.Marker({
                position: midpoint,
                map: window.map,
                title: 'Midpoint',
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                },
                animation: google.maps.Animation.DROP
            });
            
            // Center the map on the midpoint
            window.map.setCenter(midpoint);
            
            // Optional: Show info window with midpoint coordinates
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="midpoint-info">
                        <h4>Central Meeting Point</h4>
                        <p>Latitude: ${midpoint.lat.toFixed(6)}</p>
                        <p>Longitude: ${midpoint.lng.toFixed(6)}</p>
                    </div>
                `
            });
            
            this.midpointMarker.addListener('click', () => {
                infoWindow.open(window.map, this.midpointMarker);
            });
            
            // Auto-open the info window
            infoWindow.open(window.map, this.midpointMarker);
            
            // If there's a search box, update it with the midpoint location
            if (window.searchBox) {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: midpoint }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        window.searchBox.value = results[0].formatted_address;
                    }
                });
            }
            
            // Show success message
            if (typeof showNotification === 'function') {
                showNotification('Central meeting point found!', 'success');
            } else {
                console.log('Central meeting point found!');
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
    }
}

// Create global instance
window.midpointCalculator = new MidpointCalculator();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize midpoint calculator
    window.midpointCalculator.init();
});
