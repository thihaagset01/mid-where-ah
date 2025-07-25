// Fixed Event Map Manager for handling event-specific map functionality
class EventMapManager {
    constructor() {
        this.eventData = null;
        this.groupMembers = [];
        this.memberLocations = [];
        this.map = null;
        this.markers = [];
        this.midpointMarker = null;
        this.venueMarkers = [];
        this.directionsRenderer = null;
        this.directionsService = null;
        this.placesService = null;
        this.geocoder = null;
        this.userCurrentLocation = null;
        this.selectedVenue = null;
        this.isInitialized = false;
        
        // Initialize performance tracking
        this.performanceMetrics = {
            startTime: performance.now(),
            domContentLoaded: null,
            loadComplete: null,
            totalTime: null
        };
        
        // Wait for Google Maps to be available before initializing
        this.waitForGoogleMaps().then(() => {
            this.init();
        }).catch(error => {
            console.error('Failed to initialize Google Maps:', error);
            this.showMapError('Google Maps failed to load. Please check your API key and try again.');
        });
    }

    async waitForGoogleMaps() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait
        
        return new Promise((resolve, reject) => {
            const checkGoogle = () => {
                attempts++;
                
                if (window.google && 
                    window.google.maps && 
                    window.google.maps.Map) {
                    console.log('✅ Google Maps API loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Google Maps API failed to load after', attempts, 'attempts');
                    reject(new Error('Google Maps API not available'));
                } else {
                    // Check if the script is still loading
                    const mapsScript = document.querySelector('script[src*="maps.googleapis.com"]');
                    if (!mapsScript) {
                        console.warn('Maps script tag not found, attempting to add it');
                        this.loadGoogleMapsScript();
                    }
                    setTimeout(checkGoogle, 100);
                }
            };
            
            checkGoogle();
        });
    }
    
    loadGoogleMapsScript() {
        // Only add if not already present
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            return;
        }
        
        // Try to get API key from config
        let apiKey = '';
        if (window.config && window.config.GOOGLE_MAPS_API_KEY) {
            apiKey = window.config.GOOGLE_MAPS_API_KEY;
        }
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            console.error('Failed to load Google Maps script');
            this.showMapError('Failed to load Google Maps. Please check your internet connection and try again.');
        };
        document.head.appendChild(script);
        
        console.log('Added Google Maps script tag dynamically');
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            // Get URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const eventId = urlParams.get('eventId');
            
            if (eventId) {
                await this.loadEventData(urlParams);
                this.setupEventMapInterface();
            }
            
            // Initialize the map
            await this.initializeMap();
            
            if (eventId) {
                await this.loadMemberLocations();
                await this.getUserCurrentLocation();
            }
            
            this.isInitialized = true;
            console.log('EventMapManager initialized successfully');
            
            // Track performance metrics
            this.performanceMetrics.domContentLoaded = Math.round(performance.now() - this.performanceMetrics.startTime);
            window.addEventListener('load', () => {
                this.performanceMetrics.loadComplete = 1; // Just a flag that load completed
                this.performanceMetrics.totalTime = Math.round(performance.now() - this.performanceMetrics.startTime);
                console.log('Page load performance:', this.performanceMetrics);
            });
            
        } catch (error) {
            console.error('Error initializing EventMapManager:', error);
            this.showMapError('Failed to initialize map. Please refresh the page.');
        }
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
        
        // Show as notification
        this.showErrorMessage(message);
    }
    
    // Add error notification function similar to mobile.js
    showErrorNotification(message) {
        this.showErrorMessage(message);
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
    }

    setupEventMapInterface() {
        // Update page title and event info
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
                <button id="toggle-view" class="control-btn">
                    <i class="fas fa-layer-group"></i> <span>Toggle View</span>
                </button>
                <button id="share-location" class="control-btn">
                    <i class="fas fa-share-alt"></i> <span>Share</span>
                </button>
            </div>
        `;

        // Insert into the page
        document.body.appendChild(controlsContainer);

        // Add event listeners
        this.setupControlEventListeners();
    }

    addMapLegend() {
        // Check if legend already exists
        if (document.querySelector('.map-legend')) return;
        
        const legendContainer = document.createElement('div');
        legendContainer.className = 'map-legend';
        legendContainer.innerHTML = `
            <div class="legend-header">
                <h4><i class="fas fa-info-circle"></i> Map Legend</h4>
                <button class="legend-toggle"><i class="fas fa-chevron-down"></i></button>
            </div>
            <div class="legend-content">
                <div class="legend-item">
                    <span class="legend-dot member-dot"></span>
                    <span>Member Locations</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot midpoint-dot"></span>
                    <span>Meeting Point</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot venue-dot"></span>
                    <span>Recommended Venues</span>
                </div>
                <div class="legend-item">
                    <span class="legend-dot current-dot"></span>
                    <span>Your Location</span>
                </div>
            </div>
        `;

        document.body.appendChild(legendContainer);
        this.setupLegendToggle();
    }

    addQuickActions() {
        // Check if quick actions already exist
        if (document.querySelector('.quick-actions')) return;
        
        const quickActionsContainer = document.createElement('div');
        quickActionsContainer.className = 'quick-actions';
        quickActionsContainer.innerHTML = `
            <div class="quick-action" id="center-map" title="Center Map">
                <i class="fas fa-crosshairs"></i>
            </div>
            <div class="quick-action" id="zoom-in" title="Zoom In">
                <i class="fas fa-plus"></i>
            </div>
            <div class="quick-action" id="zoom-out" title="Zoom Out">
                <i class="fas fa-minus"></i>
            </div>
            <div class="quick-action" id="fullscreen" title="Fullscreen">
                <i class="fas fa-expand"></i>
            </div>
        `;

        document.body.appendChild(quickActionsContainer);
        this.setupQuickActions();
    }

    setupControlEventListeners() {
        const refreshBtn = document.getElementById('refresh-locations');
        const findCentralBtn = document.getElementById('find-central-btn');
        const venuesBtn = document.getElementById('find-venues');
        const directionsBtn = document.getElementById('show-directions');
        const toggleBtn = document.getElementById('toggle-view');
        const shareBtn = document.getElementById('share-location');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadMemberLocations());
        }

        if (findCentralBtn) {
            findCentralBtn.addEventListener('click', () => this.calculateAndDisplayMidpoint());
        } else {
            console.warn('Find central button not found in setupControlEventListeners');
        }

        if (venuesBtn) {
            venuesBtn.addEventListener('click', () => this.findNearbyVenues());
        }

        if (directionsBtn) {
            directionsBtn.addEventListener('click', () => this.showDirectionsToMidpoint());
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleMapView());
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareCurrentLocation());
        }
    }

    setupLegendToggle() {
        const legendToggle = document.querySelector('.legend-toggle');
        const legendContent = document.querySelector('.legend-content');
        
        if (legendToggle && legendContent) {
            legendToggle.addEventListener('click', () => {
                const isExpanded = legendContent.style.display !== 'none';
                legendContent.style.display = isExpanded ? 'none' : 'block';
                legendToggle.innerHTML = isExpanded ? 
                    '<i class="fas fa-chevron-down"></i>' : 
                    '<i class="fas fa-chevron-up"></i>';
            });
        }
    }

    setupQuickActions() {
        const centerBtn = document.getElementById('center-map');
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const fullscreenBtn = document.getElementById('fullscreen');

        if (centerBtn) {
            centerBtn.addEventListener('click', () => this.centerMapOnAllLocations());
        }

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => {
                if (this.map) {
                    this.map.setZoom(this.map.getZoom() + 1);
                }
            });
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => {
                if (this.map) {
                    this.map.setZoom(this.map.getZoom() - 1);
                }
            });
        }

        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    async initializeMap() {
        // Hide loading spinner
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }

        // Default center on Singapore
        const singapore = { lat: 1.3521, lng: 103.8198 };
        
        try {
            // Define custom map styles for a cleaner look
            const mapStyles = [
                {
                    "featureType": "poi",
                    "elementType": "labels.icon",
                    "stylers": [{"visibility": "off"}]
                },
                {
                    "featureType": "transit",
                    "elementType": "labels.icon",
                    "stylers": [{"visibility": "simplified"}]
                },
                {
                    "featureType": "road",
                    "elementType": "labels.icon",
                    "stylers": [{"visibility": "off"}]
                },
                {
                    "featureType": "water",
                    "elementType": "geometry",
                    "stylers": [{"color": "#e9e9e9"}]
                },
                {
                    "featureType": "landscape",
                    "stylers": [{"color": "#f5f5f5"}]
                }
            ];
            
            // Create map instance with custom styling
            this.map = new google.maps.Map(document.getElementById('map'), {
                center: singapore,
                zoom: 12,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: false,
                fullscreenControl: false,
                streetViewControl: false,
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                styles: mapStyles,
                gestureHandling: 'greedy', // Allows one-finger panning on mobile
                maxZoom: 18,
                minZoom: 3
            });
            
            // Initialize services with improved styling
            this.directionsService = new google.maps.DirectionsService();
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#8B5DB8',
                    strokeWeight: 5,
                    strokeOpacity: 0.7
                },
                markerOptions: {
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#8B5DB8',
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: '#FFFFFF',
                        scale: 7
                    }
                }
            });
            this.directionsRenderer.setMap(this.map);
            
            this.placesService = new google.maps.places.PlacesService(this.map);
            this.geocoder = new google.maps.Geocoder();
            
            // Hide loading spinner with animation
            const loadingSpinner = document.getElementById('loading-spinner');
            if (loadingSpinner) {
                loadingSpinner.style.opacity = '0';
                setTimeout(() => {
                    loadingSpinner.classList.add('hidden');
                }, 300);
            }
            
            // Get user's current location
            this.getUserCurrentLocation();
            
            // Set up map event listeners
            this.map.addListener('click', () => {
                // Close any open info windows
                if (this.activeInfoWindow) {
                    this.activeInfoWindow.close();
                }
            });
            
            // Make map globally accessible
            window.midwhereahMap = this.map;
            
            console.log('Map initialized successfully with custom styling');
            
        } catch (error) {
            console.error('Error initializing map:', error);
            throw error;
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

            // Only add marker if we're in Singapore (rough bounds check)
            const sgBounds = {
                north: 1.48,
                south: 1.16,
                east: 104.1,
                west: 103.6
            };

            if (this.userCurrentLocation.lat >= sgBounds.south && 
                this.userCurrentLocation.lat <= sgBounds.north &&
                this.userCurrentLocation.lng >= sgBounds.west && 
                this.userCurrentLocation.lng <= sgBounds.east) {
                
                // Add current location marker
                const currentLocationMarker = new google.maps.Marker({
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

                this.markers.push(currentLocationMarker);
                console.log('Current location added to map');
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

        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            this.showErrorMessage('Firebase not available');
            return;
        }

        const db = firebase.firestore();
        const locations = [];

        // Show loading state
        this.showLoadingState('Loading member locations...');

        try {
            // Load locations for each group member
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
                this.showInfoMessage('No member locations found. Members need to set their default locations in their profiles.');
                return;
            }

            // Clear existing member markers
            this.clearMemberMarkers();

            // Add markers for each member location
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

            // Fit map to show all markers
            this.centerMapOnAllLocations();
            this.showSuccessMessage(`Loaded ${locations.length} member locations`);

        } catch (error) {
            this.hideLoadingState();
            this.showErrorMessage('Failed to load member locations');
            console.error('Error loading member locations:', error);
        }
    }

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

    calculateAndDisplayMidpoint() {
        if (this.memberLocations.length < 2) {
            this.showInfoMessage('Need at least 2 member locations to calculate midpoint');
            return;
        }
        
        console.log('🔥 Find central button clicked!');
        
        // Show loading state on button
        const findCentralBtn = document.getElementById('find-central-btn');
        const originalContent = findCentralBtn ? findCentralBtn.innerHTML : null;
        
        if (findCentralBtn) {
            findCentralBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
            findCentralBtn.style.pointerEvents = 'none';
            findCentralBtn.classList.add('loading');
        }

        try {
            // Calculate geometric midpoint
            const positions = this.memberLocations.map(loc => loc.position);
            const midpoint = this.calculateGeometricMidpoint(positions);

            // Remove existing midpoint marker
            if (this.midpointMarker) {
                this.midpointMarker.setMap(null);
            }

            // Add midpoint marker with improved styling
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

            // Add info window to midpoint
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
                                <i class="fas fa-share-alt"></i> Share Location
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
            
            console.log('✅ Midpoint calculated successfully');
            this.showSuccessMessage('Meeting point calculated!');
            
        } catch (error) {
            console.error('Error calculating midpoint:', error);
            this.showErrorMessage('Could not calculate meeting point');
        } finally {
            // Restore button state in all cases
            if (findCentralBtn && originalContent) {
                findCentralBtn.innerHTML = originalContent;
                findCentralBtn.style.pointerEvents = 'auto';
                findCentralBtn.classList.remove('loading');
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
        
        // Show loading state on button
        const venuesBtn = document.getElementById('find-venues');
        const originalContent = venuesBtn ? venuesBtn.innerHTML : null;
        
        if (venuesBtn) {
            venuesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Searching...</span>';
            venuesBtn.disabled = true;
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
            } else {
                this.showErrorMessage('Failed to find venues');
            }
            
            // Restore button state
            if (venuesBtn && originalContent) {
                venuesBtn.innerHTML = originalContent;
                venuesBtn.disabled = false;
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

            // Create content for info window
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

        this.showSuccessMessage(`Found ${venues.length} nearby venues`);
    }

    // Additional methods with error handling
    showDirectionsToMidpoint() {
        if (!this.userCurrentLocation) {
            this.showErrorMessage('Current location not available');
            return;
        }

        if (!this.midpointMarker) {
            this.showInfoMessage('Please calculate meeting point first');
            return;
        }

        this.getDirectionsTo(
            this.midpointMarker.getPosition().lat(),
            this.midpointMarker.getPosition().lng()
        );
    }

    async getDirectionsTo(lat, lng) {
        if (!this.userCurrentLocation) {
            this.showErrorMessage('Current location not available');
            return;
        }

        if (!this.directionsService) {
            this.showErrorMessage('Directions service not available');
            return;
        }

        const destination = { lat: parseFloat(lat), lng: parseFloat(lng) };

        const request = {
            origin: this.userCurrentLocation,
            destination: destination,
            travelMode: google.maps.TravelMode.TRANSIT
        };

        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                this.directionsRenderer.setDirections(result);
                this.showDirectionsSummary(result.routes[0]);
            } else {
                this.showErrorMessage('Failed to get directions');
            }
        });
    }

    showDirectionsSummary(route) {
        const leg = route.legs[0];
        const summaryContainer = document.createElement('div');
        summaryContainer.className = 'directions-summary';
        summaryContainer.innerHTML = `
            <div class="summary-content">
                <h4><i class="fas fa-route"></i> Directions</h4>
                <p><strong>Distance:</strong> ${leg.distance.text}</p>
                <p><strong>Duration:</strong> ${leg.duration.text}</p>
                <button onclick="this.parentElement.parentElement.remove()" class="close-summary">×</button>
            </div>
        `;

        document.body.appendChild(summaryContainer);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (summaryContainer.parentNode) {
                summaryContainer.remove();
            }
        }, 10000);
    }

    toggleMapView() {
        if (!this.map) return;
        
        const currentType = this.map.getMapTypeId();
        const newType = currentType === 'roadmap' ? 'satellite' : 'roadmap';
        this.map.setMapTypeId(newType);
        
        this.showInfoMessage(`Switched to ${newType} view`);
    }

    async shareCurrentLocation() {
        if (!this.userCurrentLocation) {
            this.showErrorMessage('Current location not available');
            return;
        }

        try {
            if (typeof firebase !== 'undefined' && firebase.firestore && firebase.auth) {
                const db = firebase.firestore();
                const currentUser = firebase.auth().currentUser;

                if (currentUser) {
                    await db.collection('groups').doc(this.eventData.groupId)
                        .collection('events').doc(this.eventData.eventId)
                        .collection('memberLocations').doc(currentUser.uid).set({
                            lat: this.userCurrentLocation.lat,
                            lng: this.userCurrentLocation.lng,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                            name: currentUser.displayName || 'User'
                        });

                    this.showSuccessMessage('Location shared with group!');
                } else {
                    this.showErrorMessage('Please sign in to share location');
                }
            } else {
                this.showErrorMessage('Firebase not available');
            }
        } catch (error) {
            console.error('Error sharing location:', error);
            this.showErrorMessage('Failed to share location');
        }
    }

    shareLocation(lat, lng) {
        const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Meeting Location',
                text: 'Check out our meeting location!',
                url: locationUrl
            }).catch(error => {
                console.error('Error sharing:', error);
                this.copyToClipboard(locationUrl);
            });
        } else {
            this.copyToClipboard(locationUrl);
        }
    }

    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showSuccessMessage('Location link copied to clipboard!');
            }).catch(() => {
                this.fallbackCopyToClipboard(text);
            });
        } else {
            this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this.showSuccessMessage('Location link copied to clipboard!');
        } catch (err) {
            this.showErrorMessage('Could not copy to clipboard');
        }
        document.body.removeChild(textArea);
    }

    toggleFullscreen() {
        const mapElement = document.getElementById('map');
        
        if (!document.fullscreenElement) {
            if (mapElement.requestFullscreen) {
                mapElement.requestFullscreen().then(() => {
                    this.showInfoMessage('Press ESC to exit fullscreen');
                });
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
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

    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
        this.clearVenueMarkers();
    }

    clearDirections() {
        if (this.directionsRenderer) {
            this.directionsRenderer.setDirections({routes: []});
        }
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

    // Additional utility methods
    selectVenue(placeId) {
        if (!this.placesService) {
            this.showErrorMessage('Places service not available');
            return;
        }

        this.showLoadingState('Loading venue details...');

        const request = {
            placeId: placeId,
            fields: ['name', 'formatted_address', 'geometry', 'rating', 'price_level', 'opening_hours', 'website']
        };

        this.placesService.getDetails(request, (place, status) => {
            this.hideLoadingState();

            if (status === google.maps.places.PlacesServiceStatus.OK) {
                this.selectedVenue = place;
                this.showVenueDetails(place);
                this.announceVenueSelection(place);
            } else {
                this.showErrorMessage('Failed to get venue details');
            }
        });
    }

    showVenueDetails(venue) {
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'venue-details-modal';
        detailsContainer.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${venue.name}</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <p><i class="fas fa-map-marker-alt"></i> ${venue.formatted_address}</p>
                    <p><i class="fas fa-star"></i> Rating: ${venue.rating || 'N/A'}/5</p>
                    <p><i class="fas fa-dollar-sign"></i> Price Level: ${venue.price_level ? '$'.repeat(venue.price_level) : 'N/A'}</p>
                    ${venue.opening_hours ? `<p><i class="fas fa-clock"></i> ${venue.opening_hours.isOpen() ? 'Open Now' : 'Closed'}</p>` : ''}
                    ${venue.website ? `<p><i class="fas fa-globe"></i> <a href="${venue.website}" target="_blank">Website</a></p>` : ''}
                </div>
                <div class="modal-actions">
                    <button onclick="window.eventMapManager.shareVenue('${venue.place_id}')" class="btn primary">
                        <i class="fas fa-share-alt"></i> Share with Group
                    </button>
                    <button onclick="window.eventMapManager.getDirectionsTo('${venue.geometry.location.lat()}', '${venue.geometry.location.lng()}')" class="btn">
                        <i class="fas fa-route"></i> Get Directions
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(detailsContainer);
    }

    async announceVenueSelection(venue) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                const db = firebase.firestore();
                await db.collection('groups').doc(this.eventData.groupId).collection('events').doc(this.eventData.eventId).update({
                    selectedVenue: {
                        placeId: venue.place_id,
                        name: venue.name,
                        address: venue.formatted_address,
                        coordinates: {
                            lat: venue.geometry.location.lat(),
                            lng: venue.geometry.location.lng()
                        }
                    },
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                this.showSuccessMessage(`${venue.name} selected as meeting venue!`);
            } else {
                this.showErrorMessage('Firebase not available');
            }
        } catch (error) {
            console.error('Error updating venue selection:', error);
            this.showErrorMessage('Failed to update venue selection');
        }
    }

    shareVenue(placeId) {
        const venueUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Meeting Venue',
                text: 'Check out our meeting venue!',
                url: venueUrl
            }).catch(error => {
                console.error('Error sharing venue:', error);
                this.copyToClipboard(venueUrl);
            });
        } else {
            this.copyToClipboard(venueUrl);
        }
    }
}

// Initialize when page loads - with better error handling
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing MidWhereAh view map interface...');
    
    // Check if we're on the view_map page with event parameters
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');
    
    // Initialize the map manager
    try {
        window.eventMapManager = new EventMapManager();
    } catch (error) {
        console.error('Failed to initialize EventMapManager:', error);
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div class="map-error">
                    <h3><i class="fas fa-exclamation-triangle"></i> Error</h3>
                    <p>Failed to initialize map. Please refresh the page.</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
    
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(error => {
                console.error('ServiceWorker registration failed:', error);
            });
    }
    
    console.log('MidWhereAh view map interface initialized');
});

// Global map initialization function
window.initMap = function() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
    console.log('Google Maps loaded successfully');
};

// Error handler for Google Maps
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

// Handle Maps API loading errors
window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('Google Maps')) {
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div class="map-error">
                    <h3><i class="fas fa-exclamation-triangle"></i> Map Loading Error</h3>
                    <p>Unable to load Google Maps. Please check your internet connection and try again.</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }
});

// Add keyboard shortcuts with error handling
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
            case 'f':
            case 'F':
                if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    window.eventMapManager.toggleFullscreen();
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