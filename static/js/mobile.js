// ===== SIMPLIFIED MOBILE.JS - CLEAN VERSION =====
// This replaces your entire mobile.js file

// Initialize global storage
window.directionsRenderers = window.directionsRenderers || [];
window.userTransportModes = window.userTransportModes || new Map();
window.locationData = window.locationData || new Map();
window.locationMarkers = window.locationMarkers || {};

// Transport modes configuration
window.TRANSPORT_MODES = [
    { mode: 'TRANSIT', icon: '<i class="fas fa-subway"></i>', name: 'Public Transport', class: 'transit' },
    { mode: 'DRIVING', icon: '<i class="fas fa-car"></i>', name: 'Car/Taxi', class: 'driving' },
    { mode: 'WALKING', icon: '<i class="fas fa-walking"></i>', name: 'Walking', class: 'walking' }
];

// ===== CORE FUNCTIONS =====

function setupTransportCycling() {
    document.addEventListener('click', function(e) {
        const transportIcon = e.target.classList.contains('transport-icon') ? 
                             e.target : e.target.closest('.transport-icon');
        
        if (transportIcon) {
            cycleTransportMode(transportIcon);
        }
    });
}

function cycleTransportMode(iconElement) {
    const person = iconElement.getAttribute('data-person');
    const currentMode = iconElement.getAttribute('data-current-mode');
    
    const currentIndex = window.TRANSPORT_MODES.findIndex(mode => mode.mode === currentMode);
    const nextIndex = (currentIndex + 1) % window.TRANSPORT_MODES.length;
    const nextMode = window.TRANSPORT_MODES[nextIndex];
    
    updateTransportIcon(iconElement, nextMode, person);
    
    iconElement.classList.add('tap-animation');
    setTimeout(() => iconElement.classList.remove('tap-animation'), 300);
    
    console.log(`🔄 Person ${person} switched to: ${nextMode.name}`);
}

function updateTransportIcon(iconElement, modeConfig, person) {
    const locationId = `location-${person}`;
    
    iconElement.innerHTML = modeConfig.icon;
    iconElement.setAttribute('data-current-mode', modeConfig.mode);
    iconElement.setAttribute('data-tooltip', modeConfig.name);
    iconElement.className = `transport-icon ${modeConfig.class}`;
    
    // Update global storage
    window.userTransportModes.set(locationId, modeConfig.mode);
    
    if (window.locationData && window.locationData.has(locationId)) {
        const locationData = window.locationData.get(locationId);
        locationData.transportMode = modeConfig.mode;
        window.locationData.set(locationId, locationData);
    }
    
    // Trigger validation check
    checkAllLocationsAndUpdateButton();
}

function showErrorNotification(message) {
    console.error('Error:', message);
    
    const existing = document.getElementById('error-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'error-notification';
    notification.style.cssText = `
        position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
        background: rgba(244, 67, 54, 0.95); color: white; padding: 12px 20px;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999; max-width: 90%; text-align: center; font-size: 14px;
        backdrop-filter: blur(10px);
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) notification.remove();
    }, 3000);
}

// ===== LOCATION MANAGEMENT =====

function addLocationMarker(location, inputId, color = '#8B5DB8') {
    console.log('Adding marker for', inputId, 'with color', color);
    
    if (!window.locationMarkers) window.locationMarkers = {};
    
    if (window.locationMarkers[inputId]) {
        window.locationMarkers[inputId].setMap(null);
    }

    if (!window.midwhereahMap) {
        console.error('Map not initialized! Cannot add marker.');
        return;
    }

    const markerIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8
    };

    try {
        const marker = new google.maps.Marker({
            position: location,
            map: window.midwhereahMap,
            title: document.getElementById(inputId)?.value || 'Location',
            icon: markerIcon,
            animation: google.maps.Animation.DROP
        });

        window.locationMarkers[inputId] = marker;
        window.midwhereahMap.panTo(location);
        
        // Trigger validation check after marker is added
        setTimeout(() => checkAllLocationsAndUpdateButton(), 100);
    } catch (error) {
        console.error('Error creating marker:', error);
    }
}

function checkAllLocationsAndUpdateButton() {
    const inputs = document.querySelectorAll('.location-input');
    const findBtn = document.getElementById('find-central-btn');
    
    if (!findBtn) return;

    let validLocations = 0;

    inputs.forEach(input => {
        const hasText = input.value.trim().length >= 3;
        const hasLocationData = window.locationData.has(input.id);
        const hasMarker = window.locationMarkers && window.locationMarkers[input.id];
        
        if (hasText && (hasLocationData || hasMarker)) {
            validLocations++;
            input.classList.add('is-valid');
            input.classList.remove('is-invalid');
        } else if (hasText) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
        } else {
            input.classList.remove('is-valid', 'is-invalid');
        }
    });

    const hasEnoughLocations = validLocations >= 2;
    
    findBtn.style.display = hasEnoughLocations ? 'flex' : 'none';
    findBtn.classList.toggle('active', hasEnoughLocations);
    findBtn.disabled = !hasEnoughLocations;
    
    if (!hasEnoughLocations) {
        findBtn.title = 'Need at least 2 valid locations';
    } else {
        findBtn.title = `Find central location for ${validLocations} people`;
    }
}

// ===== INITIALIZATION FUNCTIONS =====

async function initMap() {
    console.log('initMap called');
    const singapore = { lat: 1.3521, lng: 103.8198 };

    try {
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found!");
            return;
        }
        
        if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
            mapContainer.style.width = '100vw';
            mapContainer.style.height = '100vh';
        }
        
        const { Map } = await google.maps.importLibrary("maps");
        
        const map = new Map(mapContainer, {
            center: singapore,
            zoom: 10,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            zoomControl: false,
            gestureHandling: 'greedy',
            clickableIcons: false,
            disableDefaultUI: false,
            keyboardShortcuts: false,
        });
        
        window.midwhereahMap = map;
        window.geocoder = new google.maps.Geocoder();
        window.placesService = new google.maps.places.PlacesService(map);
        
        // Initialize autocomplete for existing inputs
        await setupAutocompleteForExistingInputs();
        
        console.log("Google Maps initialized successfully");
    } catch (error) {
        console.error("Error initializing Google Maps:", error);
    }
}

async function setupAutocompleteForExistingInputs() {
    const locationInputs = document.querySelectorAll('.location-input');
    
    try {
        const { Autocomplete } = await google.maps.importLibrary("places");
        
        locationInputs.forEach((input, index) => {
            // Initialize transport mode for this input
            window.userTransportModes.set(input.id, 'TRANSIT');
            
            // Set up autocomplete
            const autocomplete = new Autocomplete(input, {
                componentRestrictions: { country: "sg" },
                fields: ["geometry", "formatted_address", "name"],
                types: ["address"]
            });
            
            input.autocomplete = autocomplete;
            
            autocomplete.addListener('place_changed', function() {
                const place = autocomplete.getPlace();
                if (!place || !place.geometry) {
                    console.warn("No geometry for place:", place?.name);
                    return;
                }
                
                // Store location data
                window.locationData.set(input.id, {
                    place: place,
                    position: place.geometry.location,
                    transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                    address: place.formatted_address || place.name
                });
                
                // Get color for this person
                const personId = parseInt(input.id.split('-')[1]) || (index + 1);
                const colors = ['#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#F97316', '#6366F1'];
                const color = colors[(personId - 1) % colors.length];
                
                // Add marker
                addLocationMarker(place.geometry.location, input.id, color);
                
                console.log(`Location set for ${input.id}:`, place.formatted_address);
            });
            
            // Set up manual geocoding fallback
            input.addEventListener('input', () => {
                if (input.geocodeTimeout) clearTimeout(input.geocodeTimeout);
                
                const value = input.value.trim();
                if (value.length >= 3) {
                    input.geocodeTimeout = setTimeout(() => {
                        if (!window.locationData.has(input.id)) {
                            geocodeManually(input, value);
                        }
                    }, 2000);
                }
            });
        });
        
    } catch (error) {
        console.error('Error setting up autocomplete:', error);
    }
}

function geocodeManually(input, address) {
    if (!window.geocoder) return;
    
    console.log(`Geocoding manually: ${address}`);
    
    window.geocoder.geocode(
        { address: `${address}, Singapore`, componentRestrictions: { country: 'SG' } },
        (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
                const result = results[0];
                
                window.locationData.set(input.id, {
                    place: result,
                    position: result.geometry.location,
                    transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                    address: result.formatted_address
                });
                
                const personId = parseInt(input.id.split('-')[1]) || 1;
                const colors = ['#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#F97316', '#6366F1'];
                const color = colors[(personId - 1) % colors.length];
                
                addLocationMarker(result.geometry.location, input.id, color);
                
                console.log(`Geocoded ${address}:`, result.formatted_address);
            } else {
                console.warn(`Geocoding failed for ${address}:`, status);
                showErrorNotification(`Could not find location: ${address}`);
            }
        }
    );
}

// ===== MIDPOINT CALCULATION =====

function setupFindCentralButton() {
    const findCentralBtn = document.getElementById('find-central-btn');
    if (!findCentralBtn) {
        console.error('Find central button not found!');
        return;
    }

    findCentralBtn.addEventListener('click', async function() {
        console.log('🔥 Find central button clicked!');
        
        // Get all valid location data
        const allLocationData = getAllLocationData();
        
        if (allLocationData.length < 2) {
            showErrorNotification('Please enter at least 2 locations');
            return;
        }
        
        console.log(`Processing ${allLocationData.length} locations`);
        
        // Clear existing midpoint marker
        if (window.midpointMarker) {
            window.midpointMarker.setMap(null);
        }
        
        // Show loading state
        const originalContent = findCentralBtn.innerHTML;
        findCentralBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        findCentralBtn.style.pointerEvents = 'none';
        
        try {
            // Extract positions
            const locations = allLocationData.map(data => data.position);
            
            console.log('Running midpoint calculation...');
            
            // Try social algorithm first, fallback to geometric
            let midpoint;
            try {
                midpoint = await calculateSocialMidpoint(locations);
            } catch (error) {
                console.warn('Social algorithm failed, using geometric:', error);
                midpoint = calculateGeometricMidpoint(locations);
            }
            
            window.calculatedMidpoint = midpoint;
            
            // Create midpoint marker
            window.midpointMarker = new google.maps.Marker({
                position: midpoint,
                map: window.midwhereahMap,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#4CAF50',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                    scale: 15
                },
                title: `Meeting Point for ${allLocationData.length} People`,
                animation: google.maps.Animation.BOUNCE
            });
            
            // Stop animation after 2 seconds
            setTimeout(() => {
                if (window.midpointMarker) {
                    window.midpointMarker.setAnimation(null);
                }
            }, 2000);
            
            // Center map
            window.midwhereahMap.panTo(midpoint);
            window.midwhereahMap.setZoom(14);
            
            console.log('✅ Midpoint calculated successfully');
            
        } catch (error) {
            console.error('Error calculating midpoint:', error);
            showErrorNotification('Could not calculate meeting point');
        }
        
        // Restore button
        findCentralBtn.innerHTML = originalContent;
        findCentralBtn.style.pointerEvents = 'auto';
    });
}

function getAllLocationData() {
    const data = [];
    
    // Get from stored location data first
    window.locationData.forEach((locationData, inputId) => {
        if (locationData.position) {
            data.push({
                inputId: inputId,
                position: locationData.position,
                transportMode: locationData.transportMode,
                address: locationData.address
            });
        }
    });
    
    // Fallback to markers if needed
    if (data.length < 2 && window.locationMarkers) {
        Object.keys(window.locationMarkers).forEach(inputId => {
            // Don't duplicate
            if (data.some(d => d.inputId === inputId)) return;
            
            const marker = window.locationMarkers[inputId];
            const input = document.getElementById(inputId);
            
            if (marker && input && input.value.trim()) {
                data.push({
                    inputId: inputId,
                    position: marker.getPosition(),
                    transportMode: window.userTransportModes.get(inputId) || 'TRANSIT',
                    address: input.value.trim()
                });
            }
        });
    }
    
    return data;
}

function calculateGeometricMidpoint(locations) {
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

// Import the social midpoint calculator from your existing code
async function calculateSocialMidpoint(locations) {
    // This will use your existing ImprovedSocialMidpointCalculator
    // if it's available, otherwise fallback to geometric
    if (typeof ImprovedSocialMidpointCalculator !== 'undefined') {
        const calculator = new ImprovedSocialMidpointCalculator();
        return await calculator.calculateSocialMidpoint(locations);
    } else {
        return calculateGeometricMidpoint(locations);
    }
}

// ===== ADD PERSON FUNCTIONALITY =====

function setupAddPersonButton() {
    const addPersonBtn = document.getElementById('add-person-btn');
    if (!addPersonBtn) {
        console.log('Add person button not found');
        return;
    }
    
    // Remove any existing listeners by cloning the button
    const newBtn = addPersonBtn.cloneNode(true);
    addPersonBtn.parentNode.replaceChild(newBtn, addPersonBtn);
    
    // Add single event listener with debouncing
    let isAdding = false;
    
    newBtn.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Prevent double-clicks
        if (isAdding) {
            console.log('Already adding person, ignoring click');
            return;
        }
        
        isAdding = true;
        console.log('Add person button clicked');
        
        addNewLocationInput();
        
        // Reset flag after 500ms
        setTimeout(() => {
            isAdding = false;
        }, 500);
    });
}

function addNewLocationInput() {
    const container = document.getElementById('parent-container');
    if (!container) {
        console.error('Locations container not found');
        return;
    }
    
    // Count existing inputs
    const existingInputs = document.querySelectorAll('.location-input');
    if (existingInputs.length >= 8) {
        showErrorNotification('Maximum 8 people allowed');
        return;
    }
    
    // Find the next available person ID
    const existingIds = Array.from(existingInputs).map(input => {
        const match = input.id.match(/location-(\d+)/);
        return match ? parseInt(match[1]) : 0;
    });
    
    const newPersonId = Math.max(...existingIds, 0) + 1;
    const inputId = `location-${newPersonId}`;
    
    // Check if this ID already exists (double-click protection)
    if (document.getElementById(inputId)) {
        console.log(`Input ${inputId} already exists, skipping`);
        return;
    }
    
    console.log(`Creating new input: ${inputId} (Person ${newPersonId})`);
    
    // Create new location container
    const locationElement = document.createElement('div');
    locationElement.className = 'location-container';
    locationElement.setAttribute('data-person-id', newPersonId);
    
    locationElement.innerHTML = `
        <div class="transport-icon transit" 
             data-person="${newPersonId}" 
             data-current-mode="TRANSIT"
             data-tooltip="Public Transport">
            <i class="fas fa-subway"></i>
        </div>
        <input type="text" 
               class="location-input" 
               id="${inputId}" 
               placeholder="Address ${newPersonId}" 
               autocomplete="off">
        ${newPersonId > 2 ? `
        <button class="remove-person-btn" title="Remove Person">
            <i class="fas fa-times"></i>
        </button>` : ''}
    `;
    
    // Insert before add button container
    const big_container = document.getElementById("locations-container");
    if (container) {
        big_container.insertBefore(locationElement, container);
    } else {
        big_container.appendChild(locationElement);
    }
    
    // Set up the new input
    const newInput = locationElement.querySelector('.location-input');
    setupSingleInputAutocomplete(newInput, newPersonId - 1);
    
    // Set up remove button if it exists
    const removeBtn = locationElement.querySelector('.remove-person-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            removeLocationInput(newPersonId);
        });
    }
    
    console.log(`✅ Successfully added location input for Person ${newPersonId}`);
}

async function setupSingleInputAutocomplete(input, colorIndex) {
    try {
        // Initialize transport mode
        window.userTransportModes.set(input.id, 'TRANSIT');
        
        // Wait for Places API if not ready
        if (!google.maps.places) {
            await google.maps.importLibrary("places");
        }
        
        const autocomplete = new google.maps.places.Autocomplete(input, {
            componentRestrictions: { country: "sg" },
            fields: ["geometry", "formatted_address", "name"],
            types: ["address"]
        });
        
        input.autocomplete = autocomplete;
        
        autocomplete.addListener('place_changed', function() {
            const place = autocomplete.getPlace();
            if (!place || !place.geometry) return;
            
            window.locationData.set(input.id, {
                place: place,
                position: place.geometry.location,
                transportMode: window.userTransportModes.get(input.id) || 'TRANSIT',
                address: place.formatted_address || place.name
            });
            
            const colors = ['#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#F97316', '#6366F1'];
            const color = colors[colorIndex % colors.length];
            
            addLocationMarker(place.geometry.location, input.id, color);
        });
        
        // Manual geocoding fallback
        input.addEventListener('input', () => {
            if (input.geocodeTimeout) clearTimeout(input.geocodeTimeout);
            
            const value = input.value.trim();
            if (value.length >= 3) {
                input.geocodeTimeout = setTimeout(() => {
                    if (!window.locationData.has(input.id)) {
                        geocodeManually(input, value);
                    }
                }, 2000);
            }
        });
        
    } catch (error) {
        console.error('Error setting up autocomplete for new input:', error);
    }
}

function removeLocationInput(personId) {
    const container = document.querySelector(`[data-person-id="${personId}"]`);
    if (!container) return;
    
    const inputId = `location-${personId}`;
    
    // Remove from data structures
    window.userTransportModes.delete(inputId);
    window.locationData.delete(inputId);
    
    // Remove marker
    if (window.locationMarkers && window.locationMarkers[inputId]) {
        window.locationMarkers[inputId].setMap(null);
        delete window.locationMarkers[inputId];
    }
    
    // Remove DOM element
    container.remove();
    
    // Recheck validation
    checkAllLocationsAndUpdateButton();
    
    console.log(`Removed location input for Person ${personId}`);
}

// ===== BOTTOM NAVIGATION =====

function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const currentPath = window.location.pathname;
    
    navItems.forEach(item => {
        // Get the page attribute first
        const page = item.getAttribute('data-page');
        
        // Set active state based on current path
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
                    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
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

function showCreateGroupModal(event) {
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

// ===== MAIN INITIALIZATION =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing MidWhereAh mobile interface...');
    
    // Set up navigation and UI
    setupBottomNavigation();
    setupUserInfo();
    
    // Set up core functionality
    setupTransportCycling();
    setupFindCentralButton();
    setupAddPersonButton();
    
    // Set up remove button delegation
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-person-btn') || e.target.closest('.remove-person-btn')) {
            const btn = e.target.classList.contains('remove-person-btn') ? e.target : e.target.closest('.remove-person-btn');
            const container = btn.closest('.location-container');
            const personId = parseInt(container.getAttribute('data-person-id'));
            
            if (personId > 2) { // Only allow removing person 3+
                removeLocationInput(personId);
            }
        }
    });
    
    console.log('✅ MidWhereAh mobile interface initialized');
});
const inputs = document.querySelectorAll('.location-input');
const findCentralBtn = document.getElementById("find-central-btn");

function updateFindCentralButtonVisibility() {
    const allFilled = Array.from(inputs).every(input => input.value.trim() !== '');
    findCentralBtn.style.display = allFilled ? 'flex' : 'none';
}

// Attach input listeners to each input
inputs.forEach(input => {
    input.addEventListener('input', updateFindCentralButtonVisibility);
});

// Run once on page load in case inputs are pre-filled
updateFindCentralButtonVisibility();

// Export for global access
window.initMap = initMap;
window.setupFindCentralButton = setupFindCentralButton;