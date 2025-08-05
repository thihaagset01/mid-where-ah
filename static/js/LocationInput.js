/**
 * LocationInput class - A self-contained class for managing location inputs
 * Handles its own lifecycle, autocomplete, markers, and state
 * FIXED VERSION - Proper manual typing support and marker cleanup
 */
class LocationInput {
    constructor(personId, containerId = 'locations-container', options = {}) {
        this.personId = personId;
        this.inputId = `location-${personId}`;
        this.containerId = containerId;
        
        // Default options
        this.options = {
            colorPalette: [
                '#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', 
                '#EC4899', '#10B981', '#F97316', '#6366F1'
            ],
            defaultTransportMode: 'TRANSIT',
            allowRemove: true,
            geocodeDelay: 1000, // Delay before manual geocoding
            ...options
        };
        
        // Single state object instead of scattered globals
        this.state = {
            address: '',
            position: null,
            transportMode: this.options.defaultTransportMode,
            isValid: false,
            isProcessing: false,
            place: null,
            error: null
        };
        
        // Tracking
        this.geocodeTimeout = null;
        this.marker = null;
        
        // Initialize DOM and functionality
        this.init();
    }
    
    init() {
        this.createDOM();
        this.setupAutocomplete();
        this.setupEventListeners();
        
        // Register this instance globally for access
        if (!window.locationInputs) {
            window.locationInputs = new Map();
        }
        window.locationInputs.set(this.inputId, this);
        
        console.log(`LocationInput ${this.inputId} initialized`);
    }
    
    // Clean DOM creation - no HTML injection
    createDOM() {
        // Get parent container
        const parentContainer = document.getElementById(this.containerId);
        if (!parentContainer) {
            console.error(`Parent container #${this.containerId} not found`);
            return;
        }
        
        // Create container
        const container = document.createElement('div');
        container.className = 'location-container';
        container.setAttribute('data-person-id', this.personId);
        
        // Create transport icon
        const transportIcon = document.createElement('div');
        transportIcon.className = 'transport-icon transit';
        transportIcon.setAttribute('data-person', this.personId);
        transportIcon.setAttribute('data-current-mode', 'TRANSIT');
        transportIcon.setAttribute('data-tooltip', 'Public Transport');
        
        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-subway';
        transportIcon.appendChild(iconElement);
        
        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'location-input';
        input.id = this.inputId;
        input.placeholder = `Person ${this.personId}'s location`;
        input.autocomplete = 'off';
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-person-btn';
        removeBtn.title = 'Remove Person';
        removeBtn.style.display = this.options.allowRemove ? 'inline-flex' : 'none';
        
        const removeIcon = document.createElement('i');
        removeIcon.className = 'fas fa-times';
        removeBtn.appendChild(removeIcon);
        
        // Assemble container
        container.appendChild(transportIcon);
        container.appendChild(input);
        container.appendChild(removeBtn);
        
        // Add to parent
        const addPersonContainer = parentContainer.querySelector('.add-person-container');
        if (addPersonContainer) {
            parentContainer.insertBefore(container, addPersonContainer);
        } else {
            parentContainer.appendChild(container);
        }
        
        // Store references
        this.container = container;
        this.input = input;
        this.transportIcon = transportIcon;
        this.removeBtn = removeBtn;
        
        // Set color based on personId
        this.color = this.getColor();
    }
    
    // Get color based on personId
    getColor() {
        const colorIndex = (this.personId - 1) % this.options.colorPalette.length;
        return this.options.colorPalette[colorIndex];
    }
    
    // Single autocomplete setup
    setupAutocomplete() {
        // Wait for Google Maps to be available
        if (!window.google?.maps?.places?.Autocomplete) {
            console.log(`Waiting for Google Maps to load for ${this.inputId}`);
            setTimeout(() => this.setupAutocomplete(), 1000);
            return;
        }
        
        try {
            this.autocomplete = new google.maps.places.Autocomplete(this.input, {
                componentRestrictions: { country: "sg" },
                fields: ["geometry", "formatted_address", "name", "address_components"]
            });
            
            this.autocomplete.addListener('place_changed', () => {
                this.handlePlaceChanged();
            });
            
            console.log(`Autocomplete initialized for ${this.inputId}`);
        } catch (error) {
            console.error(`Failed to initialize autocomplete for ${this.inputId}:`, error);
        }
    }
    
    setupEventListeners() {
        // Input event for manual typing with debounce
        this.input.addEventListener('input', this.debounce((e) => {
            this.handleInputChange(e);
        }, 300));
        
        // Clear validation on focus
        this.input.addEventListener('focus', () => {
            this.clearValidationUI();
        });
        
        // Transport icon click
        this.transportIcon.addEventListener('click', () => {
            this.cycleTransportMode();
        });
        
        // Remove button click
        this.removeBtn.addEventListener('click', () => {
            this.requestRemoval();
        });
    }
    
    // Debounce utility function
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
    
    // Handle input changes with proper cleanup and geocoding
    handleInputChange(e) {
        const value = e.target.value.trim();
        
        // Clear any existing timeout
        if (this.geocodeTimeout) {
            clearTimeout(this.geocodeTimeout);
            this.geocodeTimeout = null;
        }
        
        // Update address in state
        this.updateState({ address: value });
        
        // If input is empty, clear everything
        if (!value) {
            this.clearLocation();
            return;
        }
        
        // If input is too short, mark as invalid but don't geocode yet
        if (value.length < 3) {
            this.updateState({ isValid: false, error: 'Enter at least 3 characters' });
            this.updateValidationUI();
            return;
        }
        
        // Start geocoding process with delay
        this.updateState({ isProcessing: true, error: null });
        this.updateValidationUI();
        
        this.geocodeTimeout = setTimeout(() => {
            // Only geocode if autocomplete hasn't already handled it
            if (!this.state.isValid || !this.state.position) {
                this.geocodeLocation(value);
            }
        }, this.options.geocodeDelay);
    }
    
    handlePlaceChanged() {
        const place = this.autocomplete.getPlace();
        
        if (!place || !place.geometry) {
            console.warn(`Invalid place selected for ${this.inputId}`);
            return;
        }
        
        // Clear any pending geocoding
        if (this.geocodeTimeout) {
            clearTimeout(this.geocodeTimeout);
            this.geocodeTimeout = null;
        }
        
        console.log(`Place selected for ${this.inputId}:`, place.formatted_address);
        
        this.updateState({
            address: place.formatted_address || place.name,
            position: place.geometry.location,
            place: place,
            isValid: true,
            isProcessing: false,
            error: null
        });
        
        this.addMarker();
        this.updateValidationUI();
        this.notifyChange();
    }
    
    /**
     * Geocode the current input value using SingaporeGeocoder or Google Geocoder
     */
    geocodeLocation(address) {
        if (!address) {
            this.updateState({ isValid: false, isProcessing: false, error: 'Please enter a location' });
            this.updateValidationUI();
            return;
        }
        
        console.log(`🔍 Geocoding address: ${address}`);
        
        // Use Google's Geocoder as primary method
        if (window.google?.maps?.Geocoder) {
            this.geocodeWithGoogle(address);
        } else {
            // Fallback to SingaporeGeocoder if available
            this.geocodeWithSingaporeGeocoder(address);
        }
    }
    
    /**
     * Geocode using Google's Geocoder
     */
    geocodeWithGoogle(address) {
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({ 
            address: `${address}, Singapore`,
            componentRestrictions: { country: 'SG' }
        }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
                const result = results[0];
                const position = result.geometry.location;
                
                console.log(`✅ Geocoded ${address} to:`, position.toString());
                
                this.updateState({
                    isProcessing: false,
                    isValid: true,
                    position: position,
                    address: result.formatted_address,
                    error: null
                });
                
                this.addMarker();
                this.updateValidationUI();
                this.notifyChange();
            } else {
                console.warn(`❌ Google geocoding failed for ${address}: ${status}`);
                this.handleGeocodingFailure(address);
            }
        });
    }
    
    /**
     * Fallback geocoding using SingaporeGeocoder
     */
    geocodeWithSingaporeGeocoder(address) {
        // Ensure geocoder is available
        if (!window.singaporeGeocoder) {
            try {
                window.singaporeGeocoder = new SingaporeGeocoder();
            } catch (error) {
                console.error('SingaporeGeocoder not available:', error);
                this.handleGeocodingFailure(address);
                return;
            }
        }
        
        window.singaporeGeocoder.geocode(address)
            .then(result => {
                const position = result.geometry.location;
                
                console.log(`✅ SingaporeGeocoder geocoded ${address} to:`, position.toString());
                
                this.updateState({
                    isProcessing: false,
                    isValid: true,
                    position: position,
                    address: result.formatted_address,
                    error: null
                });
                
                this.addMarker();
                this.updateValidationUI();
                this.notifyChange();
            })
            .catch(error => {
                console.warn(`❌ SingaporeGeocoder failed for ${address}: ${error.message}`);
                this.handleGeocodingFailure(address);
            });
    }
    
    /**
     * Handle geocoding failure
     */
    handleGeocodingFailure(address) {
        this.updateState({
            isProcessing: false,
            isValid: false,
            position: null,
            error: `Could not find location: ${address}`
        });
        
        this.removeMarker();
        this.updateValidationUI();
        this.notifyChange();
    }
    
    /**
     * Clear location data and marker
     */
    clearLocation() {
        this.updateState({
            address: '',
            position: null,
            isValid: false,
            isProcessing: false,
            error: null,
            place: null
        });
        
        this.removeMarker();
        this.clearValidationUI();
        this.notifyChange();
    }
    
    // Add marker to map
    addMarker() {
        if (!this.state.position) {
            console.warn(`Cannot add marker for ${this.inputId}: No position`);
            return;
        }
        
        // Get map from MapManager or global
        const map = window.mapManager?.getMap() || window.map;
        if (!map) {
            console.error(`Cannot add marker for ${this.inputId}: Map not initialized`);
            return;
        }
        
        // Remove existing marker if any
        this.removeMarker();
        
        // Create marker icon
        const markerIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: this.color,
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 10
        };
        
        try {
            // Create new marker
            this.marker = new google.maps.Marker({
                position: this.state.position,
                map: map,
                title: this.state.address || `Person ${this.personId}`,
                icon: markerIcon,
                animation: google.maps.Animation.DROP
            });
            
            console.log(`Marker added for ${this.inputId} at`, this.state.position.toString());
            
            // Pan map to this location smoothly
            map.panTo(this.state.position);
            
            // Add click listener for info window
            this.marker.addListener('click', () => {
                if (this.infoWindow) {
                    this.infoWindow.close();
                }
                
                this.infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div style="font-weight: 500; color: ${this.color};">
                            Person ${this.personId}
                        </div>
                        <div style="font-size: 12px; color: #666; margin-top: 4px;">
                            ${this.state.address}
                        </div>
                    `
                });
                
                this.infoWindow.open(map, this.marker);
            });
            
        } catch (error) {
            console.error(`Error creating marker for ${this.inputId}:`, error);
        }
    }
    
    /**
     * Remove marker from map
     */
    removeMarker() {
        if (this.marker) {
            this.marker.setMap(null);
            this.marker = null;
        }
        
        if (this.infoWindow) {
            this.infoWindow.close();
            this.infoWindow = null;
        }
    }
    
    // Clean state updates
    updateState(newState) {
        Object.assign(this.state, newState);
    }
    
    // Update UI based on validation state
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
    
    // Clear validation UI
    clearValidationUI() {
        this.input.classList.remove('is-valid', 'is-invalid', 'is-processing');
    }
    
    // Cycle through transport modes
    cycleTransportMode() {
        const modes = ['TRANSIT', 'DRIVING', 'WALKING'];
        const currentIndex = modes.indexOf(this.state.transportMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const newMode = modes[nextIndex];
        
        this.updateTransportMode(newMode);
    }
    
    // Update transport mode
    updateTransportMode(mode) {
        this.state.transportMode = mode;
        
        // Update icon
        this.transportIcon.setAttribute('data-current-mode', mode);
        this.transportIcon.className = `transport-icon ${mode.toLowerCase()}`;
        
        const iconElement = this.transportIcon.querySelector('i');
        if (iconElement) {
            // Update icon based on mode
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
        
        console.log(`Transport mode for ${this.inputId} updated to ${mode}`);
        this.notifyChange();
    }
    
    // Request removal of this input
    requestRemoval() {
        // Dispatch custom event
        const event = new CustomEvent('locationinput:remove', {
            detail: { personId: this.personId, inputId: this.inputId }
        });
        document.dispatchEvent(event);
    }
    
    // Notify that state has changed
    notifyChange() {
        // Dispatch custom event
        const event = new CustomEvent('locationinput:change', {
            detail: { 
                personId: this.personId, 
                inputId: this.inputId,
                state: { ...this.state } // Send copy of state
            }
        });
        document.dispatchEvent(event);
    }
    
    // Get data for midpoint calculation
    getData() {
        return {
            personId: this.personId,
            inputId: this.inputId,
            position: this.state.position,
            transportMode: this.state.transportMode,
            address: this.state.address,
            isValid: this.state.isValid
        };
    }
    
    // Proper cleanup
    destroy() {
        // Clear timeouts
        if (this.geocodeTimeout) {
            clearTimeout(this.geocodeTimeout);
            this.geocodeTimeout = null;
        }
        
        // Remove event listeners
        if (this.autocomplete) {
            google.maps.event.clearInstanceListeners(this.autocomplete);
        }
        
        // Remove marker and info window
        this.removeMarker();
        
        // Remove from global registry
        if (window.locationInputs) {
            window.locationInputs.delete(this.inputId);
        }
        
        // Remove DOM element
        if (this.container && this.container.parentNode) {
            this.container.remove();
        }
        
        console.log(`LocationInput ${this.inputId} destroyed`);
    }
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocationInput };
}