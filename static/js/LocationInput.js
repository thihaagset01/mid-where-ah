/**
 * LocationInput class - A self-contained class for managing location inputs
 * Handles its own lifecycle, autocomplete, markers, and state
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
            ...options
        };
        
        // Single state object instead of scattered globals
        this.state = {
            address: '',
            position: null,
            transportMode: this.options.defaultTransportMode,
            isValid: false,
            place: null
        };
        
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
        // Input event for manual geocoding fallback
        this.input.addEventListener('input', () => {
            // Clear any existing timeout
            if (this.geocodeTimeout) {
                clearTimeout(this.geocodeTimeout);
            }
            
            const value = this.input.value.trim();
            if (value.length >= 3) {
                // Set up geocoding with delay (in case autocomplete doesn't work)
                this.geocodeTimeout = setTimeout(() => {
                    // Only geocode if we don't already have a valid position
                    if (!this.state.isValid) {
                        this.geocodeLocation(value);
                    }
                }, 2000); // Wait 2 seconds for autocomplete to work first
            }
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
    
    handlePlaceChanged() {
        const place = this.autocomplete.getPlace();
        
        if (!place || !place.geometry) {
            console.warn(`Invalid place selected for ${this.inputId}`);
            return;
        }
        
        console.log(`Place selected for ${this.inputId}:`, place.formatted_address);
        
        this.updateState({
            address: place.formatted_address || place.name,
            position: place.geometry.location,
            place: place,
            isValid: true
        });
        
        this.addMarker();
        this.notifyChange();
    }
    
    /**
     * Geocode the current input value using SingaporeGeocoder
     */
    geocodeLocation() {
        const address = this.input.value.trim();
        
        if (!address) {
            this.updateState({ isValid: false, error: 'Please enter a location' });
            return;
        }
        
        // Ensure geocoder is available
        if (!window.singaporeGeocoder) {
            // Create geocoder if not available
            window.singaporeGeocoder = new SingaporeGeocoder();
        }
        
        this.updateState({ isProcessing: true, error: null });
        
        console.log(`🔍 Geocoding address: ${address}`);
        
        // Use SingaporeGeocoder with strategy pattern
        window.singaporeGeocoder.geocode(address)
            .then(result => {
                const position = result.geometry.location;
                
                console.log(`✅ Geocoded ${address} to:`, position.toString());
                
                this.updateState({
                    isProcessing: false,
                    isValid: true,
                    position: position,
                    address: result.formatted_address
                });
                
                // Add marker
                this.addMarker();
                
                // Dispatch change event
                this.notifyChange();
            })
            .catch(error => {
                console.warn(`❌ Geocoding failed for ${address}: ${error.message}`);
                
                this.updateState({
                    isProcessing: false,
                    isValid: false,
                    error: `Could not find location: ${error.message}`
                });
                
                this.showError('Location not found');
            });
    }
    
    // Add marker to map
    addMarker() {
        if (!this.state.position) {
            console.warn(`Cannot add marker for ${this.inputId}: No position`);
            return;
        }
        
        if (!window.midwhereahMap) {
            console.error(`Cannot add marker for ${this.inputId}: Map not initialized`);
            return;
        }
        
        // Remove existing marker if any
        if (this.marker) {
            this.marker.setMap(null);
        }
        
        // Create marker icon
        const markerIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: this.color,
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8
        };
        
        try {
            // Create new marker
            this.marker = new google.maps.Marker({
                position: this.state.position,
                map: window.midwhereahMap,
                title: this.state.address || `Person ${this.personId}`,
                icon: markerIcon,
                animation: google.maps.Animation.DROP
            });
            
            console.log(`Marker added for ${this.inputId} at ${this.state.position.lat()}, ${this.state.position.lng()}`);
            
            // Pan map to this location
            window.midwhereahMap.panTo(this.state.position);
            
            // Update UI to reflect valid state
            this.updateValidationUI();
        } catch (error) {
            console.error(`Error creating marker for ${this.inputId}:`, error);
        }
    }
    
    // Clean state updates
    updateState(newState) {
        Object.assign(this.state, newState);
    }
    
    // Update UI based on validation state
    updateValidationUI() {
        if (this.state.isValid) {
            this.input.classList.add('is-valid');
            this.input.classList.remove('is-invalid');
        } else {
            this.input.classList.remove('is-valid');
            this.input.classList.add('is-invalid');
        }
    }
    
    // Show error state
    showError(message) {
        this.input.classList.add('is-invalid');
        this.input.classList.remove('is-valid');
        
        // Show error notification if available
        if (typeof showErrorNotification === 'function') {
            showErrorNotification(message);
        }
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
                state: this.state
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
        // Remove event listeners
        if (this.autocomplete) {
            google.maps.event.clearInstanceListeners(this.autocomplete);
        }
        
        // Remove marker
        if (this.marker) {
            this.marker.setMap(null);
            this.marker = null;
        }
        
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
