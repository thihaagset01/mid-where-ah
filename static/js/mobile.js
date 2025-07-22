// COMPLETELY CLEAN MOBILE.JS - Remove all duplicates and conflicts

// Enhanced global variables for multiple locations
window.userTransportModes = new Map();
window.locationData = new Map();
window.nextPersonId = 1;

// Initialize arrays to prevent errors
window.directionsRenderers = window.directionsRenderers || [];
window.locationMarkers = window.locationMarkers || {};

// Transport modes configuration
const TRANSPORT_MODES = [
    {
        mode: 'TRANSIT',
        icon: '🚇',
        name: 'Public Transport',
        class: 'transit'
    },
    {
        mode: 'DRIVING', 
        icon: '🚗',
        name: 'Car/Taxi',
        class: 'driving'
    },
    {
        mode: 'WALKING',
        icon: '🚶',
        name: 'Walking', 
        class: 'walking'
    }
];

function setupTransportCycling() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('transport-icon')) {
            cycleTransportMode(e.target);
        }
    });
}

function cycleTransportMode(iconElement) {
    const person = iconElement.getAttribute('data-person');
    const currentMode = iconElement.getAttribute('data-current-mode');
    
    // Find current mode index
    const currentIndex = TRANSPORT_MODES.findIndex(mode => mode.mode === currentMode);
    
    // Get next mode (cycle back to 0 if at end)
    const nextIndex = (currentIndex + 1) % TRANSPORT_MODES.length;
    const nextMode = TRANSPORT_MODES[nextIndex];
    
    // Update the icon
    updateTransportIcon(iconElement, nextMode, person);
    
    // Add tap animation
    iconElement.classList.add('tap-animation');
    setTimeout(() => {
        iconElement.classList.remove('tap-animation');
    }, 300);
    
    console.log(`🔄 Person ${person} switched to: ${nextMode.name}`);
}

function updateTransportIcon(iconElement, modeConfig, person) {
    const locationId = `location-${person}`;
    
    // Update icon appearance
    iconElement.textContent = modeConfig.icon;
    iconElement.setAttribute('data-current-mode', modeConfig.mode);
    iconElement.setAttribute('data-tooltip', modeConfig.name);
    
    // Update CSS classes
    iconElement.className = `transport-icon ${modeConfig.class}`;
    
    // Maintain person ID ring color
    const container = iconElement.closest('.location-container');
    if (container) {
        const personId = container.getAttribute('data-person-id');
        if (personId) {
            // Ring color is handled by CSS, no need to modify
        }
    }
    
    // Update global transport mode storage
    if (window.userTransportModes) {
        window.userTransportModes.set(locationId, modeConfig.mode);
    }
    
    // Update stored location data if exists
    if (window.locationData && window.locationData.has(locationId)) {
        const locationData = window.locationData.get(locationId);
        locationData.transportMode = modeConfig.mode;
        window.locationData.set(locationId, locationData);
    }
    
    // Trigger location check if hybrid manager exists
    if (window.hybridLocationManager) {
        window.hybridLocationManager.debouncedLocationCheck();
    }
}


// Debounce function
function debounce(func, wait) {
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

// CLEAN Error notification - only one version
function showErrorNotification(message) {
    console.error('Error:', message);
    
    // Remove existing notification
    const existing = document.getElementById('error-notification');
    if (existing) {
        existing.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.id = 'error-notification';
    notification.style.cssText = `
        position: fixed; 
        top: 80px; 
        left: 50%; 
        transform: translateX(-50%);
        background: rgba(244, 67, 54, 0.95); 
        color: white; 
        padding: 12px 20px;
        border-radius: 8px; 
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999; 
        max-width: 90%; 
        text-align: center;
        font-size: 14px;
        backdrop-filter: blur(10px);
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// CLEAN Routes display function
function showRoutesLegacy(midpoint, locationArray) {
    if (!ensureMapInitialization()) {
        showErrorNotification('Map not ready for route display');
        return;
    }
    
    if (!midpoint || !locationArray || locationArray.length < 2) {
        showErrorNotification('Cannot display routes: Missing map, midpoint, or locations');
        return;
    }
    
    console.log(`🛣️ Displaying ${locationArray.length} routes to midpoint`);
    
    // Clear existing routes
    if (window.directionsRenderers) {
        window.directionsRenderers.forEach(renderer => {
            if (renderer && renderer.setMap) {
                renderer.setMap(null);
            }
        });
    }
    window.directionsRenderers = [];
    
    const directionsService = new google.maps.DirectionsService();
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    
    let routesDisplayed = 0;
    
    locationArray.forEach((location, index) => {
        const renderer = new google.maps.DirectionsRenderer({
            map: window.midwhereahMap,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: colors[index % colors.length],
                strokeWeight: 4,
                strokeOpacity: 0.7
            }
        });
        
        window.directionsRenderers.push(renderer);
        
        const travelMode = location.transportMode || 'TRANSIT';
        const googleMapsMode = travelMode === 'TRANSIT' ? google.maps.TravelMode.TRANSIT :
                              travelMode === 'DRIVING' ? google.maps.TravelMode.DRIVING :
                              google.maps.TravelMode.WALKING;
        
        const request = {
            origin: location.position,
            destination: midpoint,
            travelMode: googleMapsMode
        };
        
        // Add transit options if using public transport
        if (googleMapsMode === google.maps.TravelMode.TRANSIT) {
            request.transitOptions = {
                modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.RAIL],
                routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
            };
        }
        
        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                renderer.setDirections(result);
                routesDisplayed++;
                
                const duration = result.routes[0].legs[0].duration;
                console.log(`🛣️ Route ${index + 1} displayed: ${duration.text} via ${travelMode}`);
                
                // Show success notification when all routes are displayed
                if (routesDisplayed === locationArray.length) {
                    console.log(`✅ All ${routesDisplayed} routes displayed successfully`);
                }
            } else {
                console.error(`❌ Route ${index + 1} failed: ${status}`);
                showErrorNotification(`Could not display route ${index + 1}: ${status}`);
            }
        });
    });
}

// CLEAN HybridLocationManager - single version with add person cooldown
class HybridLocationManager {
    constructor() {
        this.minLocations = 2;
        this.maxLocations = 8;
        this.personCounter = 0; // Will be properly set in initialize()
        this.colors = [
            '#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', 
            '#EC4899', '#10B981', '#F97316', '#6366F1'
        ];
        this.initialized = false;
        this.lastLocationStatus = '';
        this.isAdding = false;
        
        this.debouncedLocationCheck = debounce(this.checkAllLocationsAndShowButton.bind(this), 300);
    }

    initialize() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing HybridLocationManager...');
        
        const existingInputs = document.querySelectorAll('.location-input');
        
        if (existingInputs.length > 0) {
            console.log(`📍 Found ${existingInputs.length} existing location inputs, using hybrid mode`);
            this.setupExistingInputs(existingInputs);
        } else {
            console.log('📍 No existing inputs found, creating new dynamic system');
            this.createInitialInputs();
        }
        
        this.initialized = true;
        console.log('✅ HybridLocationManager initialized');
    }

    setupExistingInputs(inputs) {
        // PROPERLY SET PERSON COUNTER based on existing inputs
        this.personCounter = 0;
        
        inputs.forEach((input, index) => {
            const container = input.closest('.location-container');
            let personId;
            
            if (container && container.hasAttribute('data-person-id')) {
                // Use existing person ID from HTML
                personId = parseInt(container.getAttribute('data-person-id'));
            } else {
                // Assign sequential person ID
                personId = index + 1;
                if (container) {
                    container.setAttribute('data-person-id', personId);
                }
            }
            
            // Update person counter to highest ID
            this.personCounter = Math.max(this.personCounter, personId);
            
            const inputId = input.id || `location-${personId}`;
            input.id = inputId;
            
            // Initialize transport mode
            window.userTransportModes.set(inputId, 'TRANSIT');
            
            // Set up input event listeners
            this.setupInputEventListeners(input);
            
            // Initialize autocomplete when Google Maps is ready
            this.initializeAutocompleteForInput(input);
            
            console.log(`📍 Set up existing input: ${inputId} (Person ${personId})`);
        });
        
        this.updateUIState();
    }

    addLocationInput(personName = null) {
        if (this.isAdding) {
            console.log('🚫 Already adding a person, please wait');
            return null;
        }
        
        if (this.getLocationCount() >= this.maxLocations) {
            showErrorNotification(`Maximum ${this.maxLocations} people allowed`);
            return null;
        }

        this.isAdding = true;
        console.log('🚀 Starting to add location input...');

        // PROPER PERSON ID ASSIGNMENT
        const personId = ++this.personCounter;
        let container = document.getElementById('locations-container');
        
        if (!container) {
            const existingContainer = document.querySelector('.group.group-col.center');
            if (existingContainer) {
                container = existingContainer;
                container.id = 'locations-container';
            } else {
                container = document.createElement('div');
                container.id = 'locations-container';
                container.className = 'group group-col center';
                document.body.appendChild(container);
            }
        }

        // Create location element
        const locationElement = document.createElement('div');
        locationElement.className = 'location-container';
        locationElement.setAttribute('data-person-id', personId);

        const inputId = `location-${personId}`;
        const colorIndex = (personId - 1) % this.colors.length;
        const personColor = this.colors[colorIndex];

        // NEW ELEGANT HTML STRUCTURE
        locationElement.innerHTML = `
            <div class="location-item">
                <div class="transport-icon transit" 
                     data-person="${personId}" 
                     data-current-mode="TRANSIT"
                     data-tooltip="Public Transport">
                    🚇
                </div>
                <input type="text" 
                       class="location-input" 
                       id="${inputId}" 
                       placeholder="${personName ? `${personName}'s location` : `Address ${personId}`}" 
                       autocomplete="off">
                <button class="remove-person-btn" 
                        style="display: ${this.getLocationCount() >= this.minLocations ? 'inline-flex' : 'none'};" 
                        title="Remove Person">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Insert before the add-person-container
        const addPersonContainer = container.querySelector('.add-person-container');
        if (addPersonContainer) {
            container.insertBefore(locationElement, addPersonContainer);
        } else {
            container.appendChild(locationElement);
        }

        // Get references to created elements
        const input = locationElement.querySelector('.location-input');
        const removeBtn = locationElement.querySelector('.remove-person-btn');
        
        // Setup remove button
        removeBtn.addEventListener('click', () => {
            this.removeLocationInput(personId);
        });

        // Setup input listeners
        this.setupInputEventListeners(input);
        
        // Initialize autocomplete
        this.initializeAutocompleteForInput(input);
        
        // Initialize transport mode
        window.userTransportModes.set(inputId, 'TRANSIT');
        
        // Update UI
        this.updateUIState();
        
        console.log(`➕ Added location input for Person ${personId} (${inputId})`);
        
        // Reset adding flag
        setTimeout(() => {
            this.isAdding = false;
        }, 300);

        return { personId, inputId, input, color: personColor };
    }

    removeLocationInput(personId) {
        const container = document.querySelector(`[data-person-id="${personId}"]`);
        if (!container) return;

        const inputId = `location-${personId}`;

        console.log(`➖ Removing location input for Person ${personId} (${inputId})`);

        // Remove from data structures
        window.userTransportModes.delete(inputId);
        window.locationData.delete(inputId);
        
        // Remove marker from map
        if (window.locationMarkers && window.locationMarkers[inputId]) {
            window.locationMarkers[inputId].setMap(null);
            delete window.locationMarkers[inputId];
        }

        // Remove DOM element with animation
        container.style.transition = 'opacity 0.3s, transform 0.3s';
        container.style.opacity = '0';
        container.style.transform = 'translateX(-100%)';
        
        setTimeout(() => {
            container.remove();
            
            // IMPORTANT: Resequence person IDs after removal
            this.resequencePersonIds();
            
            this.updateUIState();
        }, 300);
    }

    // NEW METHOD: Resequence person IDs to keep them consecutive
    resequencePersonIds() {
        const containers = document.querySelectorAll('.location-container[data-person-id]');
        let newPersonCounter = 0;
        
        containers.forEach((container, index) => {
            const newPersonId = index + 1;
            newPersonCounter = newPersonId;
            
            // Update container data attribute
            container.setAttribute('data-person-id', newPersonId);
            
            // Update transport icon data attribute
            const transportIcon = container.querySelector('.transport-icon');
            if (transportIcon) {
                transportIcon.setAttribute('data-person', newPersonId);
            }
            
            // Update input ID and transport mode mapping
            const input = container.querySelector('.location-input');
            if (input) {
                const oldInputId = input.id;
                const newInputId = `location-${newPersonId}`;
                
                // Update input ID
                input.id = newInputId;
                
                // Transfer data if it exists
                if (window.userTransportModes.has(oldInputId)) {
                    const transportMode = window.userTransportModes.get(oldInputId);
                    window.userTransportModes.delete(oldInputId);
                    window.userTransportModes.set(newInputId, transportMode);
                }
                
                if (window.locationData.has(oldInputId)) {
                    const locationData = window.locationData.get(oldInputId);
                    window.locationData.delete(oldInputId);
                    window.locationData.set(newInputId, locationData);
                }
                
                // Update marker if it exists
                if (window.locationMarkers && window.locationMarkers[oldInputId]) {
                    window.locationMarkers[newInputId] = window.locationMarkers[oldInputId];
                    delete window.locationMarkers[oldInputId];
                }
            }
        });
        
        // Update person counter
        this.personCounter = newPersonCounter;
        
        console.log(`🔄 Resequenced person IDs, new counter: ${this.personCounter}`);
    }

    getLocationCount() {
        return document.querySelectorAll('.location-input').length;
    }

    updateUIState() {
        const count = this.getLocationCount();
        const addBtn = document.getElementById('add-person-btn');
        const removeBtns = document.querySelectorAll('.remove-person-btn');
        const personCountSpan = document.getElementById('person-count');

        // Update person count display
        if (personCountSpan) {
            personCountSpan.textContent = count;
        }

        // Show/hide add button
        if (addBtn) {
            addBtn.style.display = count < this.maxLocations ? 'inline-flex' : 'none';
            if (count >= this.maxLocations) {
                addBtn.innerHTML = '<i class="fas fa-users me-1"></i>Max reached';
                addBtn.disabled = true;
            } else {
                addBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Add Person';
                addBtn.disabled = false;
            }
        }

        // Show/hide remove buttons (only show for 3+ people)
        removeBtns.forEach((btn) => {
            const container = btn.closest('.location-container');
            const personId = parseInt(container.getAttribute('data-person-id') || '0');
            const shouldShow = count > this.minLocations && personId > 2;
            
            console.log(`🔍 Person ${personId}: shouldShow=${shouldShow}, count=${count}`);
            btn.style.display = shouldShow ? 'inline-flex' : 'none';
        });

        // Update find button state
        this.debouncedLocationCheck();

        console.log(`📊 UI updated: ${count} people, next ID would be: ${this.personCounter + 1}`);
    }

    setupInputEventListeners(input) {
        // Add input event listener with debouncing
        input.addEventListener('input', () => {
            console.log(`Input changed: ${input.id} = "${input.value}"`);
            this.debouncedLocationCheck();
            this.handleLocationInput(input);
        });
        
        // Add paste event listener
        input.addEventListener('paste', () => {
            setTimeout(() => {
                console.log(`Paste detected: ${input.id} = "${input.value}"`);
                this.debouncedLocationCheck();
                this.handleLocationInput(input);
            }, 100);
        });
    }

    handleLocationInput(input) {
        const value = input.value.trim();
        
        if (value.length >= 3) {
            // Clear any existing timeout
            if (input.geocodeTimeout) {
                clearTimeout(input.geocodeTimeout);
            }
            
            // Set up geocoding with delay (in case autocomplete doesn't work)
            input.geocodeTimeout = setTimeout(() => {
                this.geocodeLocation(input);
            }, 2000); // Wait 2 seconds for autocomplete to work first
        }
    }

    geocodeLocation(input) {
        const value = input.value.trim();
        
        // Don't geocode if we already have data from autocomplete
        if (window.locationData.has(input.id)) {
            return;
        }
        
        if (!window.geocoder && window.google && window.google.maps) {
            window.geocoder = new google.maps.Geocoder();
        }
        
        if (!window.geocoder) {
            console.warn('Geocoder not available yet');
            return;
        }
        
        console.log(`🔍 Fallback geocoding for ${input.id}: "${value}"`);
        
        // Special case handling for known locations with geocoding issues
        const knownLocations = {
            "east coast lagoon food village": { lat: 1.3046, lng: 103.9082 },
            "east coast lagoon food centre": { lat: 1.3046, lng: 103.9082 },
            "east coast park food centre": { lat: 1.3046, lng: 103.9082 }
        };
        
        // Check if this is a known problematic location
        const normalizedValue = value.toLowerCase().trim();
        if (knownLocations[normalizedValue]) {
            console.log(`🔍 Using predefined coordinates for known location: ${value}`);
            const position = knownLocations[normalizedValue];
            const latLng = new google.maps.LatLng(position.lat, position.lng);
            
            // Create a simplified place object
            const place = {
                geometry: { location: latLng },
                formatted_address: value,
                name: value
            };
            
            // Store location data
            window.locationData.set(input.id, {
                place: place,
                position: latLng,
                transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                address: value
            });
            
            // Get person color for marker
            const container = input.closest('.location-container');
            const colorElement = container?.querySelector('.location-icon');
            const personColor = colorElement?.getAttribute('data-person-color') || '#8B5DB8';
            
            addLocationMarker(latLng, input.id, personColor);
            
            console.log(`✅ Used predefined coordinates for ${input.id}: ${value}`);
            this.debouncedLocationCheck();
            return;
        }
        
        // Regular geocoding for other locations
        window.geocoder.geocode({ 
            address: value + ', Singapore',
            componentRestrictions: { country: 'SG' }
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const place = results[0];
                
                // Store location data
                window.locationData.set(input.id, {
                    place: place,
                    position: place.geometry.location,
                    transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                    address: place.formatted_address || place.address_components[0].short_name
                });
                
                // Get person color for marker
                const container = input.closest('.location-container');
                const colorElement = container?.querySelector('.location-icon');
                const personColor = colorElement?.getAttribute('data-person-color') || '#8B5DB8';
                
                addLocationMarker(place.geometry.location, input.id, personColor);
                
                console.log(`✅ Geocoded ${input.id}: ${place.formatted_address}`);
                this.debouncedLocationCheck();
            } else {
                console.warn(`Geocoding failed for ${input.id}:`, status);
            }
        });
    }
    

    setupTransportButtonsForContainer(container, personId, inputId) {
        const transportBtns = container.querySelectorAll('.transport-btn');
        transportBtns.forEach(btn => {
            btn.setAttribute('data-person', personId);
            
            btn.addEventListener('click', (e) => {
                const mode = btn.getAttribute('data-mode');
                this.updateTransportMode(inputId, mode);
                
                // Update UI state
                const personButtons = container.querySelectorAll('.transport-btn');
                personButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                console.log(`🚌 Person ${personId} selected: ${mode}`);
            });
        });
    }

    createInitialInputs() {
        // Create container if it doesn't exist
        let container = document.getElementById('locations-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'locations-container';
            container.className = 'group group-col center';
            
            // Insert after header or at body
            const header = document.querySelector('.group-header-container');
            if (header) {
                header.parentNode.insertBefore(container, header.nextSibling);
            } else {
                document.body.appendChild(container);
            }
        }
        
        // Create 2 initial location inputs
        for (let i = 0; i < 2; i++) {
            this.addLocationInput();
        }
    }


    getLocationCount() {
        return document.querySelectorAll('.location-input').length;
    }


    checkAllLocationsAndShowButton() {
        const inputs = document.querySelectorAll('.location-input');
        const findBtn = document.getElementById('find-central-btn');
        
        if (!findBtn) {
            return;
        }

        let validLocations = 0;
        let totalInputs = inputs.length;

        inputs.forEach(input => {
            const hasText = input.value.trim().length >= 3;
            const hasLocationData = window.locationData.has(input.id);
            const hasMarker = window.locationMarkers && window.locationMarkers[input.id];
            
            // Count as valid if we have text AND (location data OR marker)
            if (hasText && (hasLocationData || hasMarker)) {
                validLocations++;
                input.classList.add('is-valid');
                input.classList.remove('is-invalid');
            } else if (hasText) {
                // Has text but no location data yet - show as pending
                input.classList.add('is-invalid');
                input.classList.remove('is-valid');
            } else {
                input.classList.remove('is-valid', 'is-invalid');
            }
        });

        // Only log if the count has actually changed
        const currentStatus = `${validLocations}/${totalInputs}`;
        if (this.lastLocationStatus !== currentStatus) {
            console.log(`🔍 Location check: ${currentStatus} valid locations`);
            this.lastLocationStatus = currentStatus;
        }

        if (validLocations >= this.minLocations) {
            findBtn.style.display = 'flex';
            findBtn.classList.add('active');
            findBtn.title = `Find optimal meeting point for ${validLocations} people`;
            findBtn.style.opacity = '1';
            findBtn.style.transform = 'scale(1)';
            findBtn.style.pointerEvents = 'auto';
        } else {
            findBtn.style.display = 'none';
            findBtn.classList.remove('active');
        }
    }

    initializeAutocompleteForInput(input) {
        try {
            if (google.maps.places && google.maps.places.Autocomplete) {
                const autocomplete = new google.maps.places.Autocomplete(input, {
                    componentRestrictions: { country: "sg" },
                    fields: ["address_components", "geometry", "name", "formatted_address"],
                    types: ["address"]
                });
                
                input.autocomplete = autocomplete;
                
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry) {
                        console.warn("No details available for: '" + place.name + "'");
                        return;
                    }
                    
                    // Store location data
                    window.locationData.set(input.id, {
                        place: place,
                        position: place.geometry.location,
                        transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                        address: place.formatted_address || place.name
                    });
                    
                    // Get person color for marker
                    const container = input.closest('.location-container');
                    const colorElement = container?.querySelector('.location-icon');
                    const personColor = colorElement?.getAttribute('data-person-color') || '#8B5DB8';
                    
                    addLocationMarker(place.geometry.location, input.id, personColor);
                    this.debouncedLocationCheck();
                    
                    console.log(`📍 Location set for ${input.id}: ${place.formatted_address || place.name}`);
                });
            } else {
                console.warn('Google Maps Places API not available yet. Will retry initialization later.');
                
                // Retry after a delay
                setTimeout(() => {
                    if (google.maps.places && google.maps.places.Autocomplete) {
                        this.initializeAutocompleteForInput(input);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error initializing autocomplete:', error);
        }
    }

    getAllLocationData() {
        const locations = [];
        
        // First try to get from stored location data (autocomplete selections)
        window.locationData.forEach((data, inputId) => {
            if (data.position) {
                locations.push({
                    id: inputId,
                    position: data.position,
                    transportMode: data.transportMode,
                    place: data.place,
                    address: data.address,
                    color: this.getColorForInput(inputId)
                });
            }
        });
        
        // If we don't have enough from locationData, check markers as fallback
        if (locations.length < this.minLocations && window.locationMarkers) {
            Object.keys(window.locationMarkers).forEach(inputId => {
                // Don't duplicate if we already have this from locationData
                if (locations.some(loc => loc.id === inputId)) return;
                
                const marker = window.locationMarkers[inputId];
                const input = document.getElementById(inputId);
                
                if (marker && input && input.value.trim()) {
                    locations.push({
                        id: inputId,
                        position: marker.getPosition(),
                        transportMode: window.userTransportModes.get(inputId) || 'TRANSIT',
                        address: input.value.trim(),
                        color: this.getColorForInput(inputId)
                    });
                }
            });
        }
        
        // Sort by input ID to maintain consistent order
        locations.sort((a, b) => {
            const idA = parseInt(a.id.split('-')[1] || '0');
            const idB = parseInt(b.id.split('-')[1] || '0');
            return idA - idB;
        });
        
        return locations;
    }

    getColorForInput(inputId) {
        const input = document.getElementById(inputId);
        const container = input?.closest('.location-container');
        const colorElement = container?.querySelector('.location-icon');
        return colorElement?.getAttribute('data-person-color') || '#8B5DB8';
    }

    updateTransportMode(inputId, mode) {
        window.userTransportModes.set(inputId, mode);
        
        // Update stored location data
        const locationData = window.locationData.get(inputId);
        if (locationData) {
            locationData.transportMode = mode;
            window.locationData.set(inputId, locationData);
        }

        console.log(`🚌 Updated transport mode for ${inputId}: ${mode}`);
    }
}

// CLEAN Enhanced marker function
function addLocationMarker(location, inputId, color = '#8B5DB8') {
    if (!window.locationMarkers) {
        window.locationMarkers = {};
    }
    
    if (window.locationMarkers[inputId]) {
        window.locationMarkers[inputId].setMap(null);
    }

    const markerIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8
    };

    const marker = new google.maps.Marker({
        position: location,
        map: window.midwhereahMap,
        title: document.getElementById(inputId) ? document.getElementById(inputId).value : 'Location',
        icon: markerIcon,
        animation: google.maps.Animation.DROP
    });

    window.locationMarkers[inputId] = marker;

    if (window.midwhereahMap) {
        window.midwhereahMap.panTo(location);
    }

    setTimeout(() => {
        calculateMidpointFromMarkers();
    }, 100);
}

// SINGLE calculateMidpoint function
// COMPLETE EnhancedSocialMidpointCalculator - Add this to your clean mobile.js
// Replace the simplified calculateSocialMidpoint function with this full version

class EnhancedSocialMidpointCalculator {
    constructor() {
        this.maxIterations = 50;
        this.convergenceThreshold = 50;
        this.initialRadius = 1500;
        this.radiusIncrementFactor = 1.4;
        this.maxSearchRadius = 5000;
        this.minVenuesRequired = 5;
        this.baseMaxTravelTimeMinutes = 60;
        this.maxTravelTimeMinutes = 60;
        this.maxAcceptableTimeDifference = 10;
        this.equityWeight = 0.9;
        this.totalTimeWeight = 0.1;
        this.socialPlaceTypes = [
            'restaurant', 'cafe', 'shopping_mall', 'food', 
            'establishment', 'store', 'meal_takeaway', 'bakery'
        ];
        
        // Memoization cache for travel time calculations
        this.travelTimeCache = new Map();
    }

    adjustParametersForGroupSize(groupSize) {
        console.log(`⚙️ Adjusting parameters for group size: ${groupSize} people`);
        
        if (groupSize <= 2) {
            this.maxAcceptableTimeDifference = 10;
            this.equityWeight = 0.9;
            this.totalTimeWeight = 0.1;
            console.log(`   📏 Small group: 10min max difference, high equity focus`);
        } else if (groupSize <= 4) {
            this.maxAcceptableTimeDifference = 15;
            this.equityWeight = 0.8;
            this.totalTimeWeight = 0.2;
            console.log(`   📏 Medium group: 15min max difference, balanced approach`);
        } else if (groupSize <= 6) {
            this.maxAcceptableTimeDifference = 20;
            this.equityWeight = 0.7;
            this.totalTimeWeight = 0.3;
            console.log(`   📏 Large group: 20min max difference, efficiency focus`);
        } else {
            // For very large groups (7+), we need to be more lenient
            this.maxAcceptableTimeDifference = 25;
            this.equityWeight = 0.6;
            this.totalTimeWeight = 0.4;
            console.log(`   📏 Very large group: 25min max difference, high efficiency focus`);
        }
    }

    adjustParametersForDistance(startingLocations) {
        const distance = this.calculateDistance(
            { lat: startingLocations[0].lat(), lng: startingLocations[0].lng() },
            { lat: startingLocations[1].lat(), lng: startingLocations[1].lng() }
        );

        const distanceKm = distance / 1000;

        if (distanceKm > 30) {
            this.maxTravelTimeMinutes = 90;
            console.log(`🌏 Extreme distance (${distanceKm.toFixed(1)}km): Allowing up to 90min travel, ${this.maxAcceptableTimeDifference}min range`);
        } else if (distanceKm > 15) {
            this.maxTravelTimeMinutes = 75;
            console.log(`🌏 Long distance (${distanceKm.toFixed(1)}km): Allowing up to 75min travel, ${this.maxAcceptableTimeDifference}min range`);
        } else {
            this.maxTravelTimeMinutes = 60;
            console.log(`📍 Normal distance (${distanceKm.toFixed(1)}km): Allowing up to 60min travel, ${this.maxAcceptableTimeDifference}min range`);
        }
    }

    calculateGeometricMidpoint(locations) {
        let totalLat = 0, totalLng = 0;
        locations.forEach(location => {
            const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
            const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
            totalLat += lat;
            totalLng += lng;
        });
        return { 
            lat: totalLat / locations.length, 
            lng: totalLng / locations.length 
        };
    }
    
    /**
     * Calculate a weighted midpoint that considers transport modes
     * Gives higher weight to public transit users and lower weight to walkers
     */
    calculateWeightedMidpoint(locations) {
        let totalWeight = 0;
        let weightedLat = 0;
        let weightedLng = 0;
        
        locations.forEach((location, index) => {
            const locationId = `location-${index + 1}`;
            const transportMode = window.userTransportModes.get(locationId) || 'TRANSIT';
            
            // Assign weights based on transport mode
            const weight = transportMode === 'WALKING' ? 0.5 :
                          transportMode === 'DRIVING' ? 1.0 :
                          1.2; // TRANSIT gets priority
            
            const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
            const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
            
            weightedLat += lat * weight;
            weightedLng += lng * weight;
            totalWeight += weight;
        });
        
        return {
            lat: weightedLat / totalWeight,
            lng: weightedLng / totalWeight
        };
    }
    
    /**
     * Check if a point is likely inside a nature reserve or venue desert
     * Uses hardcoded bounding boxes for common Singapore nature reserves
     */
    isLikelyInNatureReserve(point) {
        // Central Catchment Nature Reserve (including MacRitchie)
        if (point.lat > 1.34 && point.lat < 1.39 && 
            point.lng > 103.77 && point.lng < 103.84) {
            return true;
        }
        
        // Bukit Timah Nature Reserve
        if (point.lat > 1.341 && point.lat < 1.362 && 
            point.lng > 103.765 && point.lng < 103.784) {
            return true;
        }
        
        // Sungei Buloh Wetland Reserve
        if (point.lat > 1.44 && point.lat < 1.45 && 
            point.lng > 103.72 && point.lng < 103.73) {
            return true;
        }
        
        // Pulau Ubin
        if (point.lat > 1.40 && point.lat < 1.42 && 
            point.lng > 103.94 && point.lng < 104.00) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Find a common MRT hub near the geometric midpoint
     * Returns the location of a major MRT interchange if one is nearby
     */
    findNearbyMRTHub(midpoint) {
        // Major MRT interchanges in Singapore
        const mrtHubs = [
            { name: "Dhoby Ghaut", lat: 1.2993, lng: 103.8455 },
            { name: "City Hall", lat: 1.2931, lng: 103.8519 },
            { name: "Raffles Place", lat: 1.2836, lng: 103.8511 },
            { name: "Bugis", lat: 1.3008, lng: 103.8559 },
            { name: "Paya Lebar", lat: 1.3181, lng: 103.8927 },
            { name: "Serangoon", lat: 1.3498, lng: 103.8736 },
            { name: "Bishan", lat: 1.3513, lng: 103.8483 },
            { name: "Jurong East", lat: 1.3329, lng: 103.7421 },
            { name: "Woodlands", lat: 1.4368, lng: 103.7864 },
            { name: "Tampines", lat: 1.3527, lng: 103.9453 },
            { name: "Clementi", lat: 1.3150, lng: 103.7651 },
            { name: "Novena", lat: 1.3204, lng: 103.8439 },
            { name: "Orchard", lat: 1.3040, lng: 103.8318 },
            { name: "Outram Park", lat: 1.2813, lng: 103.8394 },
            { name: "Harbourfront", lat: 1.2659, lng: 103.8209 },
            { name: "Buona Vista", lat: 1.3070, lng: 103.7904 }
        ];
        
        // Find closest MRT hub to the midpoint
        let closestHub = null;
        let minDistance = Infinity;
        
        mrtHubs.forEach(hub => {
            const distance = this.calculateDistance(midpoint, hub);
            if (distance < minDistance) {
                minDistance = distance;
                closestHub = hub;
            }
        });
        
        // Only return the hub if it's reasonably close (within 3km)
        if (minDistance <= 3000) {
            console.log(`🚇 Found nearby MRT hub: ${closestHub.name} (${minDistance.toFixed(0)}m away)`);
            return closestHub;
        }
        
        console.log(`❌ No nearby MRT hub found (closest is ${minDistance.toFixed(0)}m away)`);
        return null;
    }
    
    /**
     * Get a smart initial midpoint that avoids nature reserves and venue deserts
     * Uses a hybrid approach with fallbacks
     */
    async getSmartInitialMidpoint(locations) {
        // Step 1: Calculate geometric midpoint as baseline
        const geoMidpoint = this.calculateGeometricMidpoint(locations);
        console.log(`📍 Geometric midpoint: ${geoMidpoint.lat.toFixed(4)}, ${geoMidpoint.lng.toFixed(4)}`);
        
        // Step 2: Check if it's in a nature reserve
        if (this.isLikelyInNatureReserve(geoMidpoint)) {
            console.log(`⚠️ Geometric midpoint appears to be in a nature reserve or venue desert`);
            
            // Step 3a: Try finding a nearby MRT hub
            const mrtHub = this.findNearbyMRTHub(geoMidpoint);
            if (mrtHub) {
                console.log(`🚇 Using MRT hub ${mrtHub.name} as initial midpoint`);
                return mrtHub;
            }
            
            // Step 3b: Fall back to weighted midpoint
            const weightedMidpoint = this.calculateWeightedMidpoint(locations);
            console.log(`⚖️ Using weighted midpoint: ${weightedMidpoint.lat.toFixed(4)}, ${weightedMidpoint.lng.toFixed(4)}`);
            
            // Step 3c: Check if weighted midpoint is also in a nature reserve
            if (this.isLikelyInNatureReserve(weightedMidpoint)) {
                console.log(`⚠️ Weighted midpoint also appears to be in a nature reserve`);
                
                // Step 3d: Fall back to closest viable area (Novena as a general fallback)
                console.log(`🏙️ Falling back to Novena as a viable venue area`);
                return { name: "Novena", lat: 1.3204, lng: 103.8439 };
            }
            
            return weightedMidpoint;
        }
        
        // If geometric midpoint is not in a nature reserve, use it
        return geoMidpoint;
    }

    calculateDistance(point1, point2) {
        const lat1 = typeof point1.lat === 'function' ? point1.lat() : point1.lat;
        const lng1 = typeof point1.lng === 'function' ? point1.lng() : point1.lng;
        const lat2 = typeof point2.lat === 'function' ? point2.lat() : point2.lat;
        const lng2 = typeof point2.lng === 'function' ? point2.lng() : point2.lng;
        
        const R = 6371000;
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }
    
    calculateGeographicSpread() {
        // Calculate the geographic spread of locations to determine if they're widely distributed
        if (!this.locations || this.locations.length < 2) return 0;
        
        // Extract lat/lng values
        const lats = this.locations.map(loc => loc.lat);
        const lngs = this.locations.map(loc => loc.lng);
        
        // Calculate ranges
        const latRange = Math.max(...lats) - Math.min(...lats);
        const lngRange = Math.max(...lngs) - Math.min(...lngs);
        
        // Combine into a single spread metric (Singapore is roughly 0.2 degrees across)
        const spread = Math.sqrt(latRange * latRange + lngRange * lngRange);
        console.log(`🌏 Geographic spread calculation: lat range ${latRange.toFixed(4)}, lng range ${lngRange.toFixed(4)}, combined spread ${spread.toFixed(4)}`);
        
        return spread;
    }

    showRadiusCircle(center, radius, existingCircle) {
        if (existingCircle) existingCircle.setMap(null);
        
        const circle = new google.maps.Circle({
            strokeColor: '#8B5DB8',
            strokeOpacity: 0.6,
            strokeWeight: 2,
            fillColor: '#8B5DB8',
            fillOpacity: 0.1,
            map: window.midwhereahMap,
            center: new google.maps.LatLng(center.lat, center.lng),
            radius: radius
        });
        
        return circle;
    }

    async calculateSocialMidpoint(startingLocations) {
        const groupSize = startingLocations.length;
        console.log(`🚀 Starting Enhanced Social Fairness Algorithm for ${groupSize} people...`);
        
        if (groupSize < 2) {
            throw new Error('Need at least 2 locations for midpoint calculation');
        }

        this.adjustParametersForGroupSize(groupSize);
        this.adjustParametersForDistance(startingLocations);
        
        // Get a smart initial midpoint instead of pure geometric average
        let currentSearchCenter = await this.getSmartInitialMidpoint(startingLocations);
        let searchRadius = this.initialRadius;
        let bestMidpoint = null;
        let previousBestScore = Infinity;
        let bestScore = Infinity;
        let radiusCircle = null;
        let iteration = 0;
        let noImprovementCount = 0;
        let bestVariance = Infinity;
        let bestRange = Infinity;
        
        while (iteration < this.maxIterations && searchRadius <= this.maxSearchRadius) {
            iteration++;
            console.log(`🔍 Iteration ${iteration}: Searching ${searchRadius}m radius for ${groupSize} people`);
            
            radiusCircle = this.showRadiusCircle(currentSearchCenter, searchRadius, radiusCircle);
            
            // 🔥 ACTUAL VENUE SEARCH
            const socialVenues = await this.findSocialVenues(currentSearchCenter, searchRadius);
            
            if (socialVenues.length < this.minVenuesRequired) {
                console.log(`❌ Only ${socialVenues.length} venues found, need ${this.minVenuesRequired}. Expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            console.log(`✅ Found ${socialVenues.length} venues to analyze`);
            
            // 🔥 VENUE ANALYSIS FOR TRAVEL EQUITY
            const venueAnalysis = await this.analyzeVenueTravelEquity(socialVenues, startingLocations);
            
            if (venueAnalysis.length === 0) {
                console.log(`❌ No accessible venues found. Expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            // 🔥 FIND MOST EQUITABLE VENUE
            const currentBestVenue = this.findMostEquitableVenue(venueAnalysis);
            
            if (currentBestVenue && currentBestVenue.equityScore < bestScore) {
                // Calculate improvement in equity score
                const equityImprovement = bestScore - currentBestVenue.equityScore;
                previousBestScore = bestScore;
                bestScore = currentBestVenue.equityScore;
                bestMidpoint = currentBestVenue.location;
                bestVariance = currentBestVenue.timeVariance;
                bestRange = currentBestVenue.timeRange;
                noImprovementCount = 0;
                
                console.log(`⭐ New best venue: ${currentBestVenue.name}`);
                console.log(`   Max travel time: ${currentBestVenue.maxTravelTime.toFixed(1)}min`);
                console.log(`   Avg travel time: ${currentBestVenue.avgTravelTime.toFixed(1)}min`);
                console.log(`   Time variance: ${currentBestVenue.timeVariance.toFixed(1)}min²`);
                console.log(`   Equity score: ${currentBestVenue.equityScore.toFixed(2)}`);
                console.log(`   Improvement: ${equityImprovement.toFixed(3)}`);
                
                // Update search center to focus around the best venue
                currentSearchCenter = {
                    lat: currentBestVenue.location.lat,
                    lng: currentBestVenue.location.lng
                };
                
                // If we have a significant improvement, aggressively refocus
                if (equityImprovement > 0.05) {
                    searchRadius = Math.max(400, searchRadius * 0.5);
                    console.log(`🎯 Significant improvement! Aggressively focusing search, radius now ${searchRadius}m`);
                } else {
                    searchRadius = Math.max(400, searchRadius * 0.6);
                    console.log(`🎯 Focusing search around best venue, radius now ${searchRadius}m`);
                }
            } else {
                noImprovementCount++;
                searchRadius *= this.radiusIncrementFactor;
                console.log(`🔄 No improvement found (${noImprovementCount} iterations), expanding to ${searchRadius}m`);
            }
            
            // Check for diminishing returns - exit if minimal improvement over multiple iterations
            if (iteration >= 5 && previousBestScore - bestScore < 0.02 && noImprovementCount >= 2) {
                console.log(`⚠️ Equity improvement too small (${(previousBestScore - bestScore).toFixed(3)}), halting after ${iteration} iterations`);
                break;
            }
            
            // Early termination for excellent results - only if ALL criteria are met
            if (bestMidpoint && currentBestVenue && 
                currentBestVenue.timeVariance < 4.0 && 
                currentBestVenue.timeRange <= this.maxAcceptableTimeDifference * 0.8 &&
                currentBestVenue.avgTravelTime < 40) {
                console.log(`🏆 Excellent equity found (variance < 4min², range ≤ ${(this.maxAcceptableTimeDifference * 0.8).toFixed(1)}min, avg ≤ 40min), stopping early!`);
                break;
            }
        }
        
        setTimeout(() => {
            if (radiusCircle) radiusCircle.setMap(null);
        }, 3000);
        
        if (bestMidpoint) {
            console.log(`✅ Algorithm complete! Best location found with equity score: ${bestScore.toFixed(2)}`);
            return new google.maps.LatLng(bestMidpoint.lat, bestMidpoint.lng);
        } else {
            console.log(`⚠️ No suitable venues found, falling back to geometric midpoint`);
            const fallback = this.calculateGeometricMidpoint(startingLocations);
            return new google.maps.LatLng(fallback.lat, fallback.lng);
        }
    }

    async findSocialVenues(center, radius) {
        return new Promise((resolve) => {
            if (!window.placesService) {
                console.warn('Places service not available');
                resolve([]);
                return;
            }

            window.placesService.nearbySearch({
                location: new google.maps.LatLng(center.lat, center.lng),
                radius: radius,
                types: this.socialPlaceTypes,
                openNow: true
            }, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    const filtered = results.filter(place => {
                        if (!place.rating || place.rating < 3.8) return false;
                        if (!place.user_ratings_total || place.user_ratings_total < 5) return false;
                        
                        const name = place.name.toLowerCase();
                        const excludeKeywords = [
                            'private', 'club', 'country club', 'golf', 'yacht',
                            'members only', 'exclusive', 'condo', 'condominium',
                            'sicc', 'tcc', 'rcc', 'acc', 'scc', 'sgcc',
                            'reservoir', 'cemetery', 'hospital', 'clinic'
                        ];
                        
                        if (excludeKeywords.some(keyword => name.includes(keyword))) {
                            return false;
                        }
                        
                        const goodTypes = [
                            'restaurant', 'cafe', 'shopping_mall', 'food', 'establishment', 
                            'store', 'bakery', 'bar', 'movie_theater', 'park'
                        ];
                        const hasGoodType = place.types.some(type => goodTypes.includes(type));
                        
                        return hasGoodType;
                    });
                    
                    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                    const topVenues = filtered.slice(0, 15);
                    
                    console.log(`   Filtered to ${topVenues.length} high-quality venues`);
                    resolve(topVenues);
                } else {
                    console.warn(`   Places search failed: ${status}`);
                    resolve([]);
                }
            });
        });
    }

    async analyzeVenueTravelEquity(venues, startingLocations) {
        console.log(`📊 Analyzing travel equity for ${venues.length} venues...`);
        const directionsService = new google.maps.DirectionsService();
        const analysis = [];
        
        // Pre-filter venues if we have too many to analyze
        let venuesToAnalyze = venues;
        if (venues.length > 15) {
            // For large venue sets, prioritize highly-rated venues in the first pass
            venuesToAnalyze = venues
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 15);
            console.log(`   ⚡ Pre-filtered to ${venuesToAnalyze.length} highest-rated venues to reduce API calls`);
        }

        for (let i = 0; i < venuesToAnalyze.length; i++) {
            const venue = venuesToAnalyze[i];
            
            const modeResult = await this.calculateTravelTimesForVenue(
                directionsService, 
                startingLocations, 
                venue.geometry.location,
                venue.name
            );
            
            if (!modeResult) {
                console.log(`❌ ${venue.name}: Cannot reach with selected transport modes`);
                continue;
            }
            
            const { travelTimes, transportModes, mixedMode } = modeResult;
            
            const maxTime = Math.max(...travelTimes);
            const minTime = Math.min(...travelTimes);
            const avgTime = travelTimes.reduce((a, b) => a + b, 0) / travelTimes.length;
            const timeVariance = this.calculateVariance(travelTimes);
            const timeRange = maxTime - minTime;
            
            // Raw equity score (will be normalized later)
            const rawEquityScore = this.calculateEquityScore(travelTimes, avgTime, mixedMode, timeRange);
            
            analysis.push({
                name: venue.name,
                location: {
                    lat: venue.geometry.location.lat(),
                    lng: venue.geometry.location.lng()
                },
                travelTimes: travelTimes,
                maxTravelTime: maxTime,
                minTravelTime: minTime,
                avgTravelTime: avgTime,
                timeVariance: timeVariance,
                timeRange: timeRange,
                rawEquityScore: rawEquityScore,
                rating: venue.rating,
                types: venue.types,
                venue: venue,
                transportModes: transportModes,
                mixedMode: mixedMode
            });
        }
        
        // Normalize scores across this iteration's venues
        if (analysis.length > 0) {
            // Find min/max values for normalization
            const minVar = Math.min(...analysis.map(v => v.timeVariance));
            const maxVar = Math.max(...analysis.map(v => v.timeVariance));
            const minAvg = Math.min(...analysis.map(v => v.avgTravelTime));
            const maxAvg = Math.max(...analysis.map(v => v.avgTravelTime));
            const minRange = Math.min(...analysis.map(v => v.timeRange));
            const maxRange = Math.max(...analysis.map(v => v.timeRange));
            
            // Small epsilon to avoid division by zero
            const epsilon = 0.001;
            
            // Calculate normalized scores
            analysis.forEach(venue => {
                const normalizedVariance = (venue.timeVariance - minVar) / (maxVar - minVar + epsilon);
                const normalizedAvg = (venue.avgTravelTime - minAvg) / (maxAvg - minAvg + epsilon);
                const normalizedRange = (venue.timeRange - minRange) / (maxRange - minRange + epsilon);
                
                // Weighted normalized equity score
                venue.equityScore = normalizedVariance * 0.6 + normalizedAvg * 0.2 + normalizedRange * 0.2;
            });
            
            console.log(`   📊 Applied per-iteration normalization to equity scores`);
        }

        analysis.sort((a, b) => a.equityScore - b.equityScore);
        
        console.log(`   ✅ Successfully analyzed ${analysis.length} venues`);
        
        // Enhanced debug logging for top venues
        console.log(`\n📊 Top venues ranked by equity score:`);
        analysis.slice(0, 5).forEach((venue, idx) => {
            const modeText = venue.mixedMode ? 
                `${venue.transportModes[0]}/${venue.transportModes[1]}` : 
                venue.transportModes[0];
            console.log(`   ${idx + 1}. ${venue.name} [${modeText}]:`);
            console.log(`      - Equity score: ${venue.equityScore.toFixed(2)}`);
            console.log(`      - Travel times: ${venue.travelTimes.map(t => t.toFixed(0)).join(', ')} mins`);
            console.log(`      - Range: ${venue.timeRange.toFixed(1)}min (${venue.minTravelTime.toFixed(0)}-${venue.maxTravelTime.toFixed(0)}min)`);
            console.log(`      - Variance: ${venue.timeVariance.toFixed(1)}min²`);
            console.log(`      - Average: ${venue.avgTravelTime.toFixed(1)}min`);
        });
        console.log(`\n`);
        
        return analysis;
    }

    async calculateTravelTimesForVenue(directionsService, startingLocations, destination, venueName) {
        console.log(`🚌 Calculating travel times for ${venueName}...`);
        
        const userModes = [];
        startingLocations.forEach((_, index) => {
            const locationId = `location-${index + 1}`;
            userModes.push(window.userTransportModes.get(locationId) || 'TRANSIT');
        });
        
        const travelTimes = [];
        const actualModes = [];
        
        for (let personIdx = 0; personIdx < startingLocations.length; personIdx++) {
            const preferredMode = userModes[personIdx];
            const googleMapsMode = this.convertToGoogleMapsMode(preferredMode);
            
            try {
                const time = await this.getTravelTime(
                    directionsService,
                    startingLocations[personIdx],
                    destination,
                    googleMapsMode
                );
                
                if (!time) {
                    return null;
                }
                
                travelTimes.push(time);
                actualModes.push(preferredMode);
                
            } catch (error) {
                console.log(`     ❌ Person ${personIdx + 1}: ${preferredMode} error - ${error.message}`);
                return null;
            }
        }
        
        return {
            travelTimes: travelTimes,
            transportModes: actualModes,
            mixedMode: actualModes[0] !== actualModes[1]
        };
    }

    async getTravelTime(directionsService, origin, destination, travelMode) {
        // Create a cache key using origin, destination, and travel mode
        const originLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat;
        const originLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng;
        const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
        const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;
        
        const cacheKey = `${originLat},${originLng}_${destLat},${destLng}_${travelMode}`;
        
        // Check if result is already in cache
        if (this.travelTimeCache.has(cacheKey)) {
            console.log(`   ⚡ Using cached travel time for ${travelMode} route`);
            return this.travelTimeCache.get(cacheKey);
        }
        
        return new Promise((resolve, reject) => {
            const request = {
                origin: origin,
                destination: destination,
                travelMode: travelMode
            };
            
            if (travelMode === google.maps.TravelMode.TRANSIT) {
                request.transitOptions = {
                    modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.RAIL],
                    routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
                };
            }
            
            directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    const durationMinutes = result.routes[0].legs[0].duration.value / 60;
                    
                    // Store result in cache
                    this.travelTimeCache.set(cacheKey, durationMinutes);
                    
                    resolve(durationMinutes);
                } else {
                    reject(new Error(`Directions failed: ${status}`));
                }
            });
        });
    }

    findMostEquitableVenue(analysis) {
        if (!analysis || analysis.length === 0) return null;
        
        // First, check if any venue has exceptionally low variance and range
        // even if equity score isn't the absolute best
        for (let i = 1; i < Math.min(5, analysis.length); i++) {
            const venue = analysis[i];
            const bestVenue = analysis[0];
            
            // If this venue has significantly better variance and range, promote it
            // even if equity score is slightly worse (within 0.1)
            if (venue.timeVariance < bestVenue.timeVariance * 0.7 && 
                venue.timeRange < bestVenue.timeRange * 0.8 &&
                venue.equityScore - bestVenue.equityScore < 0.1) {
                
                console.log(`   🔄 Promoting ${venue.name} due to better variance/range metrics`);
                console.log(`      Variance: ${venue.timeVariance.toFixed(1)} vs ${bestVenue.timeVariance.toFixed(1)}`);
                console.log(`      Range: ${venue.timeRange.toFixed(1)} vs ${bestVenue.timeRange.toFixed(1)}`);
                return venue;
            }
        }
        
        return analysis[0]; // Return the venue with best equity score
    }

    calculateEquityScore(travelTimes, avgTime, mixedMode, timeRange) {
        const timeVariance = this.calculateVariance(travelTimes);
        
        // Skip venues with excessive max travel time (>85% of max allowed)
        // For large groups (7+), we allow up to 90% of max allowed time
        // For very large groups (8+) with diverse locations, we allow up to 100% of max allowed time
        // Dynamically determine max allowed travel time based on this.maxTravelTimeMinutes
        const maxAllowedTravelTime = this.maxTravelTimeMinutes || 60; // minutes
        const maxTravelTime = Math.max(...travelTimes);
        let maxTravelTimeThreshold;
        
        // Calculate geographic diversity by measuring the range of latitudes and longitudes
        const geoSpread = this.calculateGeographicSpread();
        
        if (travelTimes.length >= 8) {
            // For very large groups (8+), scale threshold based on geographic spread
            if (geoSpread > 0.15) { // High geographic diversity
                maxTravelTimeThreshold = 1.5; // 150% for 8+ people with high geographic diversity
                console.log(`   💡 Very large group (8+) with high geographic diversity: Using extra lenient max travel time threshold of 150%`);
            } else {
                maxTravelTimeThreshold = 1.2; // 120% for 8+ people with normal geographic diversity
                console.log(`   💡 Very large group (8+): Using lenient max travel time threshold of 120%`);
            }
        } else if (travelTimes.length >= 7) {
            maxTravelTimeThreshold = 1.0; // 100% for 7 people
            console.log(`   💡 Large group (7): Using lenient max travel time threshold of 100%`);
        } else {
            maxTravelTimeThreshold = 0.85; // 85% for smaller groups
        }
        
        const effectiveMaxTravelTime = maxAllowedTravelTime * maxTravelTimeThreshold;
        if (maxTravelTime > effectiveMaxTravelTime) {
            console.log(`⛔ Skipping venue with excessive max travel time: ${maxTravelTime.toFixed(1)}min > ${effectiveMaxTravelTime.toFixed(1)}min`);
            return null;
        }
        
        // Skip venues with excessive time range (>120% of maxAcceptableTimeDifference)
        // For large groups (7+), we allow up to 130% of maxAcceptableTimeDifference
        const rangeThreshold = travelTimes.length >= 7 ? 1.3 : 1.2;
        console.log(`   🔍 DEBUG: maxAcceptableTimeDifference=${this.maxAcceptableTimeDifference}, rangeThreshold=${rangeThreshold}, travelTimes.length=${travelTimes.length}`);
        if (timeRange > this.maxAcceptableTimeDifference * rangeThreshold) {
            console.log(`⛔ Skipping venue with excessive time range: ${timeRange.toFixed(1)}min > ${(this.maxAcceptableTimeDifference * rangeThreshold).toFixed(1)}min`);
            return null;
        }
        
        const normalizedVariance = timeVariance / 100;
        const normalizedRange = timeRange / 60;
        const normalizedAvgTime = avgTime / this.maxTravelTimeMinutes;
        
        let equityScore = (normalizedVariance * 0.5) + 
                        (normalizedRange * 0.3) + 
                        (normalizedAvgTime * 0.4);
        
        // Apply penalty for high time range regardless of mode
        if (timeRange > this.maxAcceptableTimeDifference * 0.8) {
            const rangePenalty = Math.pow(timeRange / this.maxAcceptableTimeDifference, 1.5) * 0.3;
            equityScore += rangePenalty;
            console.log(`   ⚠️ Applied range penalty: +${rangePenalty.toFixed(2)} (range: ${timeRange.toFixed(1)}min)`); 
        }
        
        // Additional penalty for mixed mode
        if (mixedMode) {
            const mixedModePenalty = 0.15; // Fixed penalty for mixed mode
            equityScore += mixedModePenalty;
            console.log(`   ⚠️ Applied mixed mode penalty: +${mixedModePenalty.toFixed(2)}`);
        }
        
        return equityScore;
    }

    convertToGoogleMapsMode(uiMode) {
        switch (uiMode) {
            case 'TRANSIT': return google.maps.TravelMode.TRANSIT;
            case 'DRIVING': return google.maps.TravelMode.DRIVING;
            case 'WALKING': return google.maps.TravelMode.WALKING;
            default: return google.maps.TravelMode.TRANSIT;
        }
    }
}

// REPLACE the simplified calculateSocialMidpoint function with this full version:
async function calculateSocialMidpoint(locations) {
    if (!locations || !Array.isArray(locations) || locations.length < 2) {
        throw new Error('Invalid locations provided for midpoint calculation');
    }
    
    try {
        console.log(`🚀 Starting social midpoint calculation for ${locations.length} people...`);
        
        const validLocations = locations.filter(loc => {
            if (!loc) return false;
            if (typeof loc.lat !== 'function' && typeof loc.lat !== 'number') return false;
            if (typeof loc.lng !== 'function' && typeof loc.lng !== 'number') return false;
            return true;
        });
        
        if (validLocations.length < 2) {
            throw new Error('Not enough valid locations for calculation');
        }
        
        // 🔥 USE THE FULL RECOMMENDATION ENGINE
        const calculator = new EnhancedSocialMidpointCalculator();
        const result = await calculator.calculateSocialMidpoint(validLocations);
        
        if (result && result.lat && result.lng) {
            console.log(`🎯 Enhanced social midpoint calculation successful for ${validLocations.length} people`);
            return result;
        } else {
            throw new Error('Enhanced algorithm returned invalid result');
        }
    } catch (error) {
        console.warn(`Enhanced calculation failed:`, error);
        showErrorNotification('Using simple midpoint calculation');
        return calculateMidpoint(locations);
    }
}

function calculateMidpointFromMarkers() {
    const markers = Object.values(window.locationMarkers || {}).filter(marker => marker);
    
    if (markers.length >= 2) {
        const locations = markers.map(marker => marker.getPosition());
        window.calculatedMidpoint = calculateMidpoint(locations);
        console.log('Geometric midpoint calculated:', window.calculatedMidpoint);
    }
}

// CLEAN Map initialization
async function initMap() {
    console.log('initMap called');

    const singapore = { lat: 1.3521, lng: 103.8198 };

    try {
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found!");
            return;
        }
        
        console.log('Map container found:', mapContainer);
        
        if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
            console.log('Fixing map container dimensions');
            mapContainer.style.width = '100vw';
            mapContainer.style.height = '100vh';
        }
        
        const { Map } = await google.maps.importLibrary("maps");
        const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
        
        window.PlaceAutocompleteElement = PlaceAutocompleteElement;
        
        const map = new Map(mapContainer, {
            center: singapore,
            zoom: 10,
            mapTypeControl: false,
            fullscreenControl: false,    // ✅ Already disabled
            streetViewControl: false,
            zoomControl: false,
            // Additional controls to ensure clean interface
            gestureHandling: 'greedy',   // Allow smooth touch gestures
            clickableIcons: false,       // Disable POI clicks for cleaner UX
            disableDefaultUI: false,     // Keep some default UI but customize
            keyboardShortcuts: false,    // Disable keyboard shortcuts
        });
        
        window.midwhereahMap = map;
        
        window.dispatchEvent(new Event('resize'));
        
        await initLocationAutocomplete();
        
        setupMapMarkers();
        
        window.placesService = new google.maps.places.PlacesService(map);
        
        console.log("Google Maps initialized successfully - No fullscreen control");
        
        // Initialize hybrid location manager after map is ready
        if (window.hybridLocationManager) {
            window.hybridLocationManager.initialize();
        }
    } catch (error) {
        console.error("Error initializing Google Maps:", error);
    }
}

// Initialize Google Places Autocomplete for location inputs
async function initLocationAutocomplete() {
    const locationInputs = document.querySelectorAll('.location-input');

    try {
        if (window.PlaceAutocompleteElement) {
            console.log('Using PlaceAutocompleteElement API');
            await initWithPlaceAutocompleteElement(locationInputs);
        } else {
            console.log('Loading Places API...');
            const { Autocomplete } = await google.maps.importLibrary("places");
            window.Autocomplete = Autocomplete;
            console.log('Falling back to legacy Autocomplete API');
            initWithLegacyAutocomplete(locationInputs);
        }
    } catch (error) {
        console.error('Error initializing location autocomplete:', error);
    }
}

async function initWithPlaceAutocompleteElement(locationInputs) {
    try {
        locationInputs.forEach(input => {
            const wrapper = document.createElement('div');
            wrapper.className = 'place-autocomplete-wrapper';
            
            const parent = input.parentNode;
            parent.insertBefore(wrapper, input);
            parent.removeChild(input);
            
            const autocompleteElement = new window.PlaceAutocompleteElement({
                inputElement: input,
                componentRestrictions: { country: "sg" },
                types: ["address"]
            });
            
            wrapper.appendChild(input);
            
            input.autocompleteElement = autocompleteElement;
            
            autocompleteElement.addEventListener('place_changed', function() {
                try {
                    const place = autocompleteElement.getPlace();
                    if (!place || !place.geometry) {
                        console.warn("No details available for selected place");
                        return;
                    }
                    
                    // Store location data
                    window.locationData.set(input.id, {
                        place: place,
                        position: place.geometry.location,
                        transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                        address: place.formatted_address || place.name
                    });
                    
                    // Get person color for marker
                    const container = input.closest('.location-container');
                    const colorElement = container?.querySelector('.location-icon');
                    const personColor = colorElement?.getAttribute('data-person-color') || '#8B5DB8';
                    
                    addLocationMarker(place.geometry.location, input.id, personColor);
                    
                    // Use the hybrid manager's debounced method
                    if (window.hybridLocationManager) {
                        window.hybridLocationManager.debouncedLocationCheck();
                    }
                } catch (error) {
                    console.error('Error handling place selection:', error);
                }
            });
        });
    } catch (error) {
        console.error('Error initializing PlaceAutocompleteElement:', error);
    }
}

function initWithLegacyAutocomplete(locationInputs) {
    try {
        locationInputs.forEach(input => {
            const autocomplete = new window.Autocomplete(input, {
                componentRestrictions: { country: "sg" },
                fields: ["address_components", "geometry", "name", "formatted_address"],
                types: ["address"]
            });
            
            input.autocomplete = autocomplete;
            
            autocomplete.addListener('place_changed', function() {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    console.warn("No details available for: '" + place.name + "'");
                    return;
                }
                
                // Store location data
                window.locationData.set(input.id, {
                    place: place,
                    position: place.geometry.location,
                    transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                    address: place.formatted_address || place.name
                });
                
                // Get person color for marker
                const container = input.closest('.location-container');
                const colorElement = container?.querySelector('.location-icon');
                const personColor = colorElement?.getAttribute('data-person-color') || '#8B5DB8';
                
                addLocationMarker(place.geometry.location, input.id, personColor);
                
                // Use the hybrid manager's debounced method
                if (window.hybridLocationManager) {
                    window.hybridLocationManager.debouncedLocationCheck();
                }
            });
        });
    } catch (error) {
        console.error('Error initializing legacy Autocomplete:', error);
    }
}

function setupMapMarkers() {
    window.locationMarkers = {};
    window.midpointMarker = null;
    window.directionsRenderers = [];

    if (window.google && window.google.maps) {
        window.geocoder = new google.maps.Geocoder();
    }
}

function setupMobileMenu() {
    console.log('Mobile menu disabled - no hamburger menu');
}

function setupLocationInputs() {
    console.log('📍 Setting up location inputs...');
    
    // Initialize window.directionsRenderers if not already done
    if (!window.directionsRenderers) {
        window.directionsRenderers = [];
    }
    
    // Initialize the hybrid location manager if not already done
    if (window.hybridLocationManager && !window.hybridLocationManager.initialized) {
        console.log('Initializing hybrid location manager...');
        window.hybridLocationManager.initialize();
    } else if (window.hybridLocationManager) {
        console.log('Hybrid location manager already initialized');
    } else {
        console.warn('HybridLocationManager not found! Creating new instance...');
        window.hybridLocationManager = new HybridLocationManager();
        window.hybridLocationManager.initialize();
    }
}

function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            
            switch(page) {
                case 'home':
                    break;
                case 'groups':
                    window.location.href = '/groups';
                    break;
                case 'profile':
                    window.location.href = '/profile';
                    break;
                case 'compass':
                    break;
                case 'create':
                    showCreateGroupModal();
                    break;
            }
        });
    });
}

function showCreateGroupModal(){
    const menu = document.getElementById('dropdown-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function setupUserInfo() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                const userAvatar = document.querySelector('.user-avatar');
                const userName = document.querySelector('.user-details h3');
                
                if (user.displayName && userName) {
                    userName.textContent = user.displayName;
                    
                    if (userAvatar) {
                        const initials = user.displayName
                            .split(' ')
                            .map(name => name[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase();
                        
                        userAvatar.textContent = initials;
                    }
                }
            }
        });
    }
}

function setupVenueCard() {
    const venueCard = document.getElementById('venue-card');
    if (venueCard) {
        venueCard.style.display = 'none';
    }

    console.log('Venue cards disabled');
}

// CLEAN setupFindCentralButton - single version
function setupFindCentralButton() {
    const findCentralBtn = document.getElementById('find-central-btn');
    if (!findCentralBtn) {
        console.error('Find central button not found!');
        return;
    }

    findCentralBtn.addEventListener('click', async function() {
        console.log('🔥 Find central button clicked - Starting Enhanced Social Fairness Algorithm!');
        
        // Get all location data from the hybrid manager
        const allLocationData = window.hybridLocationManager ? 
            window.hybridLocationManager.getAllLocationData() : [];
        
        if (allLocationData.length < 2) {
            showErrorNotification('Please enter at least 2 locations and wait for them to be processed');
            return;
        }
        
        console.log(`📍 Processing ${allLocationData.length} locations for midpoint calculation`);
        
        // Clear existing midpoint marker
        if (window.midpointMarker) {
            window.midpointMarker.setMap(null);
        }
        
        // Show loading state
        const originalButtonContent = findCentralBtn.innerHTML;
        findCentralBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        findCentralBtn.style.pointerEvents = 'none';
        findCentralBtn.classList.add('processing');
        
        try {
            // Extract positions from location data
            const locations = allLocationData.map(data => data.position);
            
            console.log('🎯 Running Enhanced Social Fairness Algorithm...');
            const socialMidpoint = await calculateSocialMidpoint(locations);
            window.calculatedMidpoint = socialMidpoint;
            console.log('✅ Social optimal location found:', socialMidpoint);
            
        } catch (error) {
            console.warn('Enhanced algorithm failed, using geometric midpoint:', error);
            
            // Fallback to geometric midpoint
            const positions = allLocationData.map(data => data.position);
            if (positions.length >= 2) {
                window.calculatedMidpoint = calculateMidpoint(positions);
            }
        }
        
        // Restore button state
        findCentralBtn.innerHTML = originalButtonContent;
        findCentralBtn.style.pointerEvents = 'auto';
        findCentralBtn.classList.remove('processing');
        
        if (!window.calculatedMidpoint) {
            console.warn('No midpoint calculated');
            showErrorNotification('Could not calculate meeting point');
            return;
        }
        
        // Create enhanced midpoint marker
        window.midpointMarker = new google.maps.Marker({
            position: window.calculatedMidpoint,
            map: window.midwhereahMap,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4CAF50',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 15
            },
            title: `Optimal Meeting Spot for ${allLocationData.length} People`,
            animation: google.maps.Animation.BOUNCE
        });
        
        // Stop bounce animation after 2 seconds
        setTimeout(() => {
            if (window.midpointMarker) {
                window.midpointMarker.setAnimation(null);
            }
        }, 2000);
        
        // Center map on midpoint with appropriate zoom
        window.midwhereahMap.panTo(window.calculatedMidpoint);
        window.midwhereahMap.setZoom(14);
        
        // Show routes with proper error handling
        try {
            showRoutes();
            console.log('✅ Routes displayed successfully');
        } catch (error) {
            console.error('❌ Failed to display routes:', error);
            showErrorNotification('Routes could not be displayed');
        }
        
        // Update button to success state
        findCentralBtn.classList.add('success');
        findCentralBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        // Reset button after 3 seconds
        setTimeout(() => {
            findCentralBtn.classList.remove('active', 'success');
            findCentralBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
        }, 3000);
    });
}

function showRoutes() {
    const midpoint = window.calculatedMidpoint;
    
    if (!midpoint) {
        console.warn('No midpoint available for route calculation');
        return;
    }
    
    // Get all location data using the hybrid manager
    const allLocationData = window.hybridLocationManager ? 
        window.hybridLocationManager.getAllLocationData() : [];
    
    if (allLocationData.length < 2) {
        console.warn('Not enough locations for route calculation');
        return;
    }
    
    console.log(`🗺️ Showing routes for ${allLocationData.length} locations to midpoint`);
    
    // Call showRoutesLegacy with correct parameters
    showRoutesLegacy(midpoint, allLocationData);
}

// Setup transport mode selection
function setupTransportModeSelection() {
    // Use event delegation for dynamically created transport buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('transport-btn') || e.target.closest('.transport-btn')) {
            const btn = e.target.classList.contains('transport-btn') ? e.target : e.target.closest('.transport-btn');
            const mode = btn.getAttribute('data-mode');
            const person = btn.getAttribute('data-person');
            const locationId = `location-${person}`;
            
            if (window.hybridLocationManager) {
                window.hybridLocationManager.updateTransportMode(locationId, mode);
            }
            
            console.log(`🚗 Person ${person} selected: ${mode}`);
        }
    });
}

function ensureMapInitialization() {
    if (!window.midwhereahMap) {
        console.warn('Map not initialized, attempting to initialize...');
        if (typeof initMap === 'function') {
            initMap();
        }
        return false;
    }
    return true;
}

// CLEAN ADD PERSON BUTTON SETUP - Single version with cooldown
let addPersonCooldown = false;

function setupAddPersonButton() {
    const addPersonBtn = document.getElementById('add-person-btn');
    if (!addPersonBtn) {
        console.log('❌ Add person button not found');
        return;
    }
    
    console.log('✅ Add person button found');
    
    // Remove any existing listeners to prevent duplicates
    addPersonBtn.replaceWith(addPersonBtn.cloneNode(true));
    const newBtn = document.getElementById('add-person-btn');
    
    // Add single event listener with debouncing
    newBtn.addEventListener('click', function(event) {
        // Prevent double-clicks
        if (addPersonCooldown) {
            console.log('🚫 Button cooldown active');
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Add person button clicked');
        
        // Set cooldown
        addPersonCooldown = true;
        newBtn.disabled = true;
        newBtn.style.opacity = '0.6';
        
        // Add person
        if (window.hybridLocationManager) {
            try {
                const result = window.hybridLocationManager.addLocationInput();
                if (result) {
                    console.log(`✅ Added person ${result.personId}`);
                }
            } catch (error) {
                console.error('Error adding person:', error);
            }
        }
        
        // Reset after 600ms
        setTimeout(() => {
            addPersonCooldown = false;
            newBtn.disabled = false;
            newBtn.style.opacity = '1';
        }, 600);
    });
}

// MAIN INITIALIZATION - Single DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing MidWhereAh mobile interface...');
    
    // Initialize basic functions
    setupMobileMenu();
    setupBottomNavigation();
    setupUserInfo();
    setupVenueCard();
    setupTransportModeSelection();
    setupTransportCycling();

    // Initialize location manager
    if (!window.hybridLocationManager) {
        window.hybridLocationManager = new HybridLocationManager();
    }
    
    setupLocationInputs();
    
    // Setup buttons with delay to ensure DOM is ready
    setTimeout(() => {
        setupFindCentralButton();
        setupAddPersonButton(); // Use the clean function
        
        // Verify find button
        const findBtn = document.getElementById('find-central-btn');
        if (findBtn) {
            console.log('✅ Find central button found');
        } else {
            console.log('❌ Find central button NOT found');
        }
    }, 300);
    console.log('✅ Transport mode cycling enabled');   
    console.log('✅ MidWhereAh mobile interface initialized');
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-person-btn') || e.target.closest('.remove-person-btn')) {
        const btn = e.target.classList.contains('remove-person-btn') ? e.target : e.target.closest('.remove-person-btn');
        const container = btn.closest('.location-container');
        const personId = parseInt(container.getAttribute('data-person-id'));
        
        console.log(`🔴 Remove button clicked for Person ${personId} via delegation`);
        
        if (window.hybridLocationManager) {
            window.hybridLocationManager.removeLocationInput(personId);
        }
    }
});

// Initialize hybrid location manager
window.hybridLocationManager = new HybridLocationManager();
console.log('✅ HybridLocationManager initialized');

