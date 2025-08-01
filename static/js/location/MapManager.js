/**
 * MapManager.js - Core Map functionality for MidWhereAh
 * Handles Google Maps integration, markers, and location display
 * 
 * FIXED VERSION - Resolves initMap conflicts and timing issues
 */

class MapManager {
    constructor() {
        // Initialize properties
        this.map = null;
        this.locationMarkers = {};
        this.directionsRenderers = [];
        this.isInitialized = false;
        
        // Store global reference - but don't auto-initialize
        window.mapManager = this;
        
        console.log('MapManager initialized (waiting for Google Maps)');
    }
    
    /**
     * Initialize map manager - called ONLY by initMap callback
     */
    init() {
        if (this.isInitialized) {
            console.log('MapManager already initialized');
            return this.map;
        }
        
        try {
            console.log('MapManager.init() called');
            this.createMap();
            this.setupAutocompleteForExistingInputs();
            this.isInitialized = true;
            
            // Notify other components that map is ready
            this.notifyMapReady();
            
            return this.map;
        } catch (error) {
            console.error('Error in MapManager.init():', error);
            throw error;
        }
    }
    
    /**
     * Create the Google Map instance
     */
    createMap() {
        console.log('Creating Google Map instance');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            throw new Error('Map container element not found');
        }
        
        // Default center (Singapore)
        const defaultCenter = { lat: 1.3521, lng: 103.8198 };
        
        // Create map instance
        this.map = new google.maps.Map(mapElement, {
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
        
        // Make map globally accessible
        window.map = this.map;
        
        console.log('✅ Google Map created successfully');
        return this.map;
    }
    
    /**
     * Notify other components that map is ready
     */
    notifyMapReady() {
        // Trigger custom event
        const event = new CustomEvent('mapReady', { 
            detail: { 
                map: this.map, 
                mapManager: this 
            } 
        });
        document.dispatchEvent(event);
        
        // Call specific component initializers if they exist
        if (window.eventMapManager && typeof window.eventMapManager.onMapReady === 'function') {
            window.eventMapManager.onMapReady(this.map);
        }
        
        if (window.venueMapFeatures && typeof window.venueMapFeatures.onMapReady === 'function') {
            window.venueMapFeatures.onMapReady(this.map);
        }
    }
    
    /**
     * Set up autocomplete for existing location inputs
     */
    setupAutocompleteForExistingInputs() {
        const locationInputs = document.querySelectorAll('.location-input');
        
        console.log(`Found ${locationInputs.length} location inputs for autocomplete`);
        
        locationInputs.forEach((input, index) => {
            const personId = input.id.replace('location-', '');
            this.setupSingleInputAutocomplete(input, index);
        });
    }
    
    /**
     * Set up autocomplete for a single location input
     */
    setupSingleInputAutocomplete(input, colorIndex) {
        // Skip if already initialized
        if (input.getAttribute('data-autocomplete-initialized') === 'true') {
            console.log('Autocomplete already initialized for', input.id);
            return;
        }
        
        // Mark as initialized
        input.setAttribute('data-autocomplete-initialized', 'true');
        
        console.log('Setting up autocomplete for', input.id);
        
        // Define colors for markers
        const colors = ['#8B5DB8', '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];
        const color = colors[colorIndex % colors.length];
        
        try {
            // Create Google Places Autocomplete
            const autocomplete = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: 'sg' },
                fields: ['address_components', 'geometry', 'name', 'formatted_address']
            });
            
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                
                if (!place.geometry) {
                    console.warn('No geometry for place:', place);
                    this.geocodeManually(input.value, input.id, color);
                    return;
                }
                
                const location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                
                // Add marker to map
                this.addLocationMarker(location, input.id, color);
                
                // Store location data
                this.storeLocationData(input.id, location, place.formatted_address || input.value);
                
                // Update UI state
                this.updateUIState();
            });
            
            console.log('✅ Autocomplete set up for', input.id);
            
        } catch (error) {
            console.error('Error setting up autocomplete for', input.id, ':', error);
        }
    }
    
    /**
     * Geocode address manually if Google Places API fails
     */
    geocodeManually(address, inputId, color) {
        console.log('Manual geocoding for:', address);
        
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: address + ', Singapore' }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                };
                
                this.addLocationMarker(location, inputId, color);
                this.storeLocationData(inputId, location, results[0].formatted_address);
                this.updateUIState();
            } else {
                console.error('Geocoding failed for:', address, 'Status:', status);
                this.showError('Could not find that location. Please try again.');
            }
        });
    }
    
    /**
     * Add location marker to the map
     */
    addLocationMarker(location, inputId, color = '#8B5DB8') {
        console.log('Adding marker for', inputId, 'at', location);
        
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
     * Store location data in global storage
     */
    storeLocationData(inputId, location, address) {
        if (!window.locationData) window.locationData = new Map();
        
        window.locationData.set(inputId, {
            lat: location.lat,
            lng: location.lng,
            address: address,
            transportMode: window.userTransportModes?.get(inputId) || 'TRANSIT'
        });
        
        console.log('Stored location data for', inputId);
    }
    
    /**
     * Update UI state after location changes
     */
    updateUIState() {
        // Update midpoint calculator if available
        if (window.midpointCalculator && typeof window.midpointCalculator.updateFindButtonState === 'function') {
            window.midpointCalculator.updateFindButtonState();
        }
        
        // Legacy fallback
        if (typeof checkAllLocationsAndUpdateButton === 'function') {
            checkAllLocationsAndUpdateButton();
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        if (window.uiManager && typeof window.uiManager.showErrorNotification === 'function') {
            window.uiManager.showErrorNotification(message);
        } else {
            console.error('MapManager Error:', message);
            alert(message); // Fallback
        }
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
    
    /**
     * Get current map instance
     */
    getMap() {
        return this.map;
    }
    
    /**
     * Check if map is ready
     */
    isMapReady() {
        return this.isInitialized && this.map !== null;
    }
}

// SINGLE GLOBAL INSTANCE - created immediately but not initialized
window.mapManager = new MapManager();

// SINGLE GLOBAL INITMAP FUNCTION - this is the ONLY one that should exist
window.initMap = function() {
    console.log('🚀 initMap callback fired by Google Maps');
    
    try {
        // Hide loading spinner
        const loadingSpinner = document.getElementById('loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }
        
        // Initialize MapManager
        const map = window.mapManager.init();
        
        console.log('✅ initMap completed successfully');
        return map;
        
    } catch (error) {
        console.error('❌ Error in initMap:', error);
        
        // Show error in map container
        const mapElement = document.getElementById('map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 16px;"></i>
                    <h3>Map Initialization Failed</h3>
                    <p>There was an error loading the map. Please refresh the page.</p>
                    <button onclick="location.reload()" style="background: #8B5DB8; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
        
        throw error;
    }
};