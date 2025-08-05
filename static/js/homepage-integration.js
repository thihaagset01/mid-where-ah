/**
 * Homepage Integration - Enhances existing static location inputs
 * This script bridges the gap between the template's static HTML and our enhanced LocationInput behavior
 * FIXED: Proper autofill integration and state management
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
        
        // Track if a place is being selected from autocomplete
        this.isSelectingFromAutocomplete = false;
        
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
        
        // Set up input handling (without geocoding)
        this.setupInputHandling();
        
        // Set up transport icon
        this.setupTransportIcon();
        
        // CRITICAL FIX: Listen for autofill events
        this.setupAutofillListener();
        
        // Check if input already has data from autofill
        this.checkExistingData();
        
        console.log(`Enhanced location input: ${this.inputId}`);
    }
    
    // CRITICAL FIX: Handle autofill data
    setupAutofillListener() {
        // Listen for location-updated event from autofill
        document.addEventListener('location-updated', (event) => {
            if (event.detail.inputId === this.inputId) {
                console.log(`📍 Autofill updated ${this.inputId}:`, event.detail.place);
                this.handleAutofillSelection(event.detail.place);
            }
        });
        
        // Also listen for direct input changes that might have coordinates
        this.input.addEventListener('input', () => {
            this.checkForCoordinatesInDataset();
        });
    }
    
    // CRITICAL FIX: Check if input already has coordinates from autofill
    checkExistingData() {
        if (this.input.dataset.lat && this.input.dataset.lng) {
            console.log(`📍 Found existing coordinates for ${this.inputId}`);
            this.updateStateFromDataset();
        }
    }
    
    // CRITICAL FIX: Check for coordinates in dataset after input changes
    checkForCoordinatesInDataset() {
        setTimeout(() => {
            if (this.input.dataset.lat && this.input.dataset.lng && !this.state.isValid) {
                console.log(`📍 Detected new coordinates in dataset for ${this.inputId}`);
                this.updateStateFromDataset();
            }
        }, 100);
    }
    
    // CRITICAL FIX: Update state from dataset
    updateStateFromDataset() {
        const lat = parseFloat(this.input.dataset.lat);
        const lng = parseFloat(this.input.dataset.lng);
        
        if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            const position = new google.maps.LatLng(lat, lng);
            
            this.state = {
                ...this.state,
                address: this.input.value,
                position: position,
                isValid: true,
                isProcessing: false,
                error: null
            };
            
            this.updateValidationUI();
            this.addMarker();
            this.notifyChange();
            
            console.log(`✅ ${this.inputId} validated from dataset:`, { lat, lng });
        }
    }
    
    // CRITICAL FIX: Handle autofill place selection
    handleAutofillSelection(place) {
        if (!place || !place.geometry) {
            console.warn(`Invalid place for ${this.inputId}`);
            return;
        }
        
        const position = place.geometry.location;
        
        this.state = {
            ...this.state,
            address: this.input.value,
            position: position,
            isValid: true,
            isProcessing: false,
            error: null
        };
        
        this.updateValidationUI();
        this.addMarker();
        this.notifyChange();
        
        console.log(`✅ ${this.inputId} validated from autofill:`, {
            lat: position.lat(),
            lng: position.lng()
        });
    }
    
    addValidationStyles() {
        if (!document.getElementById('location-validation-styles')) {
            const style = document.createElement('style');
            style.id = 'location-validation-styles';
            style.textContent = `
                .location-input.is-processing {
                    background: linear-gradient(90deg, #f8f9fa 25%, #e9ecef 50%, #f8f9fa 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }
                
                .location-input.is-valid {
                    border-color: #28a745;
                    background-color: #f8fff9;
                }
                
                .location-input.is-invalid {
                    border-color: #dc3545;
                    background-color: #fff8f8;
                }
                
                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    setupInputHandling() {
        // Clear validation on focus
        this.input.addEventListener('focus', () => {
            this.clearValidationUI();
        });
        
        // Handle manual typing (basic validation only)
        this.input.addEventListener('input', () => {
            const value = this.input.value.trim();
            
            if (!value) {
                this.clearLocation();
            } else if (value.length >= 3) {
                // Don't auto-geocode, just mark as potentially valid
                this.state.address = value;
                this.state.isValid = false; // Will be set to true by autofill
                this.updateValidationUI();
            }
        });
    }
    
    setupTransportIcon() {
        if (!this.transportIcon) return;
        
        // Set initial icon
        this.updateTransportIcon('TRANSIT');
        
        // Handle clicks
        this.transportIcon.addEventListener('click', () => {
            this.cycleTransportMode();
        });
    }
    
    cycleTransportMode() {
        const modes = ['TRANSIT', 'DRIVING', 'WALKING'];
        const currentIndex = modes.indexOf(this.state.transportMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const newMode = modes[nextIndex];
        
        this.updateTransportMode(newMode);
    }
    
    updateTransportMode(mode) {
        this.state.transportMode = mode;
        this.updateTransportIcon(mode);
        this.notifyChange();
        console.log(`Transport mode for ${this.inputId} updated to ${mode}`);
    }
    
    updateTransportIcon(mode) {
        if (!this.transportIcon) return;
        
        this.transportIcon.setAttribute('data-current-mode', mode);
        
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
    
    addMarker() {
        if (!this.state.position || !window.map) return;
        
        // Remove existing marker
        this.removeMarker();
        
        // Add new marker
        this.marker = new google.maps.Marker({
            position: this.state.position,
            map: window.map,
            title: `Person ${this.personId}`,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: this.color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 12
            },
            label: {
                text: this.personId.toString(),
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '12px'
            }
        });
        
        console.log(`📍 Added marker for ${this.inputId} at:`, {
            lat: this.state.position.lat(),
            lng: this.state.position.lng()
        });
    }
    
    removeMarker() {
        if (this.marker) {
            this.marker.setMap(null);
            this.marker = null;
        }
    }
    
    updateValidationUI() {
        // Remove all validation classes first
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
    
    clearLocation() {
        this.state = {
            address: '',
            position: null,
            transportMode: this.state.transportMode, // Keep transport mode
            isValid: false,
            isProcessing: false,
            error: null
        };
        
        this.removeMarker();
        this.clearValidationUI();
        this.notifyChange();
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
        
        // Dispatch custom event
        document.dispatchEvent(new CustomEvent('locationinput:change', {
            detail: {
                inputId: this.inputId,
                state: this.state
            }
        }));
    }
    
    getColor() {
        const colors = ['#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'];
        return colors[(this.personId - 1) % colors.length];
    }
    
    // Get data for midpoint calculation - CRITICAL FIX
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