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
        icon: '<i class="fas fa-subway"></i>',
        name: 'Public Transport',
        class: 'transit'
    },
    {
        mode: 'DRIVING', 
        icon: '<i class="fas fa-car"></i>',
        name: 'Car/Taxi',
        class: 'driving'
    },
    {
        mode: 'WALKING',
        icon: '<i class="fas fa-walking"></i>',
        name: 'Walking', 
        class: 'walking'
    }
];

function setupTransportCycling() {
    document.addEventListener('click', function(e) {
        // Check if the clicked element is the transport icon or a child of it
        const transportIcon = e.target.classList.contains('transport-icon') ? 
                             e.target : 
                             e.target.closest('.transport-icon');
        
        if (transportIcon) {
            cycleTransportMode(transportIcon);
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
    iconElement.innerHTML = modeConfig.icon;
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

function storeAlgorithmResults(bestVenue) {
    window.algorithmResults = {
        venue: bestVenue,
        calculatedTimes: bestVenue.travelTimes,
        transportModes: bestVenue.transportModes,
        timestamp: Date.now()
    };
}

// CLEAN Routes display function
function showRoutesLegacy(midpoint, locationArray) {
    if (!ensureMapInitialization()) {
        showErrorNotification('Map not ready for route display');
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
        
        // 🔥 USE STORED ALGORITHM TIMES if available
        if (window.algorithmResults && window.algorithmResults.calculatedTimes[index]) {
            console.log(`🛣️ Route ${index + 1}: Using algorithm time ${window.algorithmResults.calculatedTimes[index].toFixed(1)}min`);
        }
        
        const travelMode = location.transportMode || 'TRANSIT';
        const googleMapsMode = travelMode === 'TRANSIT' ? google.maps.TravelMode.TRANSIT :
                              travelMode === 'DRIVING' ? google.maps.TravelMode.DRIVING :
                              google.maps.TravelMode.WALKING;
        
        const request = {
            origin: location.position,
            destination: midpoint,
            travelMode: googleMapsMode
        };
        
        if (googleMapsMode === google.maps.TravelMode.TRANSIT) {
            request.transitOptions = {
                modes: [google.maps.TransitMode.BUS, google.maps.TransitMode.RAIL],
                routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
            };
        }
        
        directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                renderer.setDirections(result);
                const duration = result.routes[0].legs[0].duration;
                console.log(`🛣️ Route ${index + 1} displayed: ${duration.text} via ${travelMode}`);
            } else {
                console.error(`❌ Route ${index + 1} failed: ${status}`);
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
            const existingContainer = document.querySelector('.locations-container');
            if (existingContainer) {
                container = existingContainer;
                container.id = 'locations-container';
            } else {
                container = document.createElement('div');
                container.id = 'locations-container';
                container.className = 'locations-container';
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

        // SIMPLIFIED HTML STRUCTURE
        locationElement.innerHTML = `
            <div class="transport-icon transit" 
                 data-person="${personId}" 
                 data-current-mode="TRANSIT"
                 data-tooltip="Public Transport">
                <i class="fas fa-subway"></i>
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
        const personCountSpan = document.getElementById('person-count');

        // Update person count display
        if (personCountSpan) {
            personCountSpan.textContent = count;
        }

        // Show/hide add button
        if (addBtn) {
            addBtn.style.display = count < this.maxLocations ? 'flex' : 'none';
            if (count >= this.maxLocations) {
                addBtn.innerHTML = '<i class="fas fa-users"></i>';
                addBtn.disabled = true;
                addBtn.title = 'Maximum people reached';
            } else {
                addBtn.innerHTML = '<i class="fas fa-plus"></i>';
                addBtn.disabled = false;
                addBtn.title = 'Add person';
            }
            
            // Position the button next to the last location container
            this.positionAddButton();
        }
        
        // Update remove buttons visibility
        this.updateRemoveButtons(count);
        
        // Update find button state
        this.debouncedLocationCheck();

        console.log(`📈 UI updated: ${count} people, next ID would be: ${this.personCounter + 1}`);
    }
    
    // Position the add button next to the last location container
    positionAddButton() {
        const addBtn = document.getElementById('add-person-btn');
        if (!addBtn) return;
        
        const containers = document.querySelectorAll('.location-container');
        if (containers.length === 0) return;
        
        // Get the last container
        const lastContainer = containers[containers.length - 1];
        
        // Position the button relative to the last container
        const rect = lastContainer.getBoundingClientRect();
        const parentRect = lastContainer.parentElement.getBoundingClientRect();
        
        // Calculate position (right side of the last container)
        addBtn.style.top = `${rect.top + rect.height/2 - parentRect.top}px`;
        
        // Reset any previous positioning
        addBtn.style.position = 'absolute';
    }
    
    // Show/hide remove buttons based on person count
    updateRemoveButtons(count) {
        const removeBtns = document.querySelectorAll('.remove-person-btn');
        
        // Show/hide remove buttons (only show for 3+ people)
        removeBtns.forEach((btn) => {
            const container = btn.closest('.location-container');
            const personId = parseInt(container.getAttribute('data-person-id') || '0');
            const shouldShow = count > this.minLocations && personId > 2;
            
            console.log(`🔍 Person ${personId}: shouldShow=${shouldShow}, count=${count}`);
            btn.style.display = shouldShow ? 'inline-flex' : 'none';
        });
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

    // Enhanced Singapore Postal Code Geocoding
// Properly handles Singapore postal codes and improves location accuracy

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
    
    console.log(`🔍 Enhanced geocoding for ${input.id}: "${value}"`);
    
    // Enhanced Singapore input processing
    const processedInput = this.processSingaporeInput(value);
    console.log(`📝 Processed input: "${processedInput.query}" (type: ${processedInput.type})`);
    
    // Special case handling for known problematic locations
    const knownLocations = {
        "east coast lagoon food village": { lat: 1.3046, lng: 103.9082 },
        "east coast lagoon food centre": { lat: 1.3046, lng: 103.9082 },
        "east coast park food centre": { lat: 1.3046, lng: 103.9082 },
        // Add more known locations as needed
        "marina bay sands": { lat: 1.2834, lng: 103.8607 },
        "gardens by the bay": { lat: 1.2816, lng: 103.8636 },
        "singapore zoo": { lat: 1.4043, lng: 103.7930 }
    };
    
    // Check if this is a known problematic location
    const normalizedValue = value.toLowerCase().trim();
    if (knownLocations[normalizedValue]) {
        console.log(`🔍 Using predefined coordinates for known location: ${value}`);
        this.useKnownLocation(input, knownLocations[normalizedValue], value);
        return;
    }
    
    // Enhanced geocoding with multiple fallback strategies
    this.geocodeWithFallback(input, processedInput);
}

// Process Singapore input to optimize geocoding
processSingaporeInput(input) {
    const trimmed = input.trim();
    
    // Singapore postal code pattern (6 digits)
    const postalCodePattern = /^(\d{6})$/;
    const postalMatch = trimmed.match(postalCodePattern);
    
    if (postalMatch) {
        return {
            query: `Singapore ${postalMatch[1]}`,
            type: 'postal_code',
            original: trimmed
        };
    }
    
    // Singapore postal code with "Singapore" prefix
    const postalWithCountryPattern = /^(?:singapore\s+)?(\d{6})$/i;
    const postalWithCountryMatch = trimmed.match(postalWithCountryPattern);
    
    if (postalWithCountryMatch) {
        return {
            query: `Singapore ${postalWithCountryMatch[1]}`,
            type: 'postal_code',
            original: trimmed
        };
    }
    
    // MRT station patterns
    const mrtPatterns = [
        /(.+)\s+mrt$/i,
        /(.+)\s+station$/i,
        /(.+)\s+interchange$/i
    ];
    
    for (let pattern of mrtPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            return {
                query: `${match[1]} MRT Station, Singapore`,
                type: 'mrt_station',
                original: trimmed
            };
        }
    }
    
    // Shopping mall patterns
    const mallPatterns = [
        /(.+)\s+mall$/i,
        /(.+)\s+plaza$/i,
        /(.+)\s+hub$/i,
        /(.+)\s+centre$/i,
        /(.+)\s+center$/i
    ];
    
    for (let pattern of mallPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            return {
                query: `${match[1]} ${pattern.source.includes('mall') ? 'Mall' : 
                               pattern.source.includes('plaza') ? 'Plaza' :
                               pattern.source.includes('hub') ? 'Hub' : 'Centre'}, Singapore`,
                type: 'shopping_center',
                original: trimmed
            };
        }
    }
    
    // HDB estate patterns (common Singapore housing)
    const hdbPatterns = [
        /(.+)\s+estate$/i,
        /(.+)\s+block\s+(\d+)$/i,
        /block\s+(\d+)\s+(.+)$/i
    ];
    
    for (let pattern of hdbPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            return {
                query: `${trimmed}, Singapore`,
                type: 'hdb_address',
                original: trimmed
            };
        }
    }
    
    // Road/Street patterns
    const roadPatterns = [
        /(.+)\s+road$/i,
        /(.+)\s+street$/i,
        /(.+)\s+avenue$/i,
        /(.+)\s+drive$/i,
        /(.+)\s+lane$/i,
        /(.+)\s+way$/i
    ];
    
    for (let pattern of roadPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            return {
                query: `${trimmed}, Singapore`,
                type: 'street_address',
                original: trimmed
            };
        }
    }
    
    // Default: append Singapore if not present
    const hasCountry = /singapore/i.test(trimmed);
    return {
        query: hasCountry ? trimmed : `${trimmed}, Singapore`,
        type: 'general',
        original: trimmed
    };
}

// Geocode with multiple fallback strategies
async geocodeWithFallback(input, processedInput) {
    const strategies = [
        // Strategy 1: Use processed query with component restrictions
        {
            name: 'Enhanced Query',
            request: {
                address: processedInput.query,
                componentRestrictions: { 
                    country: 'SG',
                    ...(processedInput.type === 'postal_code' ? { postalCode: processedInput.original } : {})
                }
            }
        },
        
        // Strategy 2: Singapore-specific geocoding
        {
            name: 'Singapore Specific',
            request: {
                address: processedInput.query,
                region: 'SG',
                componentRestrictions: { country: 'SG' }
            }
        },
        
        // Strategy 3: Bounds-restricted geocoding (Singapore bounds)
        {
            name: 'Bounds Restricted',
            request: {
                address: processedInput.query,
                bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(1.16, 103.6), // Southwest corner
                    new google.maps.LatLng(1.48, 104.0)  // Northeast corner
                ),
                componentRestrictions: { country: 'SG' }
            }
        },
        
        // Strategy 4: Original input as fallback
        {
            name: 'Original Input',
            request: {
                address: `${processedInput.original}, Singapore`,
                componentRestrictions: { country: 'SG' }
            }
        }
    ];
    
    for (let strategy of strategies) {
        try {
            console.log(`🎯 Trying ${strategy.name} strategy for: ${processedInput.original}`);
            
            const result = await this.geocodeWithStrategy(strategy.request);
            
            if (result && this.isValidSingaporeLocation(result.geometry.location)) {
                console.log(`✅ ${strategy.name} strategy successful!`);
                console.log(`📍 Result: ${result.formatted_address}`);
                console.log(`🎯 Coordinates: ${result.geometry.location.lat().toFixed(6)}, ${result.geometry.location.lng().toFixed(6)}`);
                
                this.processGeocodingResult(input, result);
                return;
            } else {
                console.log(`❌ ${strategy.name} strategy failed or returned invalid location`);
            }
        } catch (error) {
            console.log(`❌ ${strategy.name} strategy error:`, error.message);
        }
    }
    
    console.warn(`❌ All geocoding strategies failed for: ${processedInput.original}`);
    this.handleGeocodingFailure(input, processedInput.original);
}

// Geocode with a specific strategy (promisified)
geocodeWithStrategy(request) {
    return new Promise((resolve, reject) => {
        window.geocoder.geocode(request, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
                // Filter results to ensure they're actually in Singapore
                const singaporeResults = results.filter(result => 
                    this.isValidSingaporeLocation(result.geometry.location)
                );
                
                if (singaporeResults.length > 0) {
                    resolve(singaporeResults[0]);
                } else {
                    reject(new Error('No valid Singapore locations found'));
                }
            } else {
                reject(new Error(`Geocoding failed: ${status}`));
            }
        });
    });
}

// Validate that the location is actually in Singapore
isValidSingaporeLocation(location) {
    const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
    const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
    
    // Singapore bounds check
    const singaporeBounds = {
        north: 1.48,
        south: 1.16,
        east: 104.0,
        west: 103.6
    };
    
    const isInBounds = lat >= singaporeBounds.south && 
                      lat <= singaporeBounds.north && 
                      lng >= singaporeBounds.west && 
                      lng <= singaporeBounds.east;
    
    if (!isInBounds) {
        console.warn(`❌ Location outside Singapore bounds: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        return false;
    }
    
    return true;
}

// Process successful geocoding result
processGeocodingResult(input, result) {
    const latLng = result.geometry.location;
    
    // Store location data
    window.locationData.set(input.id, {
        place: result,
        position: latLng,
        transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
        address: result.formatted_address || result.address_components[0].short_name
    });
    
    // Get person color for marker
    const container = input.closest('.location-container');
    const colorElement = container?.querySelector('.location-icon');
    const personColor = colorElement?.getAttribute('data-person-color') || '#8B5DB8';
    
    // Add marker to map
    addLocationMarker(latLng, input.id, personColor);
    
    console.log(`✅ Successfully geocoded ${input.id}: ${result.formatted_address}`);
    
    // Trigger location check
    if (this.debouncedLocationCheck) {
        this.debouncedLocationCheck();
    }
}

// Use known location coordinates
useKnownLocation(input, coordinates, originalValue) {
    const latLng = new google.maps.LatLng(coordinates.lat, coordinates.lng);
    
    // Create a simplified place object
    const place = {
        geometry: { location: latLng },
        formatted_address: originalValue,
        name: originalValue,
        address_components: [{
            long_name: originalValue,
            short_name: originalValue,
            types: ['establishment']
        }]
    };
    
    this.processGeocodingResult(input, place);
}

// Handle geocoding failure
handleGeocodingFailure(input, originalValue) {
    console.warn(`❌ Could not geocode: ${originalValue}`);
    
    // Show user-friendly error message
    if (typeof showErrorNotification === 'function') {
        showErrorNotification(`Could not find location: "${originalValue}". Please try a more specific address.`);
    }
    
    // Mark input as invalid
    input.classList.add('is-invalid');
    input.classList.remove('is-valid');
    
    // Optional: Show suggestions
    this.showLocationSuggestions(input, originalValue);
}

// Show location suggestions to user
showLocationSuggestions(input, originalValue) {
    const suggestions = this.generateLocationSuggestions(originalValue);
    
    if (suggestions.length > 0) {
        console.log(`💡 Suggestions for "${originalValue}":`, suggestions);
        
        // You could implement a dropdown here to show suggestions
        // For now, just log them for debugging
    }
}

// Generate smart suggestions based on input
generateLocationSuggestions(input) {
    const suggestions = [];
    
    // If it looks like a postal code, suggest adding "Singapore"
    if (/^\d{6}$/.test(input)) {
        suggestions.push(`Singapore ${input}`);
    }
    
    // If it's short, suggest it might be a place name
    if (input.length < 15 && !/\d/.test(input)) {
        suggestions.push(`${input} Singapore`);
        suggestions.push(`${input} MRT Station`);
    }
    
    // Common typos and alternatives
    const commonAlternatives = {
        'orchard': 'Orchard Road',
        'marina': 'Marina Bay',
        'sentosa': 'Sentosa Island',
        'changi': 'Changi Airport',
        'bugis': 'Bugis MRT Station',
        'raffles': 'Raffles Place MRT',
        'jurong': 'Jurong East'
    };
    
    const lowerInput = input.toLowerCase();
    for (let [key, suggestion] of Object.entries(commonAlternatives)) {
        if (lowerInput.includes(key)) {
            suggestions.push(suggestion);
        }
    }
    
        return suggestions;
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
            // Check if Google Maps API is available
            if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
                console.warn('Google Maps Places API not available yet. Will retry initialization later.');
                
                // Retry after a delay
                setTimeout(() => {
                    this.initializeAutocompleteForInput(input);
                }, 1000);
                return;
            }
            
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

class ImprovedSocialMidpointCalculator {
    constructor() {
        this.maxIterations = 50;
        this.convergenceThreshold = 50;
        this.initialRadius = 1500;
        this.radiusIncrementFactor = 1.4;
        this.maxSearchRadius = 5000;
        this.minVenuesRequired = 5;
        
        // Base parameters (will be adapted based on area and group size)
        this.baseMaxTravelTimeMinutes = 60;
        this.maxTravelTimeMinutes = 60;
        this.baseFairnessThreshold = 10;
        this.fairnessThreshold = 10;
        
        // Scoring weights
        this.equityWeight = 0.7;
        this.totalTimeWeight = 0.3;
        
        this.socialPlaceTypes = [
            'restaurant', 'cafe', 'shopping_mall', 'food', 
            'establishment', 'store', 'meal_takeaway', 'bakery',
            'bar', 'movie_theater', 'tourist_attraction'
        ];
        
        // Memoization for travel time calculations
        this.travelTimeCache = new Map();
        
        // Singapore area definitions
        this.cbdZones = [
            {name: "CBD/Marina", lat: 1.2800, lng: 103.8500, radius: 2500, strictness: 1.0},
            {name: "Orchard", lat: 1.3048, lng: 103.8318, radius: 1500, strictness: 1.0},
            {name: "Bugis", lat: 1.3000, lng: 103.8560, radius: 1200, strictness: 1.0},
            {name: "Clarke Quay", lat: 1.2886, lng: 103.8467, radius: 800, strictness: 1.0},
            {name: "Raffles Place", lat: 1.2836, lng: 103.8511, radius: 1000, strictness: 1.0}
        ];
    }

    /**
     * Detect area characteristics and adjust algorithm parameters accordingly
     */
    detectAreaCharacteristics(midpoint) {
        // Check if midpoint is in a high-density area
        for (let zone of this.cbdZones) {
            const distance = this.calculateDistance(midpoint, zone);
            if (distance <= zone.radius) {
                console.log(`🏙️ Detected ${zone.name} area - using strict fairness criteria`);
                return {
                    type: "CBD", 
                    name: zone.name, 
                    strictness: zone.strictness,
                    venueMultiplier: 1.0
                };
            }
        }
        
        // Check if we're near major MRT hubs (good connectivity)
        const majorHubs = [
            {name: "Jurong East", lat: 1.3329, lng: 103.7421, radius: 1500},
            {name: "Tampines", lat: 1.3527, lng: 103.9453, radius: 1500},
            {name: "Bishan", lat: 1.3513, lng: 103.8483, radius: 1200},
            {name: "Serangoon", lat: 1.3498, lng: 103.8736, radius: 1200}
        ];
        
        for (let hub of majorHubs) {
            const distance = this.calculateDistance(midpoint, hub);
            if (distance <= hub.radius) {
                console.log(`🚇 Detected ${hub.name} MRT hub area - using balanced criteria`);
                return {
                    type: "MRT_Hub", 
                    name: hub.name, 
                    strictness: 1.3,
                    venueMultiplier: 1.2
                };
            }
        }
        
        // Default to residential area (more lenient)
        console.log(`🏘️ Detected residential area - using lenient criteria`);
        return {
            type: "Residential", 
            name: "Residential", 
            strictness: 1.8,
            venueMultiplier: 1.5
        };
    }

    /**
     * Dynamically adjust algorithm parameters based on area and group characteristics
     */
    adjustParameters(startingLocations, areaInfo) {
        const groupSize = startingLocations.length;
        
        // Base fairness threshold by group size
        let baseFairness = groupSize <= 2 ? 12 :  // Increased from 10
                          groupSize <= 4 ? 18 :  // Increased from 15
                          groupSize <= 6 ? 24 :  // Increased from 20
                          30;                    // Increased from 25
        
        // Apply area-specific multiplier
        this.fairnessThreshold = baseFairness * areaInfo.strictness;
        
        // Adjust travel time limits based on distance
        const maxDistance = this.calculateMaxDistance(startingLocations);
        const distanceKm = maxDistance / 1000;
        
        if (distanceKm > 30) {
            this.maxTravelTimeMinutes = 90;
        } else if (distanceKm > 15) {
            this.maxTravelTimeMinutes = 75;
        } else {
            this.maxTravelTimeMinutes = this.baseMaxTravelTimeMinutes;
        }
        
        // Adjust minimum venues required based on area
        this.minVenuesRequired = Math.ceil(5 * areaInfo.venueMultiplier);
        
        console.log(`⚙️ Algorithm parameters adjusted:`);
        console.log(`   Area: ${areaInfo.name} (${areaInfo.type})`);
        console.log(`   Group size: ${groupSize} people`);
        console.log(`   Fairness threshold: ${this.fairnessThreshold.toFixed(1)} minutes`);
        console.log(`   Max travel time: ${this.maxTravelTimeMinutes} minutes`);
        console.log(`   Min venues required: ${this.minVenuesRequired}`);
        console.log(`   Geographic spread: ${distanceKm.toFixed(1)}km`);
    }

    calculateMaxDistance(locations) {
        let maxDist = 0;
        for (let i = 0; i < locations.length; i++) {
            for (let j = i + 1; j < locations.length; j++) {
                const dist = this.calculateDistance(
                    { lat: locations[i].lat(), lng: locations[i].lng() },
                    { lat: locations[j].lat(), lng: locations[j].lng() }
                );
                maxDist = Math.max(maxDist, dist);
            }
        }
        return maxDist;
    }

    /**
     * Enhanced venue search with accessibility scoring
     */
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
                types: this.socialPlaceTypes
            }, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    // Enhanced filtering with accessibility scoring
                    const scoredVenues = results.map(venue => {
                        venue.accessibilityScore = this.calculateAccessibilityScore(venue);
                        return venue;
                    }).filter(venue => {
                        // More lenient basic filtering
                        if (!venue.rating || venue.rating < 3.5) return false; // Lowered from 4.0
                        if (!venue.user_ratings_total || venue.user_ratings_total < 5) return false; // Lowered from 10
                        
                        const name = venue.name.toLowerCase();
                        const excludeKeywords = [
                            'private', 'club', 'country club', 'golf', 'yacht',
                            'members only', 'exclusive', 'hospital', 'clinic'
                        ];
                        
                        if (excludeKeywords.some(keyword => name.includes(keyword))) {
                            return false;
                        }
                        
                        return true;
                    });
                    
                    // Sort by accessibility score and rating
                    scoredVenues.sort((a, b) => {
                        const scoreA = a.accessibilityScore * 0.6 + (a.rating || 0) * 0.4;
                        const scoreB = b.accessibilityScore * 0.6 + (b.rating || 0) * 0.4;
                        return scoreB - scoreA;
                    });
                    
                    const topVenues = scoredVenues.slice(0, 25); // Increased from 12
                    
                    console.log(`   Found ${topVenues.length} accessible venues (from ${results.length} total)`);
                    resolve(topVenues);
                } else {
                    console.warn(`   Places search failed: ${status}`);
                    resolve([]);
                }
            });
        });
    }

    /**
     * Calculate accessibility score for a venue
     */
    calculateAccessibilityScore(venue) {
        let score = 0;
        
        // Base rating bonus
        if (venue.rating >= 4.0) score += 0.3;
        if (venue.rating >= 4.5) score += 0.2;
        
        // Review count bonus (popular venues)
        if (venue.user_ratings_total >= 50) score += 0.2;
        if (venue.user_ratings_total >= 200) score += 0.1;
        
        // Venue type bonuses
        if (venue.types.includes('shopping_mall')) {
            score += 0.4; // Malls usually have good transport access
        }
        if (venue.types.includes('subway_station')) {
            score += 0.5; // Direct MRT access
        }
        if (venue.types.includes('restaurant')) {
            score += 0.2; // Social dining
        }
        if (venue.types.includes('cafe')) {
            score += 0.1; // Good for casual meetings
        }
        
        // Location-based bonuses
        const name = venue.name.toLowerCase();
        const vicinity = (venue.vicinity || '').toLowerCase();
        
        const transportKeywords = [
            'mrt', 'station', 'interchange', 'junction', 
            'hub', 'central', 'plaza', 'mall'
        ];
        
        transportKeywords.forEach(keyword => {
            if (name.includes(keyword) || vicinity.includes(keyword)) {
                score += 0.1;
            }
        });
        
        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Progressive venue analysis with multiple fallback modes
     */
    async analyzeVenueTravelEquity(venues, startingLocations) {
        console.log(`📊 Analyzing travel equity for ${venues.length} venues...`);
        
        // Try different analysis modes
        let analysis = await this.tryAnalysisWithMode(venues, startingLocations, 'optimal');
        
        if (analysis.length === 0) {
            console.log(`⚠️ Optimal analysis found no venues, trying balanced mode...`);
            analysis = await this.tryAnalysisWithMode(venues, startingLocations, 'balanced');
        }
        
        if (analysis.length === 0) {
            console.log(`⚠️ Balanced analysis found no venues, trying lenient mode...`);
            analysis = await this.tryAnalysisWithMode(venues, startingLocations, 'lenient');
        }
        
        return analysis;
    }

    async tryAnalysisWithMode(venues, startingLocations, mode) {
        const modeSettings = {
            'optimal': { timeMultiplier: 1.0, fairnessMultiplier: 1.0 },
            'balanced': { timeMultiplier: 1.3, fairnessMultiplier: 1.5 },
            'lenient': { timeMultiplier: 1.6, fairnessMultiplier: 2.0 }
        };
        
        const settings = modeSettings[mode];
        const results = [];
        
        // Limit venues to analyze to prevent API quota issues
        const venuesToAnalyze = venues.slice(0, Math.min(20, venues.length));
        
        for (const venue of venuesToAnalyze) {
            try {
                const travelData = await this.calculateTravelTimesForVenue(
                    new google.maps.DirectionsService(),
                    startingLocations,
                    venue.geometry.location,
                    venue.name
                );
                
                if (travelData) {
                    const { travelTimes, transportModes } = travelData;
                    
                    const maxTime = Math.max(...travelTimes);
                    const minTime = Math.min(...travelTimes);
                    const avgTime = travelTimes.reduce((a, b) => a + b, 0) / travelTimes.length;
                    const timeVariance = this.calculateVariance(travelTimes);
                    const timeRange = maxTime - minTime;
                    
                    // Progressive equity scoring
                    const equityScore = this.calculateProgressiveEquityScore(
                        travelTimes, avgTime, transportModes, timeRange, settings
                    );
                    
                    // Accept venue if it meets relaxed criteria
                    const adjustedFairness = this.fairnessThreshold * settings.fairnessMultiplier;
                    const adjustedMaxTime = this.maxTravelTimeMinutes * settings.timeMultiplier;
                    
                    if (maxTime <= adjustedMaxTime) { // Always include if travel time is reasonable
                        results.push({
                            name: venue.name,
                            location: {
                                lat: venue.geometry.location.lat(),
                                lng: venue.geometry.location.lng()
                            },
                            travelTimes,
                            maxTravelTime: maxTime,
                            minTravelTime: minTime,
                            avgTravelTime: avgTime,
                            timeVariance,
                            timeRange,
                            equityScore,
                            rating: venue.rating,
                            venue: venue,
                            transportModes,
                            accessibilityScore: venue.accessibilityScore || 0,
                            analysisMode: mode
                        });
                    }
                }
            } catch (error) {
                console.log(`   ❌ Error analyzing ${venue.name}: ${error.message}`);
            }
        }
        
        // Sort by equity score
        results.sort((a, b) => a.equityScore - b.equityScore);
        
        console.log(`   ${mode.toUpperCase()} mode: ${results.length} venues passed analysis`);
        
        return results;
    }

    /**
     * Progressive equity scoring that doesn't reject venues outright
     */
    calculateProgressiveEquityScore(travelTimes, avgTime, transportModes, timeRange, settings) {
        const timeVariance = this.calculateVariance(travelTimes);
        const maxTime = Math.max(...travelTimes);
        
        // Base score components (normalized 0-1)
        const normalizedRange = Math.min(timeRange / (this.fairnessThreshold * 2), 1.0);
        const normalizedVariance = Math.min(timeVariance / 100, 1.0);
        const normalizedAvgTime = Math.min(avgTime / this.maxTravelTimeMinutes, 1.0);
        
        // Weighted base score
        let equityScore = (normalizedRange * 0.5) +           // Range most important
                         (normalizedVariance * 0.3) +        // Variance second
                         (normalizedAvgTime * 0.2);          // Efficiency third
        
        // Progressive penalty for excessive range (instead of rejection)
        if (timeRange > this.fairnessThreshold) {
            const excessRange = timeRange - this.fairnessThreshold;
            const rangePenalty = Math.pow(excessRange / this.fairnessThreshold, 1.2) * 0.4;
            equityScore += rangePenalty;
        }
        
        // Mixed transport mode penalty (graduated)
        const uniqueModes = new Set(transportModes);
        if (uniqueModes.size > 1) {
            const mixedPenalty = Math.min(0.3, timeRange / 60 * 0.15);
            equityScore += mixedPenalty;
        }
        
        // Bonus for excellent venues in lenient mode
        if (settings.fairnessMultiplier > 1.5 && timeRange < this.fairnessThreshold * 0.7) {
            equityScore *= 0.8; // 20% bonus for fair venues in difficult areas
        }
        
        return equityScore;
    }

    /**
     * Main algorithm with progressive fallback strategy
     */
    async calculateSocialMidpoint(startingLocations) {
        const groupSize = startingLocations.length;
        console.log(`🚀 Starting Improved Enhanced Social Fairness Algorithm for ${groupSize} people...`);
        
        if (groupSize < 2) {
            throw new Error('Need at least 2 locations for midpoint calculation');
        }

        // Detect area characteristics and adjust parameters
        const geometricCenter = this.calculateGeometricMidpoint(startingLocations);
        const areaInfo = this.detectAreaCharacteristics(geometricCenter);
        this.adjustParameters(startingLocations, areaInfo);
        
        // Try progressive approaches
        let result = await this.findOptimalVenueWithFallback(startingLocations, geometricCenter);
        
        if (result) {
            console.log(`✅ Algorithm successful! Found optimal venue: ${result.name || 'Unnamed venue'}`);
            return new google.maps.LatLng(result.lat, result.lng);
        } else {
            console.log(`⚠️ All approaches failed, using enhanced geometric midpoint`);
            return new google.maps.LatLng(geometricCenter.lat, geometricCenter.lng);
        }
    }

    async findOptimalVenueWithFallback(startingLocations, initialCenter) {
        const approaches = [
            { name: 'Strict', radiusMultiplier: 1.0, venueLimit: 15 },
            { name: 'Balanced', radiusMultiplier: 1.3, venueLimit: 20 },
            { name: 'Lenient', radiusMultiplier: 1.6, venueLimit: 25 },
            { name: 'Emergency', radiusMultiplier: 2.0, venueLimit: 30 }
        ];

        for (let approach of approaches) {
            console.log(`\n🎯 Trying ${approach.name} approach...`);
            
            const result = await this.runAlgorithmApproach(
                startingLocations, 
                initialCenter, 
                approach
            );
            
            if (result) {
                console.log(`✅ ${approach.name} approach successful!`);
                this.logDetailedResults(result, approach.name);
                return result.location;
            }
        }
        
        return null;
    }

    async runAlgorithmApproach(startingLocations, initialCenter, approach) {
        let currentSearchCenter = initialCenter;
        let searchRadius = this.initialRadius * approach.radiusMultiplier;
        let bestVenue = null;
        let bestScore = Infinity;
        let iteration = 0;
        let noImprovementCount = 0;
        
        const maxRadius = this.maxSearchRadius * approach.radiusMultiplier;
        
        while (iteration < this.maxIterations && searchRadius <= maxRadius) {
            iteration++;
            console.log(`   🔍 Iteration ${iteration}: Searching ${searchRadius.toFixed(0)}m radius`);
            
            // Find venues
            const venues = await this.findSocialVenues(currentSearchCenter, searchRadius);
            
            if (venues.length < Math.ceil(this.minVenuesRequired * 0.6)) {
                console.log(`   ❌ Only ${venues.length} venues found, expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            console.log(`   ✅ Analyzing ${venues.length} venues...`);
            
            // Analyze venues
            const analysis = await this.analyzeVenueTravelEquity(venues, startingLocations);
            
            if (analysis.length === 0) {
                console.log(`   ❌ No venues passed analysis, expanding search...`);
                searchRadius *= this.radiusIncrementFactor;
                continue;
            }
            
            // Find best venue in this iteration
            const currentBest = analysis[0]; // Already sorted by equity score
            
            if (currentBest.equityScore < bestScore) {
                const improvement = bestScore - currentBest.equityScore;
                bestScore = currentBest.equityScore;
                bestVenue = currentBest;
                noImprovementCount = 0;
                
                console.log(`   ⭐ New best: ${currentBest.name}`);
                console.log(`   📊 Travel times: [${currentBest.travelTimes.map(t => t.toFixed(1)).join(', ')}] min`);
                console.log(`   📈 Equity score: ${currentBest.equityScore.toFixed(3)} (improvement: ${improvement.toFixed(3)})`);
                console.log(`   🎯 Time range: ${currentBest.timeRange.toFixed(1)} min (threshold: ${this.fairnessThreshold.toFixed(1)} min)`);
                
                // Focus search around best venue
                currentSearchCenter = currentBest.location;
                searchRadius = Math.max(800, searchRadius * 0.7);
                
                // Early exit for excellent results
                if (currentBest.timeRange <= this.fairnessThreshold * 0.8 && 
                    currentBest.avgTravelTime < 45) {
                    console.log(`   🏆 Excellent result found, stopping early!`);
                    break;
                }
            } else {
                noImprovementCount++;
                searchRadius *= this.radiusIncrementFactor;
                console.log(`   📈 No improvement (${noImprovementCount} iterations), expanding to ${searchRadius.toFixed(0)}m`);
            }
            
            // Stop if no improvement for several iterations
            if (noImprovementCount >= 3) {
                console.log(`   ⏹️ Stopping after ${noImprovementCount} iterations without improvement`);
                break;
            }
        }
        
        return bestVenue;
    }

    /**
     * Enhanced geometric midpoint calculation
     */
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
     * Travel time calculation with caching
     */
    async calculateTravelTimesForVenue(directionsService, startingLocations, destination, venueName) {
        console.log(`   🚌 Calculating travel times for ${venueName}...`);
        
        const travelTimes = [];
        const actualModes = [];
        
        for (let personIdx = 0; personIdx < startingLocations.length; personIdx++) {
            const locationId = `location-${personIdx + 1}`;
            const preferredMode = window.userTransportModes.get(locationId) || 'TRANSIT';
            const googleMapsMode = this.convertToGoogleMapsMode(preferredMode);
            
            try {
                const time = await this.getTravelTimeWithCache(
                    directionsService,
                    startingLocations[personIdx],
                    destination,
                    googleMapsMode
                );
                
                if (!time || time > this.maxTravelTimeMinutes * 1.5) {
                    console.log(`     ❌ Person ${personIdx + 1}: ${preferredMode} time ${time?.toFixed(1) || 'null'}min exceeds limit`);
                    return null;
                }
                
                travelTimes.push(time);
                actualModes.push(preferredMode);
                
                console.log(`     ✅ Person ${personIdx + 1}: ${time.toFixed(1)}min via ${preferredMode}`);
                
            } catch (error) {
                console.log(`     ❌ Person ${personIdx + 1}: ${preferredMode} error - ${error.message}`);
                return null;
            }
        }
        
        return {
            travelTimes: travelTimes,
            transportModes: actualModes
        };
    }

    async getTravelTimeWithCache(directionsService, origin, destination, travelMode) {
        // Create cache key
        const originLat = typeof origin.lat === 'function' ? origin.lat() : origin.lat;
        const originLng = typeof origin.lng === 'function' ? origin.lng() : origin.lng;
        const destLat = typeof destination.lat === 'function' ? destination.lat() : destination.lat;
        const destLng = typeof destination.lng === 'function' ? destination.lng() : destination.lng;
        
        const cacheKey = `${originLat.toFixed(4)},${originLng.toFixed(4)}_${destLat.toFixed(4)},${destLng.toFixed(4)}_${travelMode}`;
        
        // Check cache
        if (this.travelTimeCache.has(cacheKey)) {
            return this.travelTimeCache.get(cacheKey);
        }
        
        // Calculate travel time
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
                    
                    // Cache result
                    this.travelTimeCache.set(cacheKey, durationMinutes);
                    
                    resolve(durationMinutes);
                } else {
                    reject(new Error(`Directions failed: ${status}`));
                }
            });
        });
    }

    convertToGoogleMapsMode(uiMode) {
        switch (uiMode) {
            case 'TRANSIT': return google.maps.TravelMode.TRANSIT;
            case 'DRIVING': return google.maps.TravelMode.DRIVING;
            case 'WALKING': return google.maps.TravelMode.WALKING;
            default: return google.maps.TravelMode.TRANSIT;
        }
    }

    calculateDistance(point1, point2) {
        const lat1 = typeof point1.lat === 'function' ? point1.lat() : point1.lat;
        const lng1 = typeof point1.lng === 'function' ? point1.lng() : point1.lng;
        const lat2 = typeof point2.lat === 'function' ? point2.lat() : point2.lat;
        const lng2 = typeof point2.lng === 'function' ? point2.lng() : point2.lng;
        
        const R = 6371000; // Earth's radius in meters
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

    /**
     * Detailed results logging
     */
    logDetailedResults(bestVenue, approach) {
        console.log(`\n🎯 FINAL RESULTS (${approach.toUpperCase()} APPROACH):`);
        console.log(`   🏆 Selected Venue: ${bestVenue.name}`);
        console.log(`   📍 Location: ${bestVenue.location.lat.toFixed(6)}, ${bestVenue.location.lng.toFixed(6)}`);
        console.log(`   ⭐ Rating: ${bestVenue.rating}/5.0`);
        console.log(`   🚇 Accessibility Score: ${bestVenue.accessibilityScore.toFixed(2)}`);
        console.log(`   \n⏱️ TRAVEL TIME ANALYSIS:`);
        console.log(`   📊 Individual times: [${bestVenue.travelTimes.map(t => t.toFixed(1)).join(', ')}] minutes`);
        console.log(`   📈 Average: ${bestVenue.avgTravelTime.toFixed(1)}min`);
        console.log(`   📏 Range: ${bestVenue.timeRange.toFixed(1)}min (threshold: ${this.fairnessThreshold.toFixed(1)}min)`);
        console.log(`   📐 Variance: ${bestVenue.timeVariance.toFixed(1)}min²`);
        console.log(`   🎯 Equity Score: ${bestVenue.equityScore.toFixed(3)} (lower is better)`);
        console.log(`   \n🚌 TRANSPORT MODES:`);
        bestVenue.transportModes.forEach((mode, idx) => {
            console.log(`   Person ${idx + 1}: ${mode} (${bestVenue.travelTimes[idx].toFixed(1)}min)`);
        });
        
        // Store results globally for route display
        window.algorithmResults = {
            venue: bestVenue,
            calculatedTimes: bestVenue.travelTimes,
            transportModes: bestVenue.transportModes,
            equityScore: bestVenue.equityScore,
            fairnessThreshold: this.fairnessThreshold,
            approach: approach,
            timestamp: Date.now()
        };
    }
}

// Replace the existing calculateSocialMidpoint function
async function calculateSocialMidpoint(locations) {
    if (!locations || !Array.isArray(locations) || locations.length < 2) {
        throw new Error('Invalid locations provided for midpoint calculation');
    }
    
    try {
        console.log(`🚀 Starting improved social midpoint calculation for ${locations.length} people...`);
        
        const validLocations = locations.filter(loc => {
            if (!loc) return false;
            if (typeof loc.lat !== 'function' && typeof loc.lat !== 'number') return false;
            if (typeof loc.lng !== 'function' && typeof loc.lng !== 'number') return false;
            return true;
        });
        
        if (validLocations.length < 2) {
            throw new Error('Not enough valid locations for calculation');
        }
        
        // Use the improved calculator
        const calculator = new ImprovedSocialMidpointCalculator();
        const result = await calculator.calculateSocialMidpoint(validLocations);
        
        if (result && result.lat && result.lng) {
            console.log(`🎯 Improved algorithm successful for ${validLocations.length} people`);
            return result;
        } else {
            throw new Error('Improved algorithm returned invalid result');
        }
    } catch (error) {
        console.warn(`Improved algorithm failed:`, error);
        showErrorNotification('Using geometric midpoint fallback');
        
        // Ultimate fallback to geometric midpoint
        let totalLat = 0, totalLng = 0;
        locations.forEach(location => {
            const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
            const lng = typeof location.lng === 'function' ? location.lng() : location.lng;
            totalLat += lat;
            totalLng += lng;
        });
        
        return new google.maps.LatLng(
            totalLat / locations.length, 
            totalLng / locations.length
        );
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
    const currentPath = window.location.pathname;
    
    // Set active state based on current path
    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        
        // Mark the appropriate nav item as active based on current path
        if ((page === 'home' && (currentPath === '/' || currentPath === '/app' || currentPath === '/dashboard')) ||
            (page === 'groups' && currentPath === '/groups') ||
            (page === 'profile' && currentPath === '/profile')) {
            item.classList.add('active');
        }
        
        // Add click event listeners
        item.addEventListener('click', function() {
            // Don't do anything if already on this page
            if (this.classList.contains('active') && page !== 'create') {
                return;
            }
            
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            const page = this.getAttribute('data-page');
            
            switch(page) {
                case 'home':
                    // Check if user is authenticated before redirecting
                    if (firebase.auth().currentUser) {
                        window.location.href = '/app';
                    } else {
                        window.location.href = '/login';
                    }
                    break;
                case 'groups':
                    window.location.href = '/groups';
                    break;
                case 'profile':
                    window.location.href = '/profile';
                    break;
                case 'compass':
                    // Not implemented yet
                    break;
                case 'create':
                    showCreateGroupModal();
                    break;
            }
        });
    });
}

function showCreateGroupModal(event){
    if (event) {
        event.stopPropagation(); // Prevent immediate propagation to document
    }
    
    const menu = document.getElementById('dropdown-menu');
    if (menu) {
        menu.classList.toggle('hidden');
        
        // Add click-outside-to-close handler if menu is visible
        if (!menu.classList.contains('hidden')) {
            setTimeout(() => {
                document.addEventListener('click', closeCreateGroupModal);
            }, 10);
        } else {
            document.removeEventListener('click', closeCreateGroupModal);
        }
    }
}

function closeCreateGroupModal(event) {
    const menu = document.getElementById('dropdown-menu');
    const createButton = document.querySelector('.nav-item[data-page="create"]');
    
    // Check if click is outside the menu and not on the create button
    if (menu && !menu.contains(event.target) && 
        createButton && !createButton.contains(event.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeCreateGroupModal);
        
        // Revert back to home nav item being active
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));
        
        // Find the home nav item and make it active
        const homeNavItem = document.querySelector('.nav-item[data-page="home"]');
        if (homeNavItem) {
            homeNavItem.classList.add('active');
        }
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

function validateRouteDisplay() {
    if (window.algorithmResults) {
        console.log(`🔍 FAIRNESS VALIDATION:`);
        console.log(`   Algorithm predicted range: ${window.algorithmResults.calculatedRange.toFixed(1)}min`);
        console.log(`   Algorithm times: [${window.algorithmResults.calculatedTimes.map(t => t.toFixed(1)).join(', ')}]`);
        console.log(`   Venue: ${window.algorithmResults.venue.name}`);
        
        // This will be called after routes are displayed to compare
        setTimeout(() => {
            console.log(`\n🚨 ROUTE DISPLAY COMPLETE - Check if times match predictions above!`);
        }, 5000);
    }
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

