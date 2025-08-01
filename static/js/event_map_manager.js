/**
 * event_map_manager.js - Event-specific UI and functionality for MidWhereAh
 * Handles ONLY event-related logic, uses MapManager for actual map operations
 * 
 * FIXED VERSION - Removes map initialization conflicts, focuses on event UI
 */

class EventMapManager {
    constructor() {
        // Event-specific properties
        this.eventData = null;
        this.groupMembers = [];
        this.memberLocations = [];
        this.userCurrentLocation = null;
        this.selectedVenue = null;
        this.isInitialized = false;
        
        // UI elements
        this.markers = [];
        this.midpointMarker = null;
        this.venueMarkers = [];
        
        // Map services - will be initialized when map is ready
        this.directionsRenderer = null;
        this.directionsService = null;
        this.placesService = null;
        this.geocoder = null;
        
        // Performance tracking
        this.performanceMetrics = {
            startTime: performance.now(),
            domContentLoaded: null,
            loadComplete: null,
            totalTime: null
        };
        
        console.log('EventMapManager created');
    }

    /**
     * Called by MapManager when map is ready
     */
    onMapReady(mapInstance) {
        console.log('EventMapManager received map instance');
        
        try {
            // Store reference to map (don't create our own)
            this.map = mapInstance;
            
            // Initialize map services using the provided map
            this.initializeMapServices();
            
            // Initialize event-specific functionality
            this.init();
            
        } catch (error) {
            console.error('Error in EventMapManager.onMapReady:', error);
            this.showMapError('Failed to initialize event map functionality');
        }
    }
    
    /**
     * Initialize map services (directions, places, etc.)
     */
    initializeMapServices() {
        if (!this.map) {
            throw new Error('Map instance not available');
        }
        
        // Initialize Google Maps services
        this.directionsService = new google.maps.DirectionsService();
        this.placesService = new google.maps.places.PlacesService(this.map);
        this.geocoder = new google.maps.Geocoder();
        
        // Set up directions renderer with custom styling
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#8B5DB8',
                strokeWeight: 5,
                strokeOpacity: 0.7
            }
        });
        this.directionsRenderer.setMap(this.map);
        
        console.log('✅ Map services initialized');
    }

    /**
     * Initialize event-specific functionality
     */
    async init() {
        if (this.isInitialized) {
            console.log('EventMapManager already initialized');
            return;
        }
        
        try {
            // Get URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('eventId');
            
            if (eventId) {
                await this.loadEventData(urlParams);
                this.setupEventMapInterface();
                await this.loadMemberLocations();
            }
            
            // Get user's current location
            await this.getUserCurrentLocation();
            
            this.isInitialized = true;
            console.log('EventMapManager initialized successfully');
            
            // Track performance metrics
            this.performanceMetrics.domContentLoaded = Math.round(performance.now() - this.performanceMetrics.startTime);
            
        } catch (error) {
            console.error('Error initializing EventMapManager:', error);
            this.showMapError('Failed to initialize event functionality');
        }
    }

    async loadEventData(urlParams) {
        this.eventData = {
            eventId: urlParams.get('eventId'),
            eventName: decodeURIComponent(urlParams.get('eventName') || 'Event'),
            eventDate: urlParams.get('eventDate'),
            eventTime: decodeURIComponent(urlParams.get('eventTime') || ''),
            groupId: urlParams.get('groupId')
        };

        const membersParam = urlParams.get('members');
        if (membersParam) {
            try {
                this.groupMembers = JSON.parse(decodeURIComponent(membersParam));
            } catch (error) {
                console.error('Error parsing members data:', error);
                this.groupMembers = [];
            }
        }
        
        console.log('Event data loaded:', this.eventData);
    }

    setupEventMapInterface() {
        // Update page title and event info
        document.title = `${this.eventData.eventName} - MidWhereAh`;
        
        const eventInfoContainer = document.getElementById('event-info-container');
        if (eventInfoContainer) {
            eventInfoContainer.innerHTML = `
                <div class="event-info-header">
                    <h3>${this.eventData.eventName}</h3>
                    <div class="event-meta">
                        <span><i class="fas fa-calendar"></i> ${this.eventData.eventDate}</span>
                        <span><i class="fas fa-clock"></i> ${this.eventData.eventTime}</span>
                        <span><i class="fas fa-users"></i> ${this.groupMembers.length} members</span>
                    </div>
                </div>
            `;
        }

        // Update back button to go to group chat
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.href = `/mobile/group_chat?groupId=${this.eventData.groupId}`;
        }

        // Add event-specific controls
        this.addEventControls();
        this.addMapLegend();
        this.addQuickActions();
    }

    addEventControls() {
        // Check if controls already exist
        if (document.querySelector('.event-map-controls')) return;
        
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'event-map-controls';
        controlsContainer.innerHTML = `
            <div class="control-buttons">
                <button id="refresh-locations" class="control-btn">
                    <i class="fas fa-sync-alt"></i> <span>Refresh</span>
                </button>
                <button id="find-central-btn" class="control-btn primary">
                    <i class="fas fa-location-arrow"></i> <span>Find Meeting Point</span>
                </button>
                <button id="find-venues" class="control-btn">
                    <i class="fas fa-search"></i> <span>Find Venues</span>
                </button>
                <button id="show-directions" class="control-btn">
                    <i class="fas fa-route"></i> <span>Directions</span>
                </button>
            </div>
        `;

        document.body.appendChild(controlsContainer);
        this.setupControlEventListeners();
    }

    setupControlEventListeners() {
        const refreshBtn = document.getElementById('refresh-locations');
        const findCentralBtn = document.getElementById('find-central-btn');
        const venuesBtn = document.getElementById('find-venues');
        const directionsBtn = document.getElementById('show-directions');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMemberLocations());
        }

        if (findCentralBtn) {
            findCentralBtn.addEventListener('click', () => this.calculateAndDisplayMidpoint());
        }

        if (venuesBtn) {
            venuesBtn.addEventListener('click', () => this.findNearbyVenues());
        }

        if (directionsBtn) {
            directionsBtn.addEventListener('click', () => this.showDirectionsToMidpoint());
        }
    }

    async getUserCurrentLocation() {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                });
            });

            this.userCurrentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Add current location marker if in Singapore bounds
            const sgBounds = {
                north: 1.48, south: 1.16,
                east: 104.1, west: 103.6
            };

            if (this.userCurrentLocation.lat >= sgBounds.south && 
                this.userCurrentLocation.lat <= sgBounds.north &&
                this.userCurrentLocation.lng >= sgBounds.west && 
                this.userCurrentLocation.lng <= sgBounds.east) {
                
                const marker = new google.maps.Marker({
                    position: this.userCurrentLocation,
                    map: this.map,
                    title: 'Your Current Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                        scale: 10
                    }
                });

                this.markers.push(marker);
                console.log('✅ Current location added to map');
            }
        } catch (error) {
            console.warn('Could not get current location:', error);
        }
    }

    async loadMemberLocations() {
        if (!this.groupMembers.length) {
            this.showInfoMessage('No group members found');
            return;
        }

        if (typeof firebase === 'undefined' || !firebase.firestore) {
            this.showErrorMessage('Firebase not available');
            return;
        }

        const db = firebase.firestore();
        const locations = [];

        this.showLoadingState('Loading member locations...');

        try {
            for (const member of this.groupMembers) {
                try {
                    const userDoc = await db.collection('users').doc(member.userId || member.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        if (userData.defaultLocation) {
                            locations.push({
                                name: userData.name || member.name,
                                address: userData.defaultLocation.address,
                                position: {
                                    lat: userData.defaultLocation.lat,
                                    lng: userData.defaultLocation.lng
                                },
                                uid: member.userId || member.uid
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error loading location for member ${member.name}:`, error);
                }
            }

            this.memberLocations = locations;
            this.hideLoadingState();

            if (locations.length === 0) {
                this.showInfoMessage('No member locations found. Members need to set their default locations.');
                return;
            }

            // Clear existing markers and add new ones
            this.clearMemberMarkers();
            this.addMemberMarkers();
            this.centerMapOnAllLocations();
            
            this.showSuccessMessage(`Loaded ${locations.length} member locations`);

        } catch (error) {
            this.hideLoadingState();
            this.showErrorMessage('Failed to load member locations');
            console.error('Error loading member locations:', error);
        }
    }

    addMemberMarkers() {
        this.memberLocations.forEach((location, index) => {
            const marker = new google.maps.Marker({
                position: location.position,
                map: this.map,
                title: `${location.name} - ${location.address}`,
                icon: {
                    url: `https://maps.google.com/mapfiles/ms/icons/${this.getMarkerColor(index)}-dot.png`
                }
            });

            // Add info window
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="marker-info">
                        <h4>${location.name}</h4>
                        <p>${location.address}</p>
                        <button onclick="window.eventMapManager.getDirectionsTo('${location.position.lat}', '${location.position.lng}')" class="info-btn">
                            <i class="fas fa-route"></i> Get Directions
                        </button>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);
        });
    }

    calculateAndDisplayMidpoint() {
        if (this.memberLocations.length < 2) {
            this.showInfoMessage('Need at least 2 member locations to calculate midpoint');
            return;
        }
        
        console.log('🔥 Calculating meeting point for', this.memberLocations.length, 'members');
        
        // Show loading state
        const findCentralBtn = document.getElementById('find-central-btn');
        const originalContent = findCentralBtn ? findCentralBtn.innerHTML : null;
        
        if (findCentralBtn) {
            findCentralBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            findCentralBtn.disabled = true;
        }

        try {
            // Calculate geometric midpoint
            const positions = this.memberLocations.map(loc => loc.position);
            const midpoint = this.calculateGeometricMidpoint(positions);

            // Remove existing midpoint marker
            if (this.midpointMarker) {
                this.midpointMarker.setMap(null);
            }

            // Add new midpoint marker
            this.midpointMarker = new google.maps.Marker({
                position: midpoint,
                map: this.map,
                title: `Meeting Point for ${this.memberLocations.length} People`,
                animation: google.maps.Animation.DROP,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#4CAF50',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    scale: 15
                }
            });

            // Add info window
            const midpointInfo = new google.maps.InfoWindow({
                content: `
                    <div class="marker-info">
                        <h4>Meeting Point</h4>
                        <p>Central location for all members</p>
                        <div class="info-actions">
                            <button onclick="window.eventMapManager.findNearbyVenues()" class="info-btn">
                                <i class="fas fa-search"></i> Find Venues
                            </button>
                            <button onclick="window.eventMapManager.shareLocation('${midpoint.lat}', '${midpoint.lng}')" class="info-btn">
                                <i class="fas fa-share-alt"></i> Share
                            </button>
                        </div>
                    </div>
                `
            });

            this.midpointMarker.addListener('click', () => {
                midpointInfo.open(this.map, this.midpointMarker);
            });

            // Stop animation after 2 seconds
            setTimeout(() => {
                if (this.midpointMarker) {
                    this.midpointMarker.setAnimation(null);
                }
            }, 2000);

            // Center map on midpoint
            this.map.panTo(midpoint);
            this.map.setZoom(14);
            
            this.showSuccessMessage('Meeting point calculated!');
            
        } catch (error) {
            console.error('Error calculating midpoint:', error);
            this.showErrorMessage('Could not calculate meeting point');
        } finally {
            // Restore button state
            if (findCentralBtn && originalContent) {
                findCentralBtn.innerHTML = originalContent;
                findCentralBtn.disabled = false;
            }
        }
    }

    calculateGeometricMidpoint(positions) {
        if (positions.length === 0) return null;

        let totalLat = 0;
        let totalLng = 0;

        positions.forEach(pos => {
            totalLat += pos.lat;
            totalLng += pos.lng;
        });

        return {
            lat: totalLat / positions.length,
            lng: totalLng / positions.length
        };
    }

    async findNearbyVenues() {
        if (!this.midpointMarker) {
            this.showInfoMessage('Please calculate meeting point first');
            return;
        }

        if (!this.placesService) {
            this.showErrorMessage('Places service not available');
            return;
        }
        
        this.showLoadingState('Finding nearby venues...');

        const request = {
            location: this.midpointMarker.getPosition(),
            radius: 1000,
            type: ['restaurant', 'cafe', 'food', 'meal_takeaway']
        };

        this.placesService.nearbySearch(request, (results, status) => {
            this.hideLoadingState();

            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                this.displayVenues(results.slice(0, 10));
                this.showSuccessMessage(`Found ${results.length} nearby venues`);
            } else {
                this.showErrorMessage('Failed to find venues');
            }
        });
    }

    displayVenues(venues) {
        // Clear existing venue markers
        this.clearVenueMarkers();

        venues.forEach((place, index) => {
            const marker = new google.maps.Marker({
                position: place.geometry.location,
                map: this.map,
                title: place.name,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/restaurant.png'
                },
                animation: google.maps.Animation.DROP
            });

            const priceLevel = place.price_level ? '$'.repeat(place.price_level) : 'N/A';
            const rating = place.rating ? `${place.rating}/5` : 'N/A';
            
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="venue-info">
                        <h4>${place.name}</h4>
                        <p>Rating: ${rating}</p>
                        <p>Price Level: ${priceLevel}</p>
                        ${place.vicinity ? `<p>${place.vicinity}</p>` : ''}
                        <div class="venue-actions">
                            <button onclick="window.eventMapManager.selectVenue('${place.place_id}')" class="venue-btn">
                                <i class="fas fa-check-circle"></i> Select
                            </button>
                            <button onclick="window.eventMapManager.getDirectionsTo(${place.geometry.location.lat()}, ${place.geometry.location.lng()})" class="venue-btn">
                                <i class="fas fa-directions"></i> Directions
                            </button>
                        </div>
                    </div>
                `
            });

            marker.addListener('click', () => {
                infoWindow.open(this.map, marker);
            });

            this.venueMarkers.push(marker);
        });
    }

    // Utility methods
    centerMapOnAllLocations() {
        if (!this.map) return;
        
        const allLocations = [...this.memberLocations];
        if (this.userCurrentLocation) {
            allLocations.push({ position: this.userCurrentLocation });
        }
        if (this.midpointMarker) {
            allLocations.push({ position: this.midpointMarker.getPosition().toJSON() });
        }

        if (allLocations.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            allLocations.forEach(location => {
                bounds.extend(location.position);
            });
            this.map.fitBounds(bounds);
        }
    }

    getMarkerColor(index) {
        const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'];
        return colors[index % colors.length];
    }

    clearMemberMarkers() {
        this.markers = this.markers.filter(marker => {
            const icon = marker.getIcon();
            if (typeof icon === 'string' && icon.includes('ms/icons/')) {
                const color = icon.match(/\/([a-z]+)-dot\.png/);
                if (color && ['blue', 'red', 'green', 'yellow', 'purple', 'orange'].includes(color[1])) {
                    marker.setMap(null);
                    return false;
                }
            }
            return true;
        });
    }

    clearVenueMarkers() {
        this.venueMarkers.forEach(marker => marker.setMap(null));
        this.venueMarkers = [];
    }

    // Message display methods
    showLoadingState(message) {
        this.showMessage(message, 'loading');
    }

    hideLoadingState() {
        const existingMessage = document.querySelector('.map-message.loading');
        if (existingMessage) {
            existingMessage.remove();
        }
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showInfoMessage(message) {
        this.showMessage(message, 'info');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.map-message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `map-message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-${this.getMessageIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove success and info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 4000);
        }
    }

    getMessageIcon(type) {
        const icons = {
            loading: 'spinner fa-spin',
            success: 'check-circle',
            error: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showMapError(message) {
        console.error('Map Error:', message);
        
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div class="map-error">
                    <h3><i class="fas fa-exclamation-triangle"></i> Map Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // Additional placeholder methods for complete functionality
    addMapLegend() {
        // Implementation would add a map legend
        console.log('Map legend would be added here');
    }

    addQuickActions() {
        // Implementation would add quick action buttons
        console.log('Quick actions would be added here');
    }

    showDirectionsToMidpoint() {
        console.log('Directions to midpoint would be shown here');
    }

    selectVenue(placeId) {
        console.log('Venue selection logic would be here for:', placeId);
    }

    getDirectionsTo(lat, lng) {
        console.log('Get directions to:', lat, lng);
    }

    shareLocation(lat, lng) {
        console.log('Share location logic would be here');
    }
}

// =============================================================================
// INITIALIZATION - No DOM listener conflicts
// =============================================================================

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 event_map_manager.js: DOM loaded, creating EventMapManager');
    
    // Create EventMapManager instance
    try {
        window.eventMapManager = new EventMapManager();
        
        // Listen for map ready event from MapManager
        document.addEventListener('mapReady', (event) => {
            console.log('🗺️ event_map_manager.js: Received mapReady event');
            window.eventMapManager.onMapReady(event.detail.map);
        });
        
        console.log('✅ EventMapManager created successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize EventMapManager:', error);
        
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div class="map-error">
                    <h3><i class="fas fa-exclamation-triangle"></i> Error</h3>
                    <p>Failed to initialize event functionality. Please refresh the page.</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
});

// Global error handlers for Google Maps
window.gm_authFailure = function() {
    console.error('Google Maps authentication failed');
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div class="map-error">
                <h3><i class="fas fa-exclamation-triangle"></i> Maps Authentication Failed</h3>
                <p>Unable to authenticate with Google Maps. Please check your API key configuration.</p>
                <button onclick="location.reload()" class="retry-btn">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;
    }
};

// Handle keyboard shortcuts for event functionality
document.addEventListener('keydown', (e) => {
    if (!window.eventMapManager || !window.eventMapManager.isInitialized) return;
    
    try {
        switch(e.key) {
            case 'r':
            case 'R':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    window.eventMapManager.loadMemberLocations();
                }
                break;
            case 'm':
            case 'M':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    window.eventMapManager.calculateAndDisplayMidpoint();
                }
                break;
            case 'v':
            case 'V':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    window.eventMapManager.findNearbyVenues();
                }
                break;
            case 'Escape':
                // Close any open modals
                document.querySelectorAll('.venue-details-modal, .directions-summary').forEach(el => el.remove());
                break;
        }
    } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
    }
});

// Utility function to check if Google Maps is loaded
window.isGoogleMapsLoaded = function() {
    return typeof google !== 'undefined' && 
           google.maps && 
           google.maps.Map && 
           google.maps.places && 
           google.maps.places.PlacesService;
};