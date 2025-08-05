/**
 * Homepage Integration - Enhances existing static location inputs
 * This script bridges the gap between the template's static HTML and our enhanced LocationInput behavior
 */

// Enhanced location input behavior for existing DOM elements
class LocationInputEnhancer {
    constructor(inputElement) {
        this.input = inputElement;
        this.inputId = inputElement.id;
        this.personId = parseInt(this.inputId.replace('location-', ''));
        
        // Find related elements
        this.container = inputElement.closest('.location-container');
        this.transportIcon = this.container?.querySelector('.transport-icon');
        
        // State
        this.state = {
            address: '',
            position: null,
            transportMode: 'TRANSIT',
            isValid: false,
            isProcessing: false,
            error: null
        };
        
        // Debounce timeout
        this.geocodeTimeout = null;
        this.marker = null;
        
        // Color
        this.color = this.getColor();
        
        this.init();
    }
    
    init() {
        // Add validation styles
        this.addValidationStyles();
        
        // Set up manual typing with debounce
        this.setupManualTyping();
        
        // Set up autocomplete (if available)
        this.setupAutocomplete();
        
        // Set up transport icon
        this.setupTransportIcon();
        
        console.log(`Enhanced location input: ${this.inputId}`);
    }
    
    addValidationStyles() {
        if (!document.getElementById('location-validation-styles')) {
            const style = document.createElement('style');
            style.id = 'location-validation-styles';
            style.textContent = `
                .location-input.is-processing {
                    background: linear-gradient(90deg, #f8f9fa 25%, #e9ecef 50%, #f8f9fa 75%);
                    background-size: 200% 100%;
                    animation: loading-shimmer 1.5s infinite;
                    border-color: #8B5DB8;
                }
                
                .location-input.is-valid {
                    border-color: #28a745 !important;
                    background-color: #f8fff9 !important;
                    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25) !important;
                }
                
                .location-input.is-invalid {
                    border-color: #dc3545 !important;
                    background-color: #fff8f8 !important;
                    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
                }
                
                @keyframes loading-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setupManualTyping() {
        // Clear on focus
        this.input.addEventListener('focus', () => {
            this.clearValidationUI();
        });
        
        // Manual typing with debounce
        this.input.addEventListener('input', this.debounce((e) => {
            this.handleInputChange(e);
        }, 800));
        
        // Enter key for immediate geocoding
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const value = this.input.value.trim();
                if (value && value.length >= 3) {
                    this.clearTimeout();
                    this.geocodeLocation(value);
                }
            }
        });
    }
    
    setupAutocomplete() {
        // Wait for Google Maps
        if (!window.google?.maps?.places?.Autocomplete) {
            setTimeout(() => this.setupAutocomplete(), 1000);
            return;
        }
        
        // Skip if already initialized
        if (this.input.getAttribute('data-autocomplete-initialized') === 'true') {
            return;
        }
        
        try {
            this.autocomplete = new google.maps.places.Autocomplete(this.input, {
                componentRestrictions: { country: "sg" },
                fields: ["geometry", "formatted_address", "name"]
            });
            
            this.autocomplete.addListener('place_changed', () => {
                this.handlePlaceSelected();
            });
            
            this.input.setAttribute('data-autocomplete-initialized', 'true');
            console.log(`Autocomplete set up for ${this.inputId}`);
        } catch (error) {
            console.error(`Failed to set up autocomplete for ${this.inputId}:`, error);
        }
    }
    
    setupTransportIcon() {
        if (this.transportIcon) {
            this.transportIcon.addEventListener('click', () => {
                this.cycleTransportMode();
            });
        }
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    clearTimeout() {
        if (this.geocodeTimeout) {
            clearTimeout(this.geocodeTimeout);
            this.geocodeTimeout = null;
        }
    }
    
    handleInputChange(e) {
        const value = e.target.value.trim();
        
        this.clearTimeout();
        this.updateState({ address: value });
        
        // Clear everything if empty
        if (!value) {
            this.clearLocation();
            return;
        }
        
        // Too short
        if (value.length < 3) {
            this.updateState({ isValid: false, error: 'Enter at least 3 characters' });
            this.updateValidationUI();
            return;
        }
        
        // Start processing
        this.updateState({ isProcessing: true, error: null });
        this.updateValidationUI();
        
        // Geocode after delay
        this.geocodeTimeout = setTimeout(() => {
            if (!this.state.isValid) { // Only if autocomplete didn't handle it
                this.geocodeLocation(value);
            }
        }, 1000);
    }
    
    handlePlaceSelected() {
        const place = this.autocomplete.getPlace();
        
        if (!place || !place.geometry) {
            console.warn(`Invalid place selected for ${this.inputId}`);
            return;
        }
        
        this.clearTimeout();
        
        this.updateState({
            address: place.formatted_address || place.name,
            position: place.geometry.location,
            isValid: true,
            isProcessing: false,
            error: null
        });
        
        this.addMarker();
        this.updateValidationUI();
        this.notifyChange();
        
        console.log(`Place selected for ${this.inputId}:`, place.formatted_address);
    }
    
    geocodeLocation(address) {
        console.log(`🔍 Geocoding: ${address}`);
        
        if (!window.google?.maps?.Geocoder) {
            this.handleGeocodingFailure('Google Maps not available');
            return;
        }
        
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({
            address: `${address}, Singapore`,
            componentRestrictions: { country: 'SG' }
        }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
                const result = results[0];
                
                this.updateState({
                    isProcessing: false,
                    isValid: true,
                    position: result.geometry.location,
                    address: result.formatted_address,
                    error: null
                });
                
                this.addMarker();
                this.updateValidationUI();
                this.notifyChange();
                
                console.log(`✅ Geocoded ${address}`);
            } else {
                this.handleGeocodingFailure(`Could not find: ${address}`);
            }
        });
    }
    
    handleGeocodingFailure(message) {
        this.updateState({
            isProcessing: false,
            isValid: false,
            position: null,
            error: message
        });
        
        this.removeMarker();
        this.updateValidationUI();
        this.notifyChange();
        
        console.warn(`❌ Geocoding failed: ${message}`);
    }
    
    clearLocation() {
        this.updateState({
            address: '',
            position: null,
            isValid: false,
            isProcessing: false,
            error: null
        });
        
        this.removeMarker();
        this.clearValidationUI();
        this.notifyChange();
    }
    
    addMarker() {
        if (!this.state.position) return;
        
        const map = window.mapManager?.getMap() || window.map;
        if (!map) {
            console.error(`No map available for ${this.inputId}`);
            return;
        }
        
        this.removeMarker();
        
        this.marker = new google.maps.Marker({
            position: this.state.position,
            map: map,
            title: this.state.address || `Person ${this.personId}`,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: this.color,
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 10
            },
            animation: google.maps.Animation.DROP
        });
        
        // Pan to marker
        map.panTo(this.state.position);
        
        console.log(`Marker added for ${this.inputId}`);
    }
    
    removeMarker() {
        if (this.marker) {
            this.marker.setMap(null);
            this.marker = null;
        }
    }
    
    updateState(newState) {
        Object.assign(this.state, newState);
    }
    
    updateValidationUI() {
        this.input.classList.remove('is-valid', 'is-invalid', 'is-processing');
        
        if (this.state.isProcessing) {
            this.input.classList.add('is-processing');
        } else if (this.state.isValid) {
            this.input.classList.add('is-valid');
        } else if (this.state.error) {
            this.input.classList.add('is-invalid');
        }
    }
    
    clearValidationUI() {
        this.input.classList.remove('is-valid', 'is-invalid', 'is-processing');
    }
    
    cycleTransportMode() {
        const modes = ['TRANSIT', 'DRIVING', 'WALKING'];
        const currentIndex = modes.indexOf(this.state.transportMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        
        this.updateTransportMode(modes[nextIndex]);
    }
    
    updateTransportMode(mode) {
        this.state.transportMode = mode;
        
        if (this.transportIcon) {
            this.transportIcon.setAttribute('data-current-mode', mode);
            this.transportIcon.className = `transport-icon ${mode.toLowerCase()}`;
            
            const iconElement = this.transportIcon.querySelector('i');
            if (iconElement) {
                switch (mode) {
                    case 'DRIVING':
                        iconElement.className = 'fas fa-car';
                        this.transportIcon.setAttribute('data-tooltip', 'Driving');
                        break;
                    case 'WALKING':
                        iconElement.className = 'fas fa-walking';
                        this.transportIcon.setAttribute('data-tooltip', 'Walking');
                        break;
                    case 'TRANSIT':
                    default:
                        iconElement.className = 'fas fa-subway';
                        this.transportIcon.setAttribute('data-tooltip', 'Public Transport');
                        break;
                }
            }
        }
        
        this.notifyChange();
        console.log(`Transport mode for ${this.inputId} updated to ${mode}`);
    }
    
    notifyChange() {
        // Update find button state
        if (window.midpointCalculator && window.midpointCalculator.updateFindButtonState) {
            setTimeout(() => {
                window.midpointCalculator.updateFindButtonState();
            }, 100);
        }
        
        // Update legacy global data for compatibility
        if (!window.locationData) window.locationData = new Map();
        if (!window.userTransportModes) window.userTransportModes = new Map();
        
        if (this.state.isValid && this.state.position) {
            window.locationData.set(this.inputId, {
                lat: this.state.position.lat(),
                lng: this.state.position.lng(),
                address: this.state.address,
                transportMode: this.state.transportMode
            });
            window.userTransportModes.set(this.inputId, this.state.transportMode);
        } else {
            window.locationData.delete(this.inputId);
            window.userTransportModes.delete(this.inputId);
        }
    }
    
    getColor() {
        const colors = ['#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'];
        return colors[(this.personId - 1) % colors.length];
    }
    
    // Get data for midpoint calculation
    getData() {
        return {
            personId: this.personId,
            inputId: this.inputId,
            position: this.state.position,
            transportMode: this.state.transportMode,
            address: this.state.address,
            isValid: this.state.isValid,
            lat: this.state.position ? this.state.position.lat() : null,
            lng: this.state.position ? this.state.position.lng() : null
        };
    }
}

// Initialize enhanced location inputs when page loads
function initializeLocationInputEnhancers() {
    // Wait for map to be ready
    const initEnhancers = () => {
        const locationInputs = document.querySelectorAll('.location-input');
        
        if (locationInputs.length === 0) {
            console.log('No location inputs found');
            return;
        }
        
        console.log(`🎯 Enhancing ${locationInputs.length} existing location inputs`);
        
        // Store enhancers globally
        if (!window.locationInputEnhancers) {
            window.locationInputEnhancers = new Map();
        }
        
        locationInputs.forEach(input => {
            if (!window.locationInputEnhancers.has(input.id)) {
                const enhancer = new LocationInputEnhancer(input);
                window.locationInputEnhancers.set(input.id, enhancer);
            }
        });
        
        console.log('✅ Location input enhancers initialized');
        
        // Make LocationInputEnhancer globally available for add person functionality
        window.LocationInputEnhancer = LocationInputEnhancer;
        console.log('✅ LocationInputEnhancer class made globally available');
    };
    
    // Initialize after map is ready
    if (window.map || (window.mapManager && window.mapManager.isMapReady())) {
        initEnhancers();
    } else {
        // Wait for map ready event
        document.addEventListener('mapReady', () => {
            setTimeout(initEnhancers, 500); // Small delay to ensure map is fully ready
        });
    }
}

// Initialize when DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocationInputEnhancers);
} else {
    initializeLocationInputEnhancers();
}

// Also initialize when Google Maps loads (backup)
window.addEventListener('load', () => {
    setTimeout(initializeLocationInputEnhancers, 1000);
});