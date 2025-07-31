/**
 * maps.js - Core Map functionality for MidWhereAh
 * Handles Google Maps integration, markers, and location display
 * 
 * NOTE: This file provides the foundational map functionality that was previously in mobile.js.
 * It is distinct from js/maps.js which handles specialized map features like venue search and 
 * group mapping. The MapManager instance created here is intended to be used by js/maps.js
 * for those specialized features.
 */

class MapManager {
    constructor() {
        // Initialize properties
        this.map = null;
        this.locationMarkers = {};
        this.directionsRenderers = [];
        
        // Store global reference
        window.mapManager = this;
        
        console.log('MapManager initialized');
        
        // Auto-initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    /**
     * Initialize map manager
     */
    init() {
        // Map will be initialized by initMap
        return this;
    }
    
    /**
     * Initialize Google Map
     */
    initMap() {
        console.log('Initializing Google Map');
        
        // Default center (Singapore)
        const defaultCenter = { lat: 1.3521, lng: 103.8198 };
        
        // Create map instance
        this.map = new google.maps.Map(document.getElementById('map'), {
            center: defaultCenter,
            zoom: 12,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_TOP
            }
        });
        
        // Initialize location inputs if they exist
        this.setupAutocompleteForExistingInputs();
        
        // Make map globally accessible
        window.map = this.map;
        
        return this.map;
    }
    
    /**
     * Set up autocomplete for existing location inputs
     */
    setupAutocompleteForExistingInputs() {
        const locationInputs = document.querySelectorAll('.location-input');
        
        locationInputs.forEach(input => {
            const personId = input.id.replace('location-', '');
            const colorIndex = parseInt(personId) - 1;
            this.setupSingleInputAutocomplete(input, colorIndex);
        });
    }
    
    /**
     * Set up autocomplete for a single location input
     */
    setupSingleInputAutocomplete(input, colorIndex) {
        // Skip if already initialized
        if (input.getAttribute('data-initialized') === 'true') return;
        
        // Mark as initialized
        input.setAttribute('data-initialized', 'true');
        
        // Get person ID from input ID
        const personId = input.id.replace('location-', '');
        
        // Define colors for markers
        const colors = ['#8B5DB8', '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];
        const color = colors[colorIndex % colors.length];
        
        // Use LocationInput component if available
        if (window.LocationInput && window.LocationModule) {
            const locationInput = new window.LocationInput(input.id, {
                color: color,
                onSelect: (place) => {
                    if (place && place.geometry) {
                        this.addLocationMarker({
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                        }, input.id, color);
                    }
                }
            });
            
            // Add to location manager if available
            if (window.locationManager) {
                window.locationManager.addLocation(personId, locationInput);
            }
        } else {
            // Legacy fallback using Google Places Autocomplete
            const autocomplete = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: 'sg' }
            });
            
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                
                if (!place.geometry) {
                    // Try geocoding manually if geometry is missing
                    this.geocodeManually(input, input.value);
                    return;
                }
                
                const location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                
                // Add marker to map
                this.addLocationMarker(location, input.id, color);
                
                // Store location data
                if (!window.locationData) window.locationData = new Map();
                window.locationData.set(input.id, {
                    lat: location.lat,
                    lng: location.lng,
                    address: place.formatted_address || input.value,
                    transportMode: window.userTransportModes?.get(input.id) || 'TRANSIT'
                });
                
                // Update button state
                if (window.midpointCalculator) {
                    window.midpointCalculator.updateFindButtonState();
                } else if (typeof checkAllLocationsAndUpdateButton === 'function') {
                    checkAllLocationsAndUpdateButton();
                }
            });
        }
    }
    
    /**
     * Geocode address manually if Google Places API fails
     */
    geocodeManually(input, address) {
        // Use SingaporeGeocoder if available
        if (window.singaporeGeocoder) {
            window.singaporeGeocoder.geocode(address)
                .then(result => {
                    if (result && result.lat && result.lng) {
                        const location = { lat: result.lat, lng: result.lng };
                        const personId = input.id.replace('location-', '');
                        const colorIndex = parseInt(personId) - 1;
                        const colors = ['#8B5DB8', '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];
                        const color = colors[colorIndex % colors.length];
                        
                        this.addLocationMarker(location, input.id, color);
                        
                        // Store location data
                        if (!window.locationData) window.locationData = new Map();
                        window.locationData.set(input.id, {
                            lat: location.lat,
                            lng: location.lng,
                            address: result.formattedAddress || address,
                            transportMode: window.userTransportModes?.get(input.id) || 'TRANSIT'
                        });
                        
                        // Update button state
                        if (window.midpointCalculator) {
                            window.midpointCalculator.updateFindButtonState();
                        } else if (typeof checkAllLocationsAndUpdateButton === 'function') {
                            checkAllLocationsAndUpdateButton();
                        }
                    } else {
                        if (window.uiManager) {
                            window.uiManager.showErrorNotification('Could not find that location. Please try again.');
                        } else {
                            console.error('Geocoding failed for:', address);
                        }
                    }
                })
                .catch(error => {
                    if (window.uiManager) {
                        window.uiManager.showErrorNotification('Error finding location: ' + error.message);
                    } else {
                        console.error('Geocoding error:', error);
                    }
                });
        } else {
            // Fallback to Google Geocoder
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: address + ', Singapore' }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = {
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    };
                    
                    const personId = input.id.replace('location-', '');
                    const colorIndex = parseInt(personId) - 1;
                    const colors = ['#8B5DB8', '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];
                    const color = colors[colorIndex % colors.length];
                    
                    this.addLocationMarker(location, input.id, color);
                    
                    // Store location data
                    if (!window.locationData) window.locationData = new Map();
                    window.locationData.set(input.id, {
                        lat: location.lat,
                        lng: location.lng,
                        address: results[0].formatted_address || address,
                        transportMode: window.userTransportModes?.get(input.id) || 'TRANSIT'
                    });
                    
                    // Update button state
                    if (window.midpointCalculator) {
                        window.midpointCalculator.updateFindButtonState();
                    } else if (typeof checkAllLocationsAndUpdateButton === 'function') {
                        checkAllLocationsAndUpdateButton();
                    }
                } else {
                    if (window.uiManager) {
                        window.uiManager.showErrorNotification('Could not find that location. Please try again.');
                    } else {
                        console.error('Geocoding failed for:', address);
                    }
                }
            });
        }
    }
    
    /**
     * Add location marker to the map
     */
    addLocationMarker(location, inputId, color = '#8B5DB8') {
        console.log('Adding marker for', inputId, 'with color', color);
        
        // Remove existing marker if any
        if (this.locationMarkers[inputId]) {
            this.locationMarkers[inputId].setMap(null);
        }
        
        // Create marker
        const marker = new google.maps.Marker({
            position: location,
            map: this.map,
            title: 'Location ' + inputId.replace('location-', ''),
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
                scale: 10
            },
            animation: google.maps.Animation.DROP
        });
        
        // Store marker
        this.locationMarkers[inputId] = marker;
        
        // Pan to marker
        this.map.panTo(location);
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="font-weight:500;">Person ${inputId.replace('location-', '')}</div>`
        });
        
        marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
        });
        
        return marker;
    }
    
    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        Object.values(this.locationMarkers).forEach(marker => {
            marker.setMap(null);
        });
        
        this.locationMarkers = {};
    }
    
    /**
     * Clear all directions from the map
     */
    clearDirections() {
        this.directionsRenderers.forEach(renderer => {
            renderer.setMap(null);
        });
        
        this.directionsRenderers = [];
    }
}

// Create global instance
window.mapManager = new MapManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize map manager
    window.mapManager.init();
});

// Export initMap function for Google Maps callback
window.initMap = function() {
    if (window.mapManager) {
        return window.mapManager.initMap();
    }
};
