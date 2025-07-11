// Google Maps Integration for MidWhereAh

// Global variables
let map;
let markers = [];
let placesService;
let geocoder;
let directionsService;
let directionsRenderer;
let autocomplete;
let midpoint = null;
let venueMarkers = [];
let infoWindow = null;

// Initialize the map when the page loads
function initMap() {
    // Default center on Singapore
    const singapore = { lat: 1.3521, lng: 103.8198 };
    
    // Create the map
    map = new google.maps.Map(document.getElementById("map"), {
        center: singapore,
        zoom: 12,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });
    
    // Initialize services
    placesService = new google.maps.places.PlacesService(map);
    geocoder = new google.maps.Geocoder();
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: "#4285F4",
            strokeWeight: 5,
            strokeOpacity: 0.7
        }
    });
    
    // Set up directions renderer
    directionsRenderer.setMap(map);
    
    // Initialize location autocomplete if input exists
    initializeAutocomplete();
    
    // Check if we're on a specific page and call appropriate initialization
    const path = window.location.pathname;
    
    if (path.startsWith('/group/')) {
        initializeGroupMap();
    } else if (path.startsWith('/venues/')) {
        initializeVenuesMap();
    }
}

// Calculate the midpoint between multiple locations
function calculateMidpoint(locations) {
    if (!locations || locations.length === 0) {
        return null;
    }
    
    if (locations.length === 1) {
        return locations[0];
    }
    
    let totalLat = 0;
    let totalLng = 0;
    
    // Sum all latitudes and longitudes
    locations.forEach(location => {
        totalLat += location.lat;
        totalLng += location.lng;
    });
    
    // Calculate average
    const midpointLocation = {
        lat: totalLat / locations.length,
        lng: totalLng / locations.length
    };
    
    return midpointLocation;
}

// Search for venues near the midpoint
function searchNearbyVenues(location, radius = 1500, type = 'restaurant', callback) {
    if (!placesService) {
        console.error('Places service not initialized');
        return;
    }
    
    const request = {
        location: location,
        radius: radius,
        type: type,
        rankBy: google.maps.places.RankBy.PROMINENCE,
        openNow: true
    };
    
    placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Filter results by rating (4.0+)
            const filteredResults = results.filter(place => place.rating >= 4.0);
            callback(filteredResults);
        } else {
            console.error('Places search failed:', status);
            callback([]);
        }
    });
}

// Get detailed information about a place
function getPlaceDetails(placeId, callback) {
    if (!placesService) {
        console.error('Places service not initialized');
        return;
    }
    
    const request = {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'geometry', 'rating', 'photos', 'price_level', 'website', 'opening_hours', 'types', 'user_ratings_total']
    };
    
    placesService.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            callback(place);
        } else {
            console.error('Place details request failed:', status);
            callback(null);
        }
    });
}

// Display venues on the map
function displayVenuesOnMap(venues) {
    // Clear existing venue markers
    clearVenueMarkers();
    
    // Create info window if it doesn't exist
    if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow();
    }
    
    // Add markers for each venue
    venues.forEach((venue, index) => {
        const marker = new google.maps.Marker({
            position: venue.geometry.location,
            map: map,
            title: venue.name,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
            },
            animation: google.maps.Animation.DROP,
            zIndex: 100 - index
        });
        
        // Add click listener to show info window
        marker.addListener('click', () => {
            const content = `
                <div class="info-window">
                    <h5>${venue.name}</h5>
                    <p>${venue.vicinity || venue.formatted_address}</p>
                    <div class="rating">
                        Rating: ${venue.rating} ⭐ (${venue.user_ratings_total || 0} reviews)
                    </div>
                    ${venue.photos ? `<img src="${venue.photos[0].getUrl({maxWidth: 200, maxHeight: 120})}" alt="${venue.name}">` : ''}
                </div>
            `;
            
            infoWindow.setContent(content);
            infoWindow.open(map, marker);
        });
        
        venueMarkers.push(marker);
    });
    
    // Adjust map bounds to fit all markers
    if (venueMarkers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        
        // Add midpoint to bounds
        if (midpoint) {
            bounds.extend(midpoint);
        }
        
        // Add all venue markers to bounds
        venueMarkers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });
        
        map.fitBounds(bounds);
        
        // Don't zoom in too far
        const listener = google.maps.event.addListener(map, 'idle', () => {
            if (map.getZoom() > 15) {
                map.setZoom(15);
            }
            google.maps.event.removeListener(listener);
        });
    }
}

// Clear venue markers from the map
function clearVenueMarkers() {
    venueMarkers.forEach(marker => marker.setMap(null));
    venueMarkers = [];
}

// Initialize Google Places Autocomplete
function initializeAutocomplete() {
    const locationInput = document.getElementById('location-input');
    if (!locationInput) return;
    
    // Restrict to Singapore
    const options = {
        componentRestrictions: { country: 'sg' },
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
    };
    
    autocomplete = new google.maps.places.Autocomplete(locationInput, options);
    
    // Prevent form submission on enter key in autocomplete
    locationInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });
    
    // Set up event listener for place selection
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;
        
        // Update map
        map.setCenter(place.geometry.location);
        map.setZoom(15);
        
        // Add marker for selected location
        addMarker({
            position: place.geometry.location,
            title: place.name || place.formatted_address,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
        });
    });
}

// Initialize map for group page
function initializeGroupMap() {
    // Set up current location detection
    const useCurrentLocationBtn = document.getElementById('use-current-location');
    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        
                        // Update map
                        map.setCenter(pos);
                        map.setZoom(15);
                        
                        // Add marker for current location
                        addMarker({
                            position: pos,
                            title: 'Your Location',
                            icon: {
                                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                            }
                        });
                        
                        // Reverse geocode to get address
                        geocoder.geocode({ location: pos }, function(results, status) {
                            if (status === 'OK' && results[0]) {
                                document.getElementById('location-input').value = results[0].formatted_address;
                            }
                        });
                    },
                    function(error) {
                        console.error('Geolocation error:', error);
                        showNotification('Error getting your location. Please enter it manually.', 'danger');
                    }
                );
            } else {
                showNotification('Geolocation is not supported by your browser.', 'danger');
            }
        });
    }
}

// Initialize map for venues page
function initializeVenuesMap() {
    // Set up filter form
    const filtersForm = document.getElementById('filters-form');
    if (filtersForm) {
        filtersForm.addEventListener('submit', function(e) {
            e.preventDefault();
            searchVenues();
        });
    }
}

// Add a marker to the map
function addMarker(markerOptions) {
    // Remove existing marker with same title if exists
    removeMarkerByTitle(markerOptions.title);
    
    // Create and add the new marker
    const marker = new google.maps.Marker({
        map: map,
        animation: google.maps.Animation.DROP,
        ...markerOptions
    });
    
    // Add to markers array
    markers.push(marker);
    
    // Return the marker
    return marker;
}

// Remove a marker by title
function removeMarkerByTitle(title) {
    for (let i = 0; i < markers.length; i++) {
        if (markers[i].getTitle() === title) {
            markers[i].setMap(null);
            markers.splice(i, 1);
            break;
        }
    }
}

// Clear all markers from the map
function clearMarkers() {
    for (let marker of markers) {
        marker.setMap(null);
    }
    markers = [];
}

// Calculate midpoint between multiple locations
function calculateMidpoint(locations) {
    if (!locations || locations.length === 0) {
        return null;
    }
    
    // If only one location, return it
    if (locations.length === 1) {
        return locations[0];
    }
    
    // Calculate average of lat/lng
    let totalLat = 0;
    let totalLng = 0;
    
    for (let location of locations) {
        totalLat += location.lat;
        totalLng += location.lng;
    }
    
    return {
        lat: totalLat / locations.length,
        lng: totalLng / locations.length
    };
}

// Search for venues around the midpoint
function searchVenues() {
    // Show loading state
    document.getElementById('loading-venues')?.classList.remove('d-none');
    document.getElementById('no-venues')?.classList.add('d-none');
    if (document.getElementById('venues-list')) {
        document.getElementById('venues-list').innerHTML = '';
    }
    
    // Get filter values
    const venueType = document.getElementById('venue-type')?.value || 'restaurant';
    const radius = parseInt(document.getElementById('radius')?.value || 1000);
    
    // Use midpoint or map center
    const searchLocation = midpoint || map.getCenter();
    
    // Create request
    const request = {
        location: searchLocation,
        radius: radius,
        type: venueType
    };
    
    // Clear existing markers except for user locations
    clearVenueMarkers();
    
    // Add midpoint marker
    addMarker({
        position: searchLocation,
        title: 'Midpoint',
        icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }
    });
    
    // Perform search
    placesService.nearbySearch(request, function(results, status) {
        // Hide loading state
        document.getElementById('loading-venues')?.classList.add('d-none');
        
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
            // Update venue count
            document.getElementById('venue-count').textContent = results.length;
            
            // Display results
            displayVenueResults(results);
        } else {
            // Show no results message
            document.getElementById('no-venues')?.classList.remove('d-none');
            document.getElementById('venue-count').textContent = '0';
        }
    });
}

// Display venue search results
function displayVenueResults(venues) {
    const venuesList = document.getElementById('venues-list');
    if (!venuesList) return;
    
    // Get venue item template
    const template = document.getElementById('venue-item-template');
    if (!template) return;
    
    // Clear existing list
    venuesList.innerHTML = '';
    
    // Add each venue to the list
    venues.forEach(function(venue, index) {
        // Clone template
        const venueItem = document.importNode(template.content, true);
        
        // Set venue data
        venueItem.querySelector('.venue-name').textContent = venue.name;
        venueItem.querySelector('.venue-address').textContent = venue.vicinity;
        
        // Set rating if available
        if (venue.rating) {
            venueItem.querySelector('.venue-rating').textContent = venue.rating;
        } else {
            venueItem.querySelector('.venue-rating').textContent = 'N/A';
        }
        
        // Set price level if available
        const priceElement = venueItem.querySelector('.venue-price');
        if (venue.price_level) {
            priceElement.textContent = '$'.repeat(venue.price_level);
        } else {
            priceElement.textContent = 'N/A';
        }
        
        // Set distance (approximate)
        const distance = calculateDistance(midpoint, venue.geometry.location);
        venueItem.querySelector('.venue-distance').textContent = `${distance.toFixed(1)} km away`;
        
        // Set thumbnail if available
        const thumbnailElement = venueItem.querySelector('.venue-thumbnail');
        if (venue.photos && venue.photos.length > 0) {
            thumbnailElement.src = venue.photos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
        } else {
            thumbnailElement.src = 'https://via.placeholder.com/80?text=No+Image';
        }
        
        // Add marker for venue
        const marker = addMarker({
            position: venue.geometry.location,
            title: venue.name,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
            }
        });
        
        // Set up event listeners
        venueItem.querySelector('.view-details-btn').addEventListener('click', function() {
            showVenueDetails(venue, marker);
        });
        
        venueItem.querySelector('.add-to-voting-btn').addEventListener('click', function() {
            addVenueToVoting(venue);
        });
        
        // Add to list
        venuesList.appendChild(venueItem);
    });
}

// Clear only venue markers (keep user location markers)
function clearVenueMarkers() {
    for (let i = markers.length - 1; i >= 0; i--) {
        const icon = markers[i].getIcon();
        if (icon && (icon.url === 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' || 
                    icon.url === 'https://maps.google.com/mapfiles/ms/icons/green-dot.png')) {
            markers[i].setMap(null);
            markers.splice(i, 1);
        }
    }
}

// Calculate distance between two points in km (haversine formula)
function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat() - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng() - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat() * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Show venue details in modal
function showVenueDetails(venue, marker) {
    // Get modal elements
    const modal = document.getElementById('venueDetailsModal');
    if (!modal) return;
    
    // Set venue data in modal
    document.getElementById('venue-name').textContent = venue.name;
    document.getElementById('venue-address').textContent = venue.vicinity;
    
    // Set rating if available
    if (venue.rating) {
        document.getElementById('venue-rating').textContent = venue.rating;
    } else {
        document.getElementById('venue-rating').textContent = 'N/A';
    }
    
    // Set price level if available
    const priceElement = document.getElementById('venue-price');
    if (venue.price_level) {
        priceElement.textContent = '$'.repeat(venue.price_level);
    } else {
        priceElement.textContent = 'N/A';
    }
    
    // Set image if available
    const imageElement = document.getElementById('venue-image');
    if (venue.photos && venue.photos.length > 0) {
        imageElement.src = venue.photos[0].getUrl({ maxWidth: 500, maxHeight: 300 });
    } else {
        imageElement.src = 'https://via.placeholder.com/500x300?text=No+Image';
    }
    
    // Get additional details
    placesService.getDetails({
        placeId: venue.place_id,
        fields: ['website', 'opening_hours', 'formatted_phone_number']
    }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            // Set website if available
            const websiteElement = document.getElementById('venue-website');
            if (place.website) {
                websiteElement.innerHTML = `<a href="${place.website}" target="_blank" class="text-decoration-none">Visit Website</a>`;
            } else {
                websiteElement.innerHTML = 'Website not available';
            }
            
            // Set hours if available
            const hoursElement = document.getElementById('venue-hours');
            if (place.opening_hours) {
                let hoursHtml = '<strong>Hours:</strong><br>';
                place.opening_hours.weekday_text.forEach(function(day) {
                    hoursHtml += `${day}<br>`;
                });
                hoursElement.innerHTML = hoursHtml;
            } else {
                hoursElement.innerHTML = '<strong>Hours:</strong> Not available';
            }
        }
    });
    
    // Initialize detail map
    const detailMap = new google.maps.Map(document.getElementById('venue-detail-map'), {
        center: venue.geometry.location,
        zoom: 16,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false
    });
    
    // Add marker to detail map
    new google.maps.Marker({
        map: detailMap,
        position: venue.geometry.location,
        title: venue.name
    });
    
    // Show modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Set up add to voting button
    document.getElementById('add-to-voting').addEventListener('click', function() {
        addVenueToVoting(venue);
        bsModal.hide();
    });
}

// Add venue to voting list
function addVenueToVoting(venue) {
    // Get group ID from URL
    const path = window.location.pathname;
    const groupId = path.split('/').pop();
    
    // In a real app, this would save to Firestore
    console.log('Adding venue to voting:', venue.name, 'for group:', groupId);
    
    // Show notification
    showNotification(`Added ${venue.name} to voting options`, 'success');
}

// Initialize map when Google Maps API is loaded
window.initMap = initMap;
