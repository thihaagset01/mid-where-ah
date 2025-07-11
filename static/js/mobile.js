// Mobile-first JavaScript functionality for MidWhereAh

// Initialize map with Singapore as default center
async function initMap() {
    console.log('initMap called');
    
    // Singapore coordinates
    const singapore = { lat: 1.3521, lng: 103.8198 };
    
    try {
        // Check if map container exists
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found!");
            return;
        }
        
        console.log('Map container found:', mapContainer);
        console.log('Map container dimensions:', mapContainer.offsetWidth, mapContainer.offsetHeight);
        
        // Force the map container to have dimensions if they're missing
        if (mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
            console.log('Fixing map container dimensions');
            mapContainer.style.width = '100vw';
            mapContainer.style.height = '100vh';
        }
        
        // Dynamically load the Maps JavaScript API using the new importLibrary approach
        const { Map } = await google.maps.importLibrary("maps");
        const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");
        
        // Store the PlaceAutocompleteElement constructor for later use
        window.PlaceAutocompleteElement = PlaceAutocompleteElement;
        
        // Create map centered on Singapore
        const map = new Map(mapContainer, {
            center: singapore,
            zoom: 12,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.RIGHT_BOTTOM
            }
        });
        
        // Store map in window object for access in other functions
        window.midwhereahMap = map;
        
        // Force a resize event to ensure the map renders correctly
        window.dispatchEvent(new Event('resize'));
        
        // Initialize location autocomplete
        await initLocationAutocomplete();
        
        // Initialize other map-related functionality
        setupMapMarkers();
        
        console.log("Google Maps initialized successfully");
    } catch (error) {
        console.error("Error initializing Google Maps:", error);
    }
}

// Initialize Google Places Autocomplete for location inputs
async function initLocationAutocomplete() {
    const locationInputs = document.querySelectorAll('.location-input');
    
    try {
        // Check if PlaceAutocompleteElement is available (new API)
        if (window.PlaceAutocompleteElement) {
            console.log('Using PlaceAutocompleteElement API');
            await initWithPlaceAutocompleteElement(locationInputs);
        } else {
            // If not available, load it
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

// Initialize with the new PlaceAutocompleteElement API
async function initWithPlaceAutocompleteElement(locationInputs) {
    try {
        locationInputs.forEach(input => {
            // Create a wrapper div to hold the PlaceAutocompleteElement
            const wrapper = document.createElement('div');
            wrapper.className = 'place-autocomplete-wrapper';
            
            // Replace the input with the wrapper
            const parent = input.parentNode;
            parent.insertBefore(wrapper, input);
            parent.removeChild(input);
            
            // Create the PlaceAutocompleteElement
            const autocompleteElement = new window.PlaceAutocompleteElement({
                inputElement: input,
                componentRestrictions: { country: "sg" },
                fields: ["address_components", "geometry", "name"],
                types: ["address"]
            });
            
            // Add the input back to the wrapper
            wrapper.appendChild(input);
            
            // Store the autocomplete instance on the input element
            input.autocompleteElement = autocompleteElement;
            
            // Add listener for place selection
            autocompleteElement.addListener('place_changed', function() {
                const place = autocompleteElement.getPlace();
                if (!place.geometry) {
                    // User entered the name of a place that was not suggested
                    window.alert("No details available for: '" + place.name + "'");
                    return;
                }
                
                // Add marker for this location
                addLocationMarker(place.geometry.location, input.id);
                
                // If we have at least two locations, calculate midpoint
                calculateMidpointIfPossible();
            });
        });
    } catch (error) {
        console.error('Error initializing PlaceAutocompleteElement:', error);
    }
}

// Initialize with the legacy Autocomplete API (fallback)
function initWithLegacyAutocomplete(locationInputs) {
    try {
        locationInputs.forEach(input => {
            const autocomplete = new window.Autocomplete(input, {
                componentRestrictions: { country: "sg" },
                fields: ["address_components", "geometry", "name"],
                types: ["address"]
            });
            
            // Store the autocomplete instance on the input element
            input.autocomplete = autocomplete;
            
            // Add listener for place selection
            autocomplete.addListener('place_changed', function() {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    // User entered the name of a place that was not suggested
                    window.alert("No details available for: '" + place.name + "'");
                    return;
                }
                
                // Add marker for this location
                addLocationMarker(place.geometry.location, input.id);
                
                // If we have at least two locations, calculate midpoint
                calculateMidpointIfPossible();
            });
        });
    } catch (error) {
        console.error('Error initializing legacy Autocomplete:', error);
    }
}

// Setup map markers and related functionality
function setupMapMarkers() {
    // Store markers in a global object
    window.locationMarkers = {};
    window.midpointMarker = null;
}

// Add a marker for a selected location
function addLocationMarker(location, inputId) {
    // Remove existing marker for this input if it exists
    if (window.locationMarkers[inputId]) {
        window.locationMarkers[inputId].setMap(null);
    }
    
    // Create a new marker
    const marker = new google.maps.Marker({
        position: location,
        map: window.midwhereahMap,
        title: document.getElementById(inputId).value,
        animation: google.maps.Animation.DROP
    });
    
    // Store the marker
    window.locationMarkers[inputId] = marker;
    
    // Pan to this location
    window.midwhereahMap.panTo(location);
}

// Calculate midpoint if we have at least two locations
function calculateMidpointIfPossible() {
    const markers = Object.values(window.locationMarkers);
    
    if (markers.length >= 2) {
        // Get all locations
        const locations = markers.map(marker => marker.getPosition());
        
        // Calculate midpoint
        const midpoint = calculateMidpoint(locations);
        
        // Add or update midpoint marker
        if (window.midpointMarker) {
            window.midpointMarker.setPosition(midpoint);
        } else {
            window.midpointMarker = new google.maps.Marker({
                position: midpoint,
                map: window.midwhereahMap,
                title: "Midpoint",
                icon: {
                    url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png"
                },
                animation: google.maps.Animation.DROP
            });
        }
        
        // Pan to midpoint
        window.midwhereahMap.panTo(midpoint);
        
        // Adjust zoom to fit all markers
        fitMapToMarkers([...markers, window.midpointMarker]);
    }
}

// Calculate the midpoint of multiple locations
function calculateMidpoint(locations) {
    let totalLat = 0;
    let totalLng = 0;
    
    // Sum up all latitudes and longitudes
    locations.forEach(location => {
        totalLat += location.lat();
        totalLng += location.lng();
    });
    
    // Calculate average
    const avgLat = totalLat / locations.length;
    const avgLng = totalLng / locations.length;
    
    return new google.maps.LatLng(avgLat, avgLng);
}

// Fit map to show all markers
function fitMapToMarkers(markers) {
    const bounds = new google.maps.LatLngBounds();
    
    markers.forEach(marker => {
        bounds.extend(marker.getPosition());
    });
    
    window.midwhereahMap.fitBounds(bounds);
    
    // Don't zoom in too far
    if (window.midwhereahMap.getZoom() > 15) {
        window.midwhereahMap.setZoom(15);
    }
}

// Mobile menu functionality
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const slideMenu = document.getElementById('slide-menu');
    const menuOverlay = document.getElementById('menu-overlay');
    const menuClose = document.getElementById('menu-close');
    
    function openMenu() {
        slideMenu.classList.add('open');
        menuOverlay.classList.add('active');
    }
    
    function closeMenu() {
        slideMenu.classList.remove('open');
        menuOverlay.classList.remove('active');
    }
    
    menuToggle?.addEventListener('click', openMenu);
    menuClose?.addEventListener('click', closeMenu);
    menuOverlay?.addEventListener('click', closeMenu);
    
    // Handle logout
    const logoutBtn = document.getElementById('logout-menu');
    logoutBtn?.addEventListener('click', function(e) {
        e.preventDefault();
        if (firebase.auth) {
            firebase.auth().signOut().then(() => {
                window.location.href = '/login';
            }).catch((error) => {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            });
        }
    });
}

// Add dynamic location inputs
function setupLocationInputs() {
    const addLocationBtn = document.getElementById('add-location');
    const locationsContainer = document.querySelector('.locations-container');
    let locationCount = 2; // We already have 2 inputs in the HTML
    
    // Initialize autocomplete for existing inputs
    const existingInputs = document.querySelectorAll('.location-input');
    existingInputs.forEach(input => {
        initializeAutocompleteForInput(input);
    });
    
    // Add new location input when button is clicked
    addLocationBtn?.addEventListener('click', function() {
        locationCount++;
        const newItem = document.createElement('div');
        newItem.className = 'location-item';
        newItem.innerHTML = `
            <div class="location-icon purple">
                <i class="fas fa-circle"></i>
            </div>
            <input type="text" id="location-${locationCount}" class="location-input" placeholder="Address ${locationCount}">
            <button class="user-btn">
                <i class="fas fa-user-plus"></i>
            </button>
        `;
        
        // Insert before the add location button
        locationsContainer.insertBefore(newItem, addLocationBtn.parentNode);
        
        // Initialize autocomplete for new input
        const newInput = newItem.querySelector('.location-input');
        initializeAutocompleteForInput(newInput);
    });
    
    // Helper function to initialize autocomplete for an input
    function initializeAutocompleteForInput(input) {
        try {
            // Check if google.maps.places is available
            if (google.maps.places && google.maps.places.Autocomplete) {
                const autocomplete = new google.maps.places.Autocomplete(input, {
                    componentRestrictions: { country: "sg" },
                    fields: ["address_components", "geometry", "name"],
                    types: ["address"]
                });
                
                // Store the autocomplete instance on the input element
                input.autocomplete = autocomplete;
                
                // Add listener for place selection
                autocomplete.addListener('place_changed', function() {
                    const place = autocomplete.getPlace();
                    if (!place.geometry) {
                        console.warn("No details available for: '" + place.name + "'");
                        return;
                    }
                    
                    // Add marker for this location
                    addLocationMarker(place.geometry.location, input.id);
                    
                    // Calculate midpoint if possible
                    calculateMidpointIfPossible();
                });
            } else {
                console.warn('Google Maps Places API not available yet. Will retry initialization later.');
                // Try again after a short delay
                setTimeout(() => {
                    if (google.maps.places && google.maps.places.Autocomplete) {
                        initializeAutocompleteForInput(input);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Error initializing autocomplete:', error);
        }
    }
}

// Bottom navigation functionality
function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Handle navigation based on data-page attribute
            const page = this.getAttribute('data-page');
            
            switch(page) {
                case 'home':
                    // Already on home
                    break;
                case 'groups':
                    window.location.href = '/dashboard';
                    break;
                case 'profile':
                    // Handle profile navigation
                    break;
                case 'compass':
                    // Handle explore navigation
                    break;
                case 'create':
                    // Handle create group action
                    showCreateGroupModal();
                    break;
            }
        });
    });
}

// Show create group modal (placeholder)
function showCreateGroupModal() {
    alert('Create new group feature coming soon!');
}

// Initialize user info in menu if logged in
function setupUserInfo() {
    // Check if user is logged in
    if (firebase.auth) {
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                // User is signed in
                const userAvatar = document.querySelector('.user-avatar');
                const userName = document.querySelector('.user-details h3');
                
                if (user.displayName) {
                    userName.textContent = user.displayName;
                    
                    // Set initials in avatar
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

// Setup venue card functionality
function setupVenueCard() {
    const venueCard = document.getElementById('venue-card');
    if (!venueCard) return;
    
    // Show venue card when a location is selected
    const locationInputs = document.querySelectorAll('.location-input');
    locationInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.value.trim() !== '') {
                setTimeout(() => {
                    venueCard.classList.add('active');
                }, 1000); // Show after 1 second to simulate API call
            }
        });
    });
    
    // Handle venue action buttons
    const addToVotingBtn = venueCard.querySelector('.venue-action-btn.primary');
    const detailsBtn = venueCard.querySelector('.venue-action-btn.secondary');
    
    if (addToVotingBtn) {
        addToVotingBtn.addEventListener('click', function() {
            alert('Venue added to voting!');
            venueCard.classList.remove('active');
        });
    }
    
    if (detailsBtn) {
        detailsBtn.addEventListener('click', function() {
            alert('Showing venue details...');
            // Here you would navigate to the venue details page
        });
    }
}

// Call setup functions when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    setupMobileMenu();
    setupLocationInputs();
    setupBottomNavigation();
    setupUserInfo();
    setupVenueCard();
});
