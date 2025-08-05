/**
 * MapManager.js - Core Map functionality for MidWhereAh
 * Handles Google Maps integration, markers, and location display
 * 
 * FIXED VERSION - Proper marker management and global reference handling
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
            this.setupLegacySupport();
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
            },
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });
        
        // Make map globally accessible with multiple references for compatibility
        window.map = this.map;
        window.midwhereahMap = this.map;
        
        console.log('✅ Google Map created successfully');
        return this.map;
    }
    
    /**
     * Set up legacy support for existing code
     */
    setupLegacySupport() {
        // Legacy autocomplete setup (but LocationInput handles its own now)
        this.setupAutocompleteForExistingInputs();
        
        // Set up global geocoder for compatibility
        if (!window.geocoder) {
            window.geocoder = new google.maps.Geocoder();
        }
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
        
        console.log('Map ready event dispatched');
    }
    
    /**
     * Set up autocomplete for existing location inputs (legacy support)
     * NEW LocationInput instances handle their own autocomplete
     */
    setupAutocompleteForExistingInputs() {
        const locationInputs = document.querySelectorAll('.location-input');
        
        console.log(`Found ${locationInputs.length} location inputs for legacy autocomplete setup`);
        
        locationInputs.forEach((input, index) => {
            // Skip if this input already has autocomplete or is managed by LocationInput class
            if (input.getAttribute('data-autocomplete-initialized') === 'true') {
                console.log('Skipping', input.id, '- already has autocomplete');
                return;
            }
            
            // Check if this input is managed by LocationInput class
            const inputId = input.id;
            if (window.locationInputs && window.locationInputs.has(inputId)) {
                console.log('Skipping', input.id, '- managed by LocationInput class');
                return;
            }
            
            // Set up legacy autocomplete
            this.setupSingleInputAutocomplete(input, index);
        });
    }
    
    /**
     * Set up autocomplete for a single location input (legacy)
     */
    setupSingleInputAutocomplete(input, colorIndex) {
        // Mark as initialized to prevent double setup
        input.setAttribute('data-autocomplete-initialized', 'true');
        
        console.log('Setting up legacy autocomplete for', input.id);
        
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
                
                // Add marker to map using legacy method
                this.addLocationMarker(location, input.id, color);
                
                // Store location data for legacy compatibility
                this.storeLocationData(input.id, location, place.formatted_address || input.value);
                
                // Update UI state
                this.updateUIState();
            });
            
            console.log('✅ Legacy autocomplete set up for', input.id);
            
        } catch (error) {
            console.error('Error setting up legacy autocomplete for', input.id, ':', error);
        }
    }
    
    /**
     * Geocode address manually if Google Places API fails (legacy)
     */
    geocodeManually(address, inputId, color) {
        console.log('Legacy manual geocoding for:', address);
        
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 
            address: address + ', Singapore',
            componentRestrictions: { country: 'SG' }
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                };
                
                this.addLocationMarker(location, inputId, color);
                this.storeLocationData(inputId, location, results[0].formatted_address);
                this.updateUIState();
            } else {
                console.error('Legacy geocoding failed for:', address, 'Status:', status);
                this.showError('Could not find that location. Please try again.');
            }
        });
    }
    
    /**
     * Add location marker to the map (legacy method)
     * NOTE: New LocationInput instances manage their own markers
     */
    addLocationMarker(location, inputId, color = '#8B5DB8') {
        console.log('Adding legacy marker for', inputId, 'at', location);
        
        // Remove existing marker if any
        if (this.locationMarkers[inputId]) {
            this.locationMarkers[inputId].setMap(null);
            delete this.locationMarkers[inputId];
        }
        
        // Create marker
        const marker = new google.maps.Marker({
            position: location,
            map: this.map,
            title: 'Location ' + inputId.replace('location-', ''),
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 0.9,
                strokeWeight: 3,
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
     * Remove a specific marker (for cleanup)
     */
    removeLocationMarker(inputId) {
        if (this.locationMarkers[inputId]) {
            this.locationMarkers[inputId].setMap(null);
            delete this.locationMarkers[inputId];
            console.log('Removed legacy marker for', inputId);
        }
    }
    
    /**
     * Store location data in global storage (legacy compatibility)
     */
    storeLocationData(inputId, location, address) {
        if (!window.locationData) window.locationData = new Map();
        
        window.locationData.set(inputId, {
            lat: location.lat,
            lng: location.lng,
            address: address,
            transportMode: window.userTransportModes?.get(inputId) || 'TRANSIT'
        });
        
        console.log('Stored legacy location data for', inputId);
    }
    
    /**
     * Update UI state after location changes (legacy compatibility)
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
        
        // New LocationManager support
        if (window.locationManager && typeof window.locationManager.updateFindButtonState === 'function') {
            window.locationManager.updateFindButtonState();
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
            // Create a simple toast notification
            this.showToast(message, 'error');
        }
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }
    
    /**
     * Clear all markers from the map
     */
    clearMarkers() {
        // Clear legacy markers
        Object.values(this.locationMarkers).forEach(marker => {
            marker.setMap(null);
        });
        this.locationMarkers = {};
        
        // Clear LocationInput markers
        if (window.locationInputs) {
            window.locationInputs.forEach(locationInput => {
                if (locationInput.removeMarker) {
                    locationInput.removeMarker();
                }
            });
        }
        
        console.log('All markers cleared');
    }
    
    /**
     * Clear all directions from the map
     */
    clearDirections() {
        this.directionsRenderers.forEach(renderer => {
            renderer.setMap(null);
        });
        this.directionsRenderers = [];
        console.log('All directions cleared');
    }
    
    /**
     * Get the current map instance
     * @returns {google.maps.Map} The Google Maps instance
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
    
    /**
     * Add directions renderer
     */
    addDirectionsRenderer(directionsRenderer) {
        if (directionsRenderer) {
            this.directionsRenderers.push(directionsRenderer);
        }
    }
    
    /**
     * Get all valid locations (compatibility method)
     */
    getAllLocations() {
        const locations = [];
        
        // Get from LocationInput instances
        if (window.locationInputs) {
            window.locationInputs.forEach(locationInput => {
                if (locationInput.state && locationInput.state.isValid) {
                    locations.push({
                        inputId: locationInput.inputId,
                        position: locationInput.state.position,
                        address: locationInput.state.address,
                        transportMode: locationInput.state.transportMode
                    });
                }
            });
        }
        
        // Get from legacy storage
        if (window.locationData) {
            window.locationData.forEach((data, inputId) => {
                // Only add if not already added from LocationInput
                if (!locations.find(loc => loc.inputId === inputId)) {
                    locations.push({
                        inputId: inputId,
                        position: { lat: data.lat, lng: data.lng },
                        address: data.address,
                        transportMode: data.transportMode
                    });
                }
            });
        }
        
        return locations;
    }
    
    /**
     * Pan and zoom to show all markers
     */
    fitToMarkers() {
        const locations = this.getAllLocations();
        
        if (locations.length === 0) {
            console.log('No locations to fit to');
            return;
        }
        
        if (locations.length === 1) {
            // Single location - just pan to it
            this.map.panTo(locations[0].position);
            this.map.setZoom(15);
            return;
        }
        
        // Multiple locations - fit bounds
        const bounds = new google.maps.LatLngBounds();
        
        locations.forEach(location => {
            if (location.position) {
                bounds.extend(location.position);
            }
        });
        
        this.map.fitBounds(bounds);
        
        // Ensure minimum zoom level
        google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
            if (this.map.getZoom() > 16) {
                this.map.setZoom(16);
            }
        });
        
        console.log('Map fitted to', locations.length, 'locations');
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