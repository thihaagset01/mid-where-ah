/**
 * VenueMapFeatures.js - Specialized Map Features for MidWhereAh
 * Handles venue search, group mapping, and other specialized map features
 * 
 * FIXED VERSION - Uses MapManager's map instance, removes initialization conflicts
 */

class VenueMapFeatures {
    constructor() {
        // Venue-specific properties
        this.map = null; // Will be set by MapManager
        this.markers = [];
        this.venueMarkers = [];
        this.midpoint = null;
        this.infoWindow = null;
        
        // Services - initialized when map is ready
        this.placesService = null;
        this.geocoder = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        
        console.log('VenueMapFeatures created (waiting for map)');
    }
    
    /**
     * Called when MapManager's map is ready
     */
    onMapReady(mapInstance) {
        console.log('VenueMapFeatures received map instance');
        
        try {
            // Store reference to map
            this.map = mapInstance;
            
            // Initialize venue-specific services
            this.initializeServices();
            
            // Set up page-specific functionality
            this.initializePageFeatures();
            
            console.log('✅ VenueMapFeatures initialized');
            
        } catch (error) {
            console.error('Error in VenueMapFeatures.onMapReady:', error);
        }
    }
    
    /**
     * Initialize Google Maps services for venue features
     */
    initializeServices() {
        if (!this.map) {
            throw new Error('Map instance not available');
        }
        
        // Initialize services
        this.placesService = new google.maps.places.PlacesService(this.map);
        this.geocoder = new google.maps.Geocoder();
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#4285F4",
                strokeWeight: 5,
                strokeOpacity: 0.7
            }
        });
        
        this.directionsRenderer.setMap(this.map);
        
        console.log('✅ Venue services initialized');
    }
    
    /**
     * Initialize page-specific features based on current page
     */
    initializePageFeatures() {
        const path = window.location.pathname;
        
        if (path.startsWith('/group/')) {
            this.initializeGroupMap();
        } else if (path.startsWith('/venues/')) {
            this.initializeVenuesMap();
        } else if (path.includes('mobile_home') || path === '/app') {
            this.initializeHomeMap();
        }
    }
    
    /**
     * Initialize features for home page
     */
    initializeHomeMap() {
        console.log('Initializing home map features');
        
        // Home page features would go here
        // This is where you'd add midpoint calculation UI for the home page
    }
    
    /**
     * Initialize features for group page
     */
    initializeGroupMap() {
        console.log('Initializing group map features');
        
        // Set up current location detection
        const useCurrentLocationBtn = document.getElementById('use-current-location');
        if (useCurrentLocationBtn) {
            useCurrentLocationBtn.addEventListener('click', () => {
                this.getCurrentLocationAndDisplay();
            });
        }
    }
    
    /**
     * Initialize features for venues page
     */
    initializeVenuesMap() {
        console.log('Initializing venues map features');
        
        // Set up venue search form
        const filtersForm = document.getElementById('filters-form');
        if (filtersForm) {
            filtersForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.searchVenues();
            });
        }
    }
    
    /**
     * Get current location and display on map
     */
    getCurrentLocationAndDisplay() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser.');
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Update map center
                this.map.setCenter(pos);
                this.map.setZoom(15);
                
                // Add marker for current location
                this.addMarker({
                    position: pos,
                    title: 'Your Location',
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }
                });
                
                // Reverse geocode to get address
                this.reverseGeocode(pos.lat, pos.lng, (address) => {
                    const locationInput = document.getElementById('location-input');
                    if (locationInput && address) {
                        locationInput.value = address;
                    }
                });
            },
            (error) => {
                console.error('Geolocation error:', error);
                this.showError('Error getting your location. Please enter it manually.');
            }
        );
    }
    
    /**
     * Calculate midpoint between multiple locations
     */
    calculateMidpoint(locations) {
        if (!locations || locations.length === 0) {
            return null;
        }
        
        if (locations.length === 1) {
            return locations[0];
        }
        
        let totalLat = 0;
        let totalLng = 0;
        
        locations.forEach(location => {
            // Handle both LatLng objects and plain objects
            if (typeof location.lat === 'function') {
                totalLat += location.lat();
                totalLng += location.lng();
            } else {
                totalLat += location.lat;
                totalLng += location.lng;
            }
        });
        
        return {
            lat: totalLat / locations.length,
            lng: totalLng / locations.length
        };
    }
    
    /**
     * Search for venues near a location
     */
    async searchNearbyVenues(location, radius = 1500, type = 'restaurant') {
        if (!this.placesService) {
            throw new Error('Places service not initialized');
        }
        
        const request = {
            location: location,
            radius: radius,
            type: type,
            rankBy: google.maps.places.RankBy.PROMINENCE
        };
        
        return new Promise((resolve) => {
            this.placesService.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    // Filter results by rating (4.0+)
                    const filteredResults = results.filter(place => 
                        place.rating && place.rating >= 4.0
                    );
                    resolve(filteredResults);
                } else {
                    console.error('Places search failed:', status);
                    resolve([]);
                }
            });
        });
    }
    
    /**
     * Get detailed information about a place
     */
    getPlaceDetails(placeId) {
        if (!this.placesService) {
            return Promise.reject(new Error('Places service not initialized'));
        }
        
        const request = {
            placeId: placeId,
            fields: ['name', 'formatted_address', 'geometry', 'rating', 'photos', 'price_level', 'website', 'opening_hours', 'types', 'user_ratings_total']
        };
        
        return new Promise((resolve, reject) => {
            this.placesService.getDetails(request, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(place);
                } else {
                    reject(new Error('Place details request failed: ' + status));
                }
            });
        });
    }
    
    /**
     * Display venues on the map
     */
    displayVenuesOnMap(venues) {
        // Clear existing venue markers
        this.clearVenueMarkers();
        
        // Create info window if it doesn't exist
        if (!this.infoWindow) {
            this.infoWindow = new google.maps.InfoWindow();
        }
        
        // Add markers for each venue
        venues.forEach((venue, index) => {
            const marker = new google.maps.Marker({
                position: venue.geometry.location,
                map: this.map,
                title: venue.name,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
                },
                animation: google.maps.Animation.DROP,
                zIndex: 100 - index
            });
            
            // Add click listener to show info window
            marker.addListener('click', () => {
                let photoHtml = '';
                if (venue.photos) {
                    photoHtml = '<img src="' + venue.photos[0].getUrl({maxWidth: 200, maxHeight: 120}) + '" alt="' + venue.name + '">';
                }
                
                const content = '<div class="info-window">' +
                    '<h5>' + venue.name + '</h5>' +
                    '<p>' + (venue.vicinity || venue.formatted_address) + '</p>' +
                    '<div class="rating">Rating: ' + venue.rating + ' ⭐ (' + (venue.user_ratings_total || 0) + ' reviews)</div>' +
                    photoHtml +
                    '</div>';
                
                this.infoWindow.setContent(content);
                this.infoWindow.open(this.map, marker);
            });
            
            this.venueMarkers.push(marker);
        });
        
        // Adjust map bounds to fit all markers
        if (this.venueMarkers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            
            // Add midpoint to bounds if exists
            if (this.midpoint) {
                bounds.extend(this.midpoint);
            }
            
            // Add all venue markers to bounds
            this.venueMarkers.forEach(marker => {
                bounds.extend(marker.getPosition());
            });
            
            this.map.fitBounds(bounds);
            
            // Don't zoom in too far
            const listener = google.maps.event.addListener(this.map, 'idle', () => {
                if (this.map.getZoom() > 15) {
                    this.map.setZoom(15);
                }
                google.maps.event.removeListener(listener);
            });
        }
    }
    
    /**
     * Add a marker to the map
     */
    addMarker(markerOptions) {
        // Remove existing marker with same title if exists
        this.removeMarkerByTitle(markerOptions.title);
        
        // Create and add the new marker
        const marker = new google.maps.Marker({
            map: this.map,
            animation: google.maps.Animation.DROP,
            ...markerOptions
        });
        
        // Add to markers array
        this.markers.push(marker);
        
        return marker;
    }
    
    /**
     * Remove a marker by title
     */
    removeMarkerByTitle(title) {
        const index = this.markers.findIndex(marker => marker.getTitle() === title);
        if (index !== -1) {
            this.markers[index].setMap(null);
            this.markers.splice(index, 1);
        }
    }
    
    /**
     * Clear venue markers from the map
     */
    clearVenueMarkers() {
        this.venueMarkers.forEach(marker => marker.setMap(null));
        this.venueMarkers = [];
    }
    
    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
        this.clearVenueMarkers();
    }
    
    /**
     * Calculate distance between two points in km
     */
    calculateDistance(point1, point2) {
        const R = 6371; // Earth's radius in km
        
        let lat1, lng1, lat2, lng2;
        
        // Handle different point formats
        if (typeof point1.lat === 'function') {
            lat1 = point1.lat();
            lng1 = point1.lng();
        } else {
            lat1 = point1.lat;
            lng1 = point1.lng;
        }
        
        if (typeof point2.lat === 'function') {
            lat2 = point2.lat();
            lng2 = point2.lng();
        } else {
            lat2 = point2.lat;
            lng2 = point2.lng;
        }
        
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Geocode an address
     */
    geocodeAddress(address) {
        if (!this.geocoder) {
            return Promise.reject(new Error('Geocoder not initialized'));
        }
        
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                } else {
                    reject(new Error('Geocoding failed: ' + status));
                }
            });
        });
    }
    
    /**
     * Reverse geocode coordinates to address
     */
    reverseGeocode(lat, lng) {
        if (!this.geocoder) {
            return Promise.resolve(`${lat}, ${lng}`);
        }
        
        const latlng = { lat: lat, lng: lng };
        
        return new Promise((resolve) => {
            this.geocoder.geocode({ location: latlng }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].formatted_address);
                } else {
                    resolve(`${lat}, ${lng}`);
                }
            });
        });
    }
    
    /**
     * Search for venues (used by venues page)
     */
    searchVenues() {
        const loadingElement = document.getElementById('loading-venues');
        const noVenuesElement = document.getElementById('no-venues');
        const venuesListElement = document.getElementById('venues-list');
        
        if (loadingElement) loadingElement.classList.remove('d-none');
        if (noVenuesElement) noVenuesElement.classList.add('d-none');
        if (venuesListElement) venuesListElement.innerHTML = '';
        
        // Get filter values
        const venueType = document.getElementById('venue-type')?.value || 'restaurant';
        const radius = parseInt(document.getElementById('radius')?.value) || 1000;
        
        // Use midpoint or map center
        const searchLocation = this.midpoint || this.map.getCenter();
        
        // Clear existing venue markers
        this.clearVenueMarkers();
        
        // Add midpoint marker
        this.addMarker({
            position: searchLocation,
            title: 'Midpoint',
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }
        });
        
        // Perform search
        const request = {
            location: searchLocation,
            radius: radius,
            type: venueType
        };
        
        this.placesService.nearbySearch(request, (results, status) => {
            // Hide loading state
            if (loadingElement) loadingElement.classList.add('d-none');
            
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                // Update venue count
                const venueCountElement = document.getElementById('venue-count');
                if (venueCountElement) venueCountElement.textContent = results.length;
                
                // Display results
                this.displayVenueResults(results);
            } else {
                // Show no results message
                if (noVenuesElement) noVenuesElement.classList.remove('d-none');
                const venueCountElement = document.getElementById('venue-count');
                if (venueCountElement) venueCountElement.textContent = '0';
            }
        });
    }
    
    /**
     * Display venue search results in the UI
     */
    displayVenueResults(venues) {
        const venuesList = document.getElementById('venues-list');
        if (!venuesList) return;
        
        const template = document.getElementById('venue-item-template');
        if (!template) return;
        
        // Clear existing list
        venuesList.innerHTML = '';
        
        // Add each venue to the list
        venues.forEach((venue, index) => {
            // Clone template
            const venueItem = document.importNode(template.content, true);
            
            // Set venue data
            venueItem.querySelector('.venue-name').textContent = venue.name;
            venueItem.querySelector('.venue-address').textContent = venue.vicinity;
            
            // Set rating if available
            const ratingElement = venueItem.querySelector('.venue-rating');
            if (ratingElement) {
                ratingElement.textContent = venue.rating || 'N/A';
            }
            
            // Set price level if available
            const priceElement = venueItem.querySelector('.venue-price');
            if (priceElement) {
                priceElement.textContent = venue.price_level ? '$'.repeat(venue.price_level) : 'N/A';
            }
            
            // Set distance
            const distanceElement = venueItem.querySelector('.venue-distance');
            if (distanceElement && this.midpoint) {
                const distance = this.calculateDistance(this.midpoint, venue.geometry.location);
                distanceElement.textContent = distance.toFixed(1) + ' km away';
            }
            
            // Set thumbnail
            const thumbnailElement = venueItem.querySelector('.venue-thumbnail');
            if (thumbnailElement) {
                if (venue.photos && venue.photos.length > 0) {
                    thumbnailElement.src = venue.photos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
                } else {
                    thumbnailElement.src = 'https://via.placeholder.com/80?text=No+Image';
                }
            }
            
            // Add marker for venue
            this.addMarker({
                position: venue.geometry.location,
                title: venue.name,
                icon: {
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                }
            });
            
            // Set up event listeners
            const detailsBtn = venueItem.querySelector('.view-details-btn');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => {
                    this.showVenueDetails(venue);
                });
            }
            
            const addToVotingBtn = venueItem.querySelector('.btn-add-voting');
            if (addToVotingBtn) {
                addToVotingBtn.addEventListener('click', () => {
                    this.addVenueToVoting(venue);
                });
            }
            
            // Add to list
            venuesList.appendChild(venueItem);
        });
    }
    
    /**
     * Show venue details in modal
     */
    showVenueDetails(venue) {
        console.log('Showing details for venue:', venue.name);
        // Implementation for venue details modal
    }
    
    /**
     * Add venue to voting list
     */
    addVenueToVoting(venue) {
        console.log('Adding venue to voting:', venue.name);
        // Implementation for adding to voting
    }
    
    /**
     * Show error message
     */
    showError(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'danger');
        } else {
            console.error('VenueMapFeatures Error:', message);
        }
    }
}

// =============================================================================
// GLOBAL INSTANCE AND INITIALIZATION
// =============================================================================

// Create global instance
window.venueMapFeatures = new VenueMapFeatures();

// Listen for map ready event from MapManager
document.addEventListener('mapReady', (event) => {
    console.log('🗺️ VenueMapFeatures: Received mapReady event');
    window.venueMapFeatures.onMapReady(event.detail.map);
});

// =============================================================================
// LEGACY SUPPORT FUNCTIONS (for backward compatibility)
// =============================================================================

// Legacy functions that other code might still call
function calculateMidpoint(locations) {
    return window.venueMapFeatures.calculateMidpoint(locations);
}

function searchNearbyVenues(location, radius, type, callback) {
    window.venueMapFeatures.searchNearbyVenues(location, radius, type)
        .then(results => callback(results))
        .catch(error => {
            console.error('Error in searchNearbyVenues:', error);
            callback([]);
        });
}

function clearVenueMarkers() {
    if (window.venueMapFeatures) {
        window.venueMapFeatures.clearVenueMarkers();
    }
}

function clearMarkers() {
    if (window.venueMapFeatures) {
        window.venueMapFeatures.clearMarkers();
    }
}

function addMarker(markerOptions) {
    if (window.venueMapFeatures) {
        return window.venueMapFeatures.addMarker(markerOptions);
    }
}

function displayVenuesOnMap(venues) {
    if (window.venueMapFeatures) {
        window.venueMapFeatures.displayVenuesOnMap(venues);
    }
}

function getPlaceDetails(placeId, callback) {
    if (window.venueMapFeatures) {
        window.venueMapFeatures.getPlaceDetails(placeId)
            .then(place => callback(place))
            .catch(error => {
                console.error('Error getting place details:', error);
                callback(null);
            });
    }
}

function calculateDistance(point1, point2) {
    if (window.venueMapFeatures) {
        return window.venueMapFeatures.calculateDistance(point1, point2);
    }
    return 0;
}

function geocodeAddress(address, successCallback, errorCallback) {
    if (window.venueMapFeatures) {
        window.venueMapFeatures.geocodeAddress(address)
            .then(location => successCallback(location))
            .catch(error => errorCallback(error.message));
    }
}

function reverseGeocode(lat, lng, callback) {
    if (window.venueMapFeatures) {
        window.venueMapFeatures.reverseGeocode(lat, lng)
            .then(address => callback(address))
            .catch(error => callback(`${lat}, ${lng}`));
    }
}