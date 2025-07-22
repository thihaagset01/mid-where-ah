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
        } else {
            this.maxAcceptableTimeDifference = 20;
            this.equityWeight = 0.7;
            this.totalTimeWeight = 0.3;
            console.log(`   📏 Large group: 20min max difference, efficiency focus`);
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
            this.maxAcceptableTimeDifference = 20;
            console.log(`🌏 Extreme distance (${distanceKm.toFixed(1)}km): Allowing up to 90min travel, 20min range`);
        } else if (distanceKm > 15) {
            this.maxTravelTimeMinutes = 75;
            this.maxAcceptableTimeDifference = 15;
            console.log(`📏 Long distance (${distanceKm.toFixed(1)}km): Allowing up to 75min travel, 15min range`);
        } else {
            this.maxTravelTimeMinutes = this.baseMaxTravelTimeMinutes;
            this.maxAcceptableTimeDifference = 10;
            console.log(`📍 Normal distance (${distanceKm.toFixed(1)}km): Allowing up to 60min travel, 10min range`);
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
        
        let currentSearchCenter = this.calculateGeometricMidpoint(startingLocations);
        let searchRadius = this.initialRadius;
        let bestMidpoint = null;
        let bestScore = Infinity;
        let radiusCircle = null;
        let iteration = 0;
        
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
                bestScore = currentBestVenue.equityScore;
                bestMidpoint = currentBestVenue.location;
                
                console.log(`⭐ New best venue: ${currentBestVenue.name}`);
                console.log(`   Max travel time: ${currentBestVenue.maxTravelTime.toFixed(1)}min`);
                console.log(`   Avg travel time: ${currentBestVenue.avgTravelTime.toFixed(1)}min`);
                console.log(`   Time variance: ${currentBestVenue.timeVariance.toFixed(1)}min²`);
                console.log(`   Equity score: ${currentBestVenue.equityScore.toFixed(2)}`);
                
                // Update search center to focus around the best venue
                currentSearchCenter = {
                    lat: currentBestVenue.location.lat,
                    lng: currentBestVenue.location.lng
                };
                searchRadius = Math.max(400, searchRadius * 0.6);
                console.log(`🎯 Focusing search around best venue, radius now ${searchRadius}m`);
            } else {
                searchRadius *= this.radiusIncrementFactor;
                console.log(`🔄 No improvement found, expanding to ${searchRadius}m`);
            }
            
            // Early termination for excellent results
            if (bestMidpoint && currentBestVenue && 
                currentBestVenue.timeVariance < 4.0 && 
                currentBestVenue.timeRange <= this.maxAcceptableTimeDifference) {
                console.log(`🏆 Excellent equity found (variance < 4min², range ≤ ${this.maxAcceptableTimeDifference}min), stopping early!`);
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

        for (let i = 0; i < venues.length; i++) {
            const venue = venues[i];
            
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
            
            const equityScore = this.calculateEquityScore(travelTimes, avgTime, mixedMode, timeRange);
            
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
                equityScore: equityScore,
                rating: venue.rating,
                types: venue.types,
                venue: venue,
                transportModes: transportModes,
                mixedMode: mixedMode
            });
        }

        analysis.sort((a, b) => a.equityScore - b.equityScore);
        
        console.log(`   ✅ Successfully analyzed ${analysis.length} venues`);
        
        analysis.slice(0, 3).forEach((venue, idx) => {
            const modeText = venue.mixedMode ? 
                `${venue.transportModes[0]}/${venue.transportModes[1]}` : 
                venue.transportModes[0];
            console.log(`   ${idx + 1}. ${venue.name} [${modeText}]: equity=${venue.equityScore.toFixed(2)}, variance=${venue.timeVariance.toFixed(1)}min², range=${venue.timeRange.toFixed(1)}min`);
        });
        
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
                    resolve(durationMinutes);
                } else {
                    reject(new Error(`Directions failed: ${status}`));
                }
            });
        });
    }

    findMostEquitableVenue(analysis) {
        if (analysis.length === 0) return null;
        
        const best = analysis[0]; // Already sorted by equity score
        
        console.log(`🎯 Selected venue: ${best.name}`);
        console.log(`   Travel times: [${best.travelTimes.map(t => t.toFixed(1)).join(', ')}] minutes`);
        console.log(`   Fairness gap: ${Math.abs(best.travelTimes[0] - best.travelTimes[1]).toFixed(1)} minutes`);
        console.log(`   Average time: ${best.avgTravelTime.toFixed(1)} minutes`);
        
        return best;
    }

    calculateEquityScore(travelTimes, avgTime, mixedMode, timeRange) {
        const timeVariance = this.calculateVariance(travelTimes);
        
        const normalizedVariance = timeVariance / 100;
        const normalizedRange = timeRange / 60;
        const normalizedAvgTime = avgTime / this.maxTravelTimeMinutes;
        
        let equityScore = (normalizedVariance * 0.5) + 
                        (normalizedRange * 0.3) + 
                        (normalizedAvgTime * 0.4);
        
        if (mixedMode && timeRange > this.maxAcceptableTimeDifference * 0.8) {
            const mixedModePenalty = Math.pow(timeRange / this.maxAcceptableTimeDifference, 1.2) * 0.2;
            equityScore += mixedModePenalty;
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

