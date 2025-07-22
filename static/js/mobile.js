// Enhanced global variables for multiple locations
window.userTransportModes = new Map();
window.locationData = new Map();
window.nextPersonId = 1;

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

// Error notification
function showErrorNotification(message) {
    console.error('Error:', message);
    
    let notification = document.getElementById('error-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'error-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background-color: #f44336; color: white; padding: 12px 24px;
            border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999; max-width: 80%; text-align: center;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Routes display function
function showRoutesLegacy(midpoint, locationArray) {
    if (!window.midwhereahMap || !midpoint || !locationArray || locationArray.length < 2) {
        showErrorNotification('Cannot display routes: Missing map, midpoint, or locations');
        return;
    }
    
    // Clear existing routes
    if (window.directionsRenderers) {
        window.directionsRenderers.forEach(renderer => renderer.setMap(null));
    }
    window.directionsRenderers = [];
    
    const directionsService = new google.maps.DirectionsService();
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    
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
        
        directionsService.route({
            origin: location.position,
            destination: midpoint,
            travelMode: googleMapsMode
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                renderer.setDirections(result);
                console.log(`🛣️ Route displayed for location ${index + 1} using ${travelMode}`);
            } else {
                console.error(`❌ Directions request failed: ${status}`);
                showErrorNotification(`Could not display route for location ${index + 1}: ${status}`);
            }
        });
    });
}

class HybridLocationManager {
    constructor() {
        this.minLocations = 2;
        this.maxLocations = 8;
        this.personCounter = 0;
        this.colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ];
        this.initialized = false;
        this.lastLocationStatus = '';
        
        // Debounced location check
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
        
        this.setupAddPersonButton();
        this.initialized = true;
        
        console.log('✅ HybridLocationManager initialized');
    }

    setupExistingInputs(inputs) {
        inputs.forEach((input, index) => {
            const personId = index + 1;
            this.personCounter = Math.max(this.personCounter, personId);
            
            const inputId = input.id || `location-${personId}`;
            input.id = inputId;
            
            // Initialize transport mode (default to TRANSIT)
            window.userTransportModes.set(inputId, 'TRANSIT');
            
            // Set person color
            const colorIndex = (personId - 1) % this.colors.length;
            const personColor = this.colors[colorIndex];
            
            // Update location icon color if it exists
            const container = input.closest('.location-container');
            if (container) {
                const locationIcon = container.querySelector('.location-icon');
                if (locationIcon) {
                    locationIcon.style.color = personColor;
                    locationIcon.setAttribute('data-person-color', personColor);
                }
                
                this.setupTransportButtonsForContainer(container, personId, inputId);
            }
            
            // FIXED: Set up input event listeners properly
            this.setupInputEventListeners(input);
            
            // Set up autocomplete when Google Maps is ready
            this.initializeAutocompleteForInput(input);
            
            console.log(`📍 Set up existing input: ${inputId} (Person ${personId})`);
        });
        
        this.updateUIState();
    }

    setupInputEventListeners(input) {
        // Add input event listener with debouncing
        input.addEventListener('input', () => {
            console.log(`Input changed: ${input.id} = "${input.value}"`);
            this.debouncedLocationCheck();
            
            // FIXED: Also trigger geocoding for better UX
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

    // NEW: Fallback geocoding when autocomplete fails
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
            container.style.cssText = 'width: 90%; max-width: 600px; margin-top: 80px;';
            
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

    addLocationInput(personName = null) {
        if (this.getLocationCount() >= this.maxLocations) {
            showErrorNotification(`Maximum ${this.maxLocations} people allowed`);
            return null;
        }

        const personId = ++this.personCounter;
        let container = document.getElementById('locations-container');
        
        if (!container) {
            // Try to find existing container or create one
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

        // Create location input HTML dynamically
        const locationElement = document.createElement('div');
        locationElement.className = 'location-container mb-3';
        locationElement.setAttribute('data-person-id', personId);

        const inputId = `location-${personId}`;
        const colorIndex = (personId - 1) % this.colors.length;
        const personColor = this.colors[colorIndex];

        locationElement.innerHTML = `
            <div class="location-item">
                <div class="d-flex align-items-center justify-content-between" style="z-index: 15;">
                    <div class="location-icon" style="color: ${personColor};" data-person-color="${personColor}">
                        <i class="fas fa-circle"></i>
                    </div>
                    <input type="text" 
                           class="location-input" 
                           id="${inputId}" 
                           placeholder="${personName ? `${personName}'s location` : `Person ${personId}'s location`}" 
                           autocomplete="off">
                    <button class="btn btn-sm btn-outline-danger remove-person-btn" style="display: none; margin-left: 8px;" title="Remove Person">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="transport-selector">
                <button class="transport-btn active" data-mode="TRANSIT" data-person="${personId}" title="Public Transport">
                    🚇
                </button>
                <button class="transport-btn" data-mode="DRIVING" data-person="${personId}" title="Car/Taxi">
                    🚗
                </button>
                <button class="transport-btn" data-mode="WALKING" data-person="${personId}" title="Walking">
                    🚶
                </button>
            </div>
        `;

        // Add to container
        container.appendChild(locationElement);

        // Get references to the created elements
        const input = locationElement.querySelector('.location-input');
        const removeBtn = locationElement.querySelector('.remove-person-btn');

        // Setup remove button
        if (this.getLocationCount() >= this.minLocations) {
            removeBtn.style.display = 'inline-block';
        }
        
        removeBtn.addEventListener('click', () => {
            this.removeLocationInput(personId);
        });

        // Setup transport mode buttons
        this.setupTransportButtonsForContainer(locationElement, personId, inputId);

        // Initialize autocomplete for new input
        this.initializeAutocompleteForInput(input);

        // Initialize transport mode for this person (default to TRANSIT)
        window.userTransportModes.set(inputId, 'TRANSIT');

        // Update UI state
        this.updateUIState();

        console.log(`➕ Added location input for Person ${personId} (${inputId})`);

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
            this.updateUIState();
        }, 300);
    }

    getLocationCount() {
        return document.querySelectorAll('.location-input').length;
    }

    updateUIState() {
        const count = this.getLocationCount();
        const addBtn = document.getElementById('add-person-btn');
        const findBtn = document.getElementById('find-central-btn');
        const removeBtns = document.querySelectorAll('.remove-person-btn');
        const personCountSpan = document.getElementById('person-count');

        // Update person count display
        if (personCountSpan) {
            personCountSpan.textContent = count;
        }

        // Show/hide add button
        if (addBtn) {
            addBtn.style.display = count < this.maxLocations ? 'inline-block' : 'none';
            if (count >= this.maxLocations) {
                addBtn.innerHTML = '<i class="fas fa-users me-1"></i>Max reached';
                addBtn.disabled = true;
            } else {
                addBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Add Person';
                addBtn.disabled = false;
            }
        }

        // Show/hide remove buttons (only for dynamically added inputs beyond minimum)
        removeBtns.forEach((btn, index) => {
            // Only show remove buttons if we have more than minimum locations
            // AND it's not one of the first 2 static inputs (if they exist)
            const container = btn.closest('.location-container');
            const personId = parseInt(container.getAttribute('data-person-id') || '0');
            const shouldShow = count > this.minLocations && personId > 2; // Only for person 3+
            
            btn.style.display = shouldShow ? 'inline-block' : 'none';
        });

        // Update find button state - use debounced version
        this.debouncedLocationCheck();

        console.log(`📊 UI updated: ${count} people, add button: ${count < this.maxLocations ? 'visible' : 'hidden'}`);
    }

    // FIXED: Better location checking logic
    checkAllLocationsAndShowButton() {
        const inputs = document.querySelectorAll('.location-input');
        const findBtn = document.getElementById('find-central-btn');
        
        if (!findBtn) {
            console.log('Find central button not found');
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
            
            // FIXED: Make sure the button is properly visible
            findBtn.style.opacity = '1';
            findBtn.style.transform = 'scale(1)';
            findBtn.style.pointerEvents = 'auto';
        } else {
            findBtn.style.display = 'none';
            findBtn.classList.remove('active');
        }
    }

    // ADD this new method to the class:
    getValidLocationInputs() {
        const locations = [];
        
        // First try to get from stored location data (autocomplete selections)
        const storedLocations = this.getAllLocationData();
        if (storedLocations.length >= 2) {
            return storedLocations;
        }
        
        // Fallback: Check if we have markers on the map (from manual geocoding)
        if (window.locationMarkers) {
            Object.keys(window.locationMarkers).forEach(inputId => {
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
        
        return locations;
    }

    setupAddPersonButton() {
        const addPersonBtn = document.getElementById('add-person-btn');
        if (addPersonBtn) {
            addPersonBtn.addEventListener('click', () => {
                this.addLocationInput();
            });
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
                    this.debouncedLocationCheck(); // Use debounced version
                    
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

    // IMPROVED: Get all valid location data with fallbacks
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

    getPersonCount() {
        return this.getLocationCount();
    }

    getValidLocationCount() {
        return this.getAllLocationData().length;
    }
}

// Enhanced marker function
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

// CLEANED Calculator class - remove duplicates
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

    // KEEP ONLY ONE VERSION of each calculation method
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
        console.log(`🎯 Starting Enhanced Social Fairness Algorithm for ${groupSize} people...`);
        
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
            
            // RESTORED: Actually search for venues instead of just using geometric midpoint
            const socialVenues = await this.findSocialVenues(currentSearchCenter, searchRadius);
            
            if (socialVenues.length < this.minVenuesRequired) {
                console.log(`❌ Only ${socialVenues.length} venues found, need ${this.minVenuesRequired}. Expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            console.log(`✅ Found ${socialVenues.length} venues to analyze`);
            
            // RESTORED: Analyze venues for travel equity
            const venueAnalysis = await this.analyzeVenueTravelEquity(socialVenues, startingLocations);
            
            if (venueAnalysis.length === 0) {
                console.log(`❌ No accessible venues found. Expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            // RESTORED: Find the most equitable venue
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

// KEEP ONLY ONE VERSION of calculateMidpoint
function calculateMidpoint(locations) {
    if (!locations || locations.length < 2) {
        console.warn('calculateMidpoint: Need at least 2 locations');
        return null;
    }

    let totalLat = 0;
    let totalLng = 0;

    locations.forEach(location => {
        if (typeof location.lat === 'function') {
            totalLat += location.lat();
            totalLng += location.lng();
        } else {
            totalLat += location.lat;
            totalLng += location.lng;
        }
    });

    const avgLat = totalLat / locations.length;
    const avgLng = totalLng / locations.length;

    return new google.maps.LatLng(avgLat, avgLng);
}

function calculateMidpointFromMarkers() {
    const markers = Object.values(window.locationMarkers || {}).filter(marker => marker);
    
    if (markers.length >= 2) {
        const locations = markers.map(marker => marker.getPosition());
        window.calculatedMidpoint = calculateMidpoint(locations);
        console.log('Geometric midpoint calculated:', window.calculatedMidpoint);
    }
}

// Initialize map with Singapore as default center
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
            fullscreenControl: false,
            streetViewControl: false,
            zoomControl: false
        });
        
        window.midwhereahMap = map;
        
        window.dispatchEvent(new Event('resize'));
        
        await initLocationAutocomplete();
        
        setupMapMarkers();
        
        window.placesService = new google.maps.places.PlacesService(map);
        
        console.log("Google Maps initialized successfully");
        
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

function calculateMidpointFromMarkers() {
    // Get all active markers
    const markers = Object.values(window.locationMarkers || {}).filter(marker => marker);
    
    if (markers.length >= 2) {
        const locations = markers.map(marker => marker.getPosition());
        window.calculatedMidpoint = calculateMidpoint(locations);
        console.log('Geometric midpoint calculated:', window.calculatedMidpoint);
    }
}

function calculateMidpoint(locations) {
    if (!locations || locations.length < 2) {
        console.warn('calculateMidpoint: Need at least 2 locations');
        return null;
    }

    let totalLat = 0;
    let totalLng = 0;

    locations.forEach(location => {
        if (typeof location.lat === 'function') {
            totalLat += location.lat();
            totalLng += location.lng();
        } else {
            totalLat += location.lat;
            totalLng += location.lng;
        }
    });

    const avgLat = totalLat / locations.length;
    const avgLng = totalLng / locations.length;

    return new google.maps.LatLng(avgLat, avgLng);
}

function setupMobileMenu() {
    console.log('Mobile menu disabled - no hamburger menu');
}


function setupLocationInputs() {
    console.log('📍 Setting up location inputs...');
    
    // Initialize the hybrid location manager if not already done
    if (window.hybridLocationManager && !window.hybridLocationManager.initialized) {
        console.log('Initializing hybrid location manager...');
        window.hybridLocationManager.initialize();
    } else if (window.hybridLocationManager) {
        console.log('Hybrid location manager already initialized');
    } else {
        console.warn('HybridLocationManager not found!');
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

// Fix for the Find Central Button in mobile.js
// Replace the existing setupFindCentralButton function with this:

// FIXED: Enhanced setupFindCentralButton
function setupFindCentralButton() {
    const findCentralBtn = document.getElementById('find-central-btn');
    if (!findCentralBtn) return;

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
        
        if (window.midpointMarker) {
            window.midpointMarker.setMap(null);
        }
        
        const originalButtonContent = findCentralBtn.innerHTML;
        findCentralBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        findCentralBtn.style.pointerEvents = 'none';
        
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
        
        findCentralBtn.innerHTML = originalButtonContent;
        findCentralBtn.style.pointerEvents = 'auto';
        
        if (!window.calculatedMidpoint) {
            console.warn('No midpoint calculated');
            showErrorNotification('Could not calculate meeting point');
            return;
        }
        
        // Create midpoint marker
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
        
        setTimeout(() => {
            if (window.midpointMarker) {
                window.midpointMarker.setAnimation(null);
            }
        }, 2000);
        
        // Center map on midpoint
        window.midwhereahMap.panTo(window.calculatedMidpoint);
        window.midwhereahMap.setZoom(14);
        
        // Show routes (you'll need to implement this for multiple locations)
        // showRoutes();
        
        findCentralBtn.classList.add('used');
        findCentralBtn.innerHTML = '<i class="fas fa-check"></i> Found!';
        
        setTimeout(() => {
            findCentralBtn.classList.remove('active', 'used');
            findCentralBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
        }, 3000);
    });
}


function getColorForInputId(inputId) {
    const input = document.getElementById(inputId);
    const container = input?.closest('.location-container');
    const colorElement = container?.querySelector('.location-icon');
    return colorElement?.getAttribute('data-person-color') || '#8B5DB8';
}


function showRoutes() {
    const midpoint = window.calculatedMidpoint;
    
    if (!midpoint) {
        console.warn('No midpoint available for route calculation');
        return;
    }
    
    // Get all location data
    const allLocationData = window.hybridLocationManager ? 
        window.hybridLocationManager.getAllLocationData() : [];
    
    if (allLocationData.length < 2) {
        console.warn('Not enough locations for route calculation');
        return;
    }
    
    console.log(`🗺️ Showing routes for ${allLocationData.length} locations to midpoint`);
    
    // Use the fixed showRoutesLegacy function with proper parameters
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



function geocodeAndCreateMarkers() {
    // This is handled automatically by the autocomplete listeners
    console.log('Geocoding handled by autocomplete listeners');
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing MidWhereAh mobile interface...');
    
    setupMobileMenu();
    setupBottomNavigation();
    setupUserInfo();
    setupVenueCard();
    setupFindCentralButton();
    setupTransportModeSelection();
    
    // ENHANCED: Initialize location inputs through HybridLocationManager
    setupLocationInputs();
    
    // Set up add person button if it exists
    const addPersonBtn = document.getElementById('add-person-btn');
    if (addPersonBtn) {
        console.log('✅ Add person button found');
        addPersonBtn.addEventListener('click', () => {
            console.log('Add person button clicked');
            if (window.hybridLocationManager) {
                window.hybridLocationManager.addLocationInput();
            }
        });
    } else {
        console.log('❌ Add person button NOT found');
    }
    
    // Check for find central button
    const findBtn = document.getElementById('find-central-btn');
    if (findBtn) {
        console.log('✅ Find central button found');
    } else {
        console.log('❌ Find central button NOT found');
    }
    
    console.log('✅ MidWhereAh mobile interface initialized');
});

// Backwards compatibility function (delegates to HybridLocationManager)
function checkBothLocationsAndShowButton() {
    if (window.hybridLocationManager) {
        window.hybridLocationManager.debouncedLocationCheck();
    } else {
        console.warn('HybridLocationManager not available, using fallback logic');
        // Fallback to old logic if needed
        const location1 = document.getElementById('location-1');
        const location2 = document.getElementById('location-2');
        const findCentralBtn = document.getElementById('find-central-btn');

        if (!location1 || !location2 || !findCentralBtn) return;

        const hasValue1 = location1.value.trim() !== '';
        const hasValue2 = location2.value.trim() !== '';

        if (hasValue1 && hasValue2) {
            findCentralBtn.classList.add('active');
            findCentralBtn.style.display = 'flex';
        } else {
            findCentralBtn.classList.remove('active');
            findCentralBtn.style.display = 'none';
        }
    }
}


window.hybridLocationManager = new HybridLocationManager();
console.log('✅ HybridLocationManager initialized');