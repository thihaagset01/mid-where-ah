/**
 * MapManager.js - COMPLETE FIXED VERSION
 * Enhanced Google Maps management with duplicate marker prevention
 * Handles both legacy autocomplete and new LocationInputEnhancer systems
 */

class MapManager {
    constructor(mapElementId = 'map') {
        this.mapElementId = mapElementId;
        this.map = null;
        this.isMapReady = false;
        
        // Enhanced marker tracking
        this.locationMarkers = {};
        this.markerRegistry = new Set(); // Track all marker instances
        
        // Autocomplete instances
        this.autocompleteInstances = new Map();
        
        // Singapore bounds for region restriction
        this.singaporeBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(1.0, 103.6),
            new google.maps.LatLng(1.7, 104.1)
        );
        
        console.log('MapManager initialized with enhanced marker tracking');
    }
    
    /**
     * Initialize the map with enhanced error handling
     */
    async initMap() {
        try {
            const mapElement = document.getElementById(this.mapElementId);
            if (!mapElement) {
                throw new Error(`Map element #${this.mapElementId} not found`);
            }
            
            // Singapore center coordinates
            const singaporeCenter = { lat: 1.3521, lng: 103.8198 };
            
            const mapOptions = {
                center: singaporeCenter,
                zoom: 12,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                restriction: {
                    latLngBounds: this.singaporeBounds,
                    strictBounds: false
                },
                styles: [
                    {
                        featureType: "poi",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                    }
                ],
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                zoomControl: false,
                gestureHandling: 'greedy'
            };
            
            this.map = new google.maps.Map(mapElement, mapOptions);
            this.isMapReady = true;
            
            // Make map globally accessible
            window.map = this.map;
            
            // Setup enhanced autocomplete for existing inputs
            this.setupAutocompleteForExistingInputs();
            
            // Notify that map is ready
            this.notifyMapReady();
            
            console.log('✅ Map initialized successfully');
            return this.map;
            
        } catch (error) {
            console.error('❌ Map initialization failed:', error);
            this.showError('Failed to initialize map. Please check your internet connection and try again.');
            throw error;
        }
    }
    
    /**
     * Check if map is ready
     */
    isMapReady() {
        return this.isMapReady && this.map !== null;
    }
    
    /**
     * Get map instance
     */
    getMap() {
        return this.map;
    }
    
    /**
     * CRITICAL FIX: Remove existing marker before creating new one
     */
    removeExistingMarker(inputId) {
        if (this.locationMarkers[inputId]) {
            this.locationMarkers[inputId].setMap(null);
            this.markerRegistry.delete(this.locationMarkers[inputId]);
            delete this.locationMarkers[inputId];
            console.log(`🧹 Removed existing marker for ${inputId}`);
        }
    }
    
    /**
     * NEW: Check if marker is managed by LocationInputEnhancer
     */
    isMarkerManagedByLocationInput(inputId) {
        // Check if LocationInputEnhancer exists and manages this input
        if (window.locationInputEnhancers && window.locationInputEnhancers.has(inputId)) {
            const enhancer = window.locationInputEnhancers.get(inputId);
            return enhancer && enhancer.marker; // Has active marker
        }
        return false;
    }
    
    /**
     * FIXED: Enhanced addLocationMarker with deduplication
     */
    addLocationMarker(location, inputId, color = '#8B5DB8') {
        // CRITICAL: Remove any existing marker first
        this.removeExistingMarker(inputId);
        
        // Check if LocationInputEnhancer already created a marker
        if (this.isMarkerManagedByLocationInput(inputId)) {
            console.log(`⚠️ Skipping legacy marker creation - ${inputId} managed by LocationInputEnhancer`);
            return null;
        }
        
        console.log('Adding legacy marker for', inputId, 'at', location);
        
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
            animation: google.maps.Animation.DROP,
            // Add identifier for tracking
            markerId: inputId,
            source: 'legacy-mapmanager'
        });
        
        // Store marker with enhanced tracking
        this.locationMarkers[inputId] = marker;
        this.markerRegistry.add(marker);
        
        // Pan to marker
        this.map.panTo(location);
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
            content: `<div style="font-weight:500;">Person ${inputId.replace('location-', '')}</div>`
        });
        
        marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
        });
        
        console.log(`✅ Created legacy marker for ${inputId}`);
        return marker;
    }
    
    /**
     * Remove a specific marker (for cleanup)
     */
    removeLocationMarker(inputId) {
        if (this.locationMarkers[inputId]) {
            this.locationMarkers[inputId].setMap(null);
            this.markerRegistry.delete(this.locationMarkers[inputId]);
            delete this.locationMarkers[inputId];
            console.log('Removed legacy marker for', inputId);
        }
    }
    
    /**
     * ENHANCED: Clear all markers with registry cleanup
     */
    clearAllMarkers() {
        console.log('🧹 Clearing all markers from map');
        
        // Clear legacy markers
        Object.values(this.locationMarkers).forEach(marker => {
            marker.setMap(null);
            this.markerRegistry.delete(marker);
        });
        this.locationMarkers = {};
        
        // Clear LocationInputEnhancer markers
        if (window.locationInputEnhancers) {
            window.locationInputEnhancers.forEach(enhancer => {
                if (enhancer.removeMarker) {
                    enhancer.removeMarker();
                }
            });
        }
        
        // Clear any orphaned markers from registry
        this.markerRegistry.forEach(marker => {
            marker.setMap(null);
        });
        this.markerRegistry.clear();
        
        console.log('✅ All markers cleared');
    }
    
    /**
     * ENHANCED: Setup autocomplete with marker deduplication
     */
    setupAutocompleteForExistingInputs() {
        const locationInputs = document.querySelectorAll('.location-input');
        
        console.log(`Found ${locationInputs.length} location inputs for enhanced autocomplete setup`);
        
        locationInputs.forEach((input, index) => {
            // Skip if input already has autocomplete or is managed by LocationInput class
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
            
            // Skip if already managed by LocationInputEnhancer
            if (this.isMarkerManagedByLocationInput(inputId)) {
                console.log(`⚠️ Skipping autocomplete setup - ${inputId} managed by LocationInputEnhancer`);
                return;
            }
            
            // Set up legacy autocomplete
            this.setupSingleInputAutocomplete(input, index);
        });
    }
    
    /**
     * ENHANCED: Set up autocomplete for a single location input
     */
    setupSingleInputAutocomplete(input, colorIndex) {
        // Mark as initialized to prevent double setup
        input.setAttribute('data-autocomplete-initialized', 'true');
        
        console.log('Setting up enhanced autocomplete for', input.id);
        
        // Define colors for markers
        const colors = ['#8B5DB8', '#FF5722', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#00BCD4'];
        const color = colors[colorIndex % colors.length];
        
        try {
            // Create Google Places Autocomplete
            const autocomplete = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: 'sg' },
                fields: ['address_components', 'geometry', 'name', 'formatted_address'],
                bounds: this.singaporeBounds,
                strictBounds: false
            });
            
            // Store autocomplete instance
            this.autocompleteInstances.set(input.id, autocomplete);
            
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                
                if (!place.geometry) {
                    console.warn('No geometry for place:', place);
                    this.geocodeManually(input.value, input.id, color);
                    return;
                }
                
                // CRITICAL: Remove existing marker before creating new one
                this.removeExistingMarker(input.id);
                
                const location = {
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                
                // Use enhanced addLocationMarker
                this.addLocationMarker(location, input.id, color);
                
                // Store location data for legacy compatibility
                this.storeLocationData(input.id, location, place.formatted_address || place.name);
                
                // Update UI state to reflect the change
                this.updateUIState();
                
                // Fit the map to show all markers
                this.fitToMarkers();
            });
            
        } catch (error) {
            console.error('Error setting up autocomplete for', input.id, error);
            this.showError('Failed to set up location search. Please refresh the page.');
        }
    }
    
    /**
     * Geocode manually when place has no geometry
     */
    geocodeManually(address, inputId, color) {
        if (!address.trim()) return;
        
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({
            address: address,
            componentRestrictions: { country: 'SG' },
            bounds: this.singaporeBounds
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                };
                
                this.removeExistingMarker(inputId);
                this.addLocationMarker(location, inputId, color);
                this.storeLocationData(inputId, location, results[0].formatted_address);
                this.updateUIState();
                this.fitToMarkers();
            } else {
                console.warn('Geocoding failed:', status);
                this.showError('Could not find location. Please try entering a more specific address.');
            }
        });
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
     * ENHANCED: Fit map to show all markers (both systems)
     */
    fitToMarkers() {
        const bounds = new google.maps.LatLngBounds();
        let hasMarkers = false;
        
        // Include legacy markers
        Object.values(this.locationMarkers).forEach(marker => {
            bounds.extend(marker.getPosition());
            hasMarkers = true;
        });
        
        // Include LocationInputEnhancer markers
        if (window.locationInputEnhancers) {
            window.locationInputEnhancers.forEach(enhancer => {
                if (enhancer.marker) {
                    bounds.extend(enhancer.marker.getPosition());
                    hasMarkers = true;
                }
            });
        }
        
        if (hasMarkers) {
            this.map.fitBounds(bounds);
            
            // Ensure minimum zoom level
            const listener = google.maps.event.addListener(this.map, 'idle', () => {
                if (this.map.getZoom() > 16) {
                    this.map.setZoom(16);
                }
                google.maps.event.removeListener(listener);
            });
        }
    }
    
    /**
     * NEW: Get all active markers for debugging
     */
    getActiveMarkers() {
        const activeMarkers = {
            legacy: Object.keys(this.locationMarkers).length,
            enhancer: 0,
            total: this.markerRegistry.size
        };
        
        if (window.locationInputEnhancers) {
            window.locationInputEnhancers.forEach(enhancer => {
                if (enhancer.marker) activeMarkers.enhancer++;
            });
        }
        
        return activeMarkers;
    }
    
    /**
     * Clear all directions from the map
     */
    clearDirections() {
        // This will be called by other components to clear direction renderers
        if (window.directionsRenderers) {
            window.directionsRenderers.forEach(renderer => {
                renderer.setMap(null);
            });
            window.directionsRenderers = [];
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
     * Show error message with enhanced UI
     */
    showError(message) {
        if (window.uiManager && typeof window.uiManager.showErrorNotification === 'function') {
            window.uiManager.showErrorNotification(message);
        } else {
            console.error('MapManager Error:', message);
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
     * Cleanup method for proper disposal
     */
    destroy() {
        // Clear all markers
        this.clearAllMarkers();
        
        // Clear autocomplete instances
        this.autocompleteInstances.forEach(autocomplete => {
            google.maps.event.clearInstanceListeners(autocomplete);
        });
        this.autocompleteInstances.clear();
        
        // Clear map
        if (this.map) {
            google.maps.event.clearInstanceListeners(this.map);
            this.map = null;
        }
        
        this.isMapReady = false;
        
        console.log('MapManager destroyed');
    }
}

/**
 * GLOBAL FUNCTIONS: Enhanced debugging and utilities
 */

// Debug marker conflicts
window.debugMarkers = function() {
    if (window.mapManager) {
        const markers = window.mapManager.getActiveMarkers();
        console.log('🔍 Active Markers Debug:', markers);
        
        // List all markers by input ID
        if (window.locationInputEnhancers) {
            console.log('LocationInputEnhancer markers:');
            window.locationInputEnhancers.forEach((enhancer, inputId) => {
                console.log(`  ${inputId}: ${enhancer.marker ? '✅' : '❌'}`);
            });
        }
        
        console.log('Legacy markers:', Object.keys(window.mapManager.locationMarkers));
        return markers;
    }
    return null;
};

// Clear all markers globally
window.clearAllMapMarkers = function() {
    if (window.mapManager) {
        window.mapManager.clearAllMarkers();
        console.log('🧹 All markers cleared globally');
    }
};

// Get map instance globally
window.getMapInstance = function() {
    return window.mapManager ? window.mapManager.getMap() : null;
};

// Initialize map globally
window.initializeMap = async function(elementId = 'map') {
    try {
        if (!window.mapManager) {
            window.mapManager = new MapManager(elementId);
        }
        return await window.mapManager.initMap();
    } catch (error) {
        console.error('Failed to initialize map:', error);
        return null;
    }
};

// Auto-initialize when Google Maps is loaded
window.initMap = function() {
    console.log('🗺️ Google Maps loaded, initializing MapManager...');
    window.initializeMap().then(map => {
        if (map) {
            console.log('✅ Map initialization complete');
        } else {
            console.error('❌ Map initialization failed');
        }
    });
};

// Handle map loading errors
window.handleMapError = function() {
    console.error('❌ Google Maps failed to load');
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; 
                        background: #f8f9fa; color: #6c757d; text-align: center; padding: 20px;">
                <div>
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3>Map Loading Failed</h3>
                    <p>Please check your internet connection and refresh the page.</p>
                    <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 12px; 
                            background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapManager;
}