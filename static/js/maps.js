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
    console.log('Initializing map...');
    // Default center on Singapore
    const singapore = { lat: 1.3521, lng: 103.8198 };
    
    // Check if map container exists
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
        console.error('Map container not found. Please check the HTML.');
        return;
    }
    
    // Create the map
    try {
        map = new google.maps.Map(mapContainer, {
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
    } catch (error) {
        console.error('Error initializing Google Maps:', error);
        // Don't retry - the callback approach should handle this properly
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
        // Handle both LatLng objects and plain objects
        if (typeof location.lat === 'function') {
            totalLat += location.lat();
            totalLng += location.lng();
        } else {
            totalLat += location.lat;
            totalLng += location.lng;
        }
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
            let photoHtml = '';
            if (venue.photos) {
                photoHtml = '<img src="' + venue.photos[0].getUrl({maxWidth: 200, maxHeight: 120}) + '" alt="' + venue.name + '">';
            }
            
            const content = '<div class="info-window">' +
                '<h5>' + venue.name + '</h5>' +
                '<p>' + (venue.vicinity || venue.formatted_address) + '</p>' +
                '<div class="rating">Rating: ' + venue.rating + ' ⭐ (' + (venue.user_ratings_total || 0) + ' reviews)</div>' +
                photoHtml +
                '</div>';
            
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
                        if (geocoder) {
                            geocoder.geocode({ location: pos }, function(results, status) {
                                if (status === 'OK' && results[0]) {
                                    const locationInput = document.getElementById('location-input');
                                    if (locationInput) {
                                        locationInput.value = results[0].formatted_address;
                                    }
                                }
                            });
                        }
                    },
                    function(error) {
                        console.error('Geolocation error:', error);
                        if (typeof showNotification === 'function') {
                            showNotification('Error getting your location. Please enter it manually.', 'danger');
                        }
                    }
                );
            } else {
                if (typeof showNotification === 'function') {
                    showNotification('Geolocation is not supported by your browser.', 'danger');
                }
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

// Search for venues around the midpoint
function searchVenues() {
    // Show loading state
    const loadingElement = document.getElementById('loading-venues');
    const noVenuesElement = document.getElementById('no-venues');
    const venuesListElement = document.getElementById('venues-list');
    
    if (loadingElement) loadingElement.classList.remove('d-none');
    if (noVenuesElement) noVenuesElement.classList.add('d-none');
    if (venuesListElement) venuesListElement.innerHTML = '';
    
    // Get filter values
    const venueType = document.getElementById('venue-type') ? document.getElementById('venue-type').value : 'restaurant';
    const radius = document.getElementById('radius') ? parseInt(document.getElementById('radius').value) : 1000;
    
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
    if (placesService) {
        placesService.nearbySearch(request, function(results, status) {
            // Hide loading state
            if (loadingElement) loadingElement.classList.add('d-none');
            
            if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
                // Update venue count
                const venueCountElement = document.getElementById('venue-count');
                if (venueCountElement) venueCountElement.textContent = results.length;
                
                // Display results
                displayVenueResults(results);
            } else {
                // Show no results message
                if (noVenuesElement) noVenuesElement.classList.remove('d-none');
                const venueCountElement = document.getElementById('venue-count');
                if (venueCountElement) venueCountElement.textContent = '0';
            }
        });
    }
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
        const ratingElement = venueItem.querySelector('.venue-rating');
        if (ratingElement) {
            ratingElement.textContent = venue.rating || 'N/A';
        }
        
        // Set price level if available
        const priceElement = venueItem.querySelector('.venue-price');
        if (priceElement) {
            if (venue.price_level) {
                priceElement.textContent = '$'.repeat(venue.price_level);
            } else {
                priceElement.textContent = 'N/A';
            }
        }
        
        // Set distance (approximate)
        const distanceElement = venueItem.querySelector('.venue-distance');
        if (distanceElement && midpoint) {
            const distance = calculateDistance(midpoint, venue.geometry.location);
            distanceElement.textContent = distance.toFixed(1) + ' km away';
        }
        
        // Set thumbnail if available
        const thumbnailElement = venueItem.querySelector('.venue-thumbnail');
        if (thumbnailElement) {
            if (venue.photos && venue.photos.length > 0) {
                thumbnailElement.src = venue.photos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
            } else {
                thumbnailElement.src = 'https://via.placeholder.com/80?text=No+Image';
            }
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
        const detailsBtn = venueItem.querySelector('.view-details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', function() {
                showVenueDetails(venue, marker);
            });
        }
        
        const addToVotingBtn = venueItem.querySelector('.btn-add-voting');
        if (addToVotingBtn) {
            addToVotingBtn.addEventListener('click', function() {
                addVenueToVoting(venue);
            });
        }
        
        // Add to list
        venuesList.appendChild(venueItem);
    });
}

// Calculate distance between two points in km (haversine formula)
function calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    
    let lat1, lng1, lat2, lng2;
    
    // Handle different point formats
    if (typeof point1.lat === 'function') {
        lat1 = point1.lat();
        lng1 = point1.lng();
    } else {
        lat1 = point1.lat;
        lng1 = point1.lng;
    }
    
    if (typeof point2.lat === 'function') {
        lat2 = point2.lat();
        lng2 = point2.lng();
    } else {
        lat2 = point2.lat;
        lng2 = point2.lng;
    }
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
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
    const venueNameElement = document.getElementById('venue-name');
    const venueAddressElement = document.getElementById('venue-address');
    const venueRatingElement = document.getElementById('venue-rating');
    const venuePriceElement = document.getElementById('venue-price');
    const venueImageElement = document.getElementById('venue-image');
    
    if (venueNameElement) venueNameElement.textContent = venue.name;
    if (venueAddressElement) venueAddressElement.textContent = venue.vicinity;
    
    // Set rating if available
    if (venueRatingElement) {
        venueRatingElement.textContent = venue.rating || 'N/A';
    }
    
    // Set price level if available
    if (venuePriceElement) {
        if (venue.price_level) {
            venuePriceElement.textContent = '$'.repeat(venue.price_level);
        } else {
            venuePriceElement.textContent = 'N/A';
        }
    }
    
    // Set image if available
    if (venueImageElement) {
        if (venue.photos && venue.photos.length > 0) {
            venueImageElement.src = venue.photos[0].getUrl({ maxWidth: 500, maxHeight: 300 });
        } else {
            venueImageElement.src = 'https://via.placeholder.com/500x300?text=No+Image';
        }
    }
    
    // Get additional details
    if (placesService) {
        placesService.getDetails({
            placeId: venue.place_id,
            fields: ['website', 'opening_hours', 'formatted_phone_number']
        }, function(place, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                // Set website if available
                const websiteElement = document.getElementById('venue-website');
                if (websiteElement) {
                    if (place.website) {
                        websiteElement.innerHTML = '<a href="' + place.website + '" target="_blank" class="text-decoration-none">Visit Website</a>';
                    } else {
                        websiteElement.innerHTML = 'Website not available';
                    }
                }
                
                // Set hours if available
                const hoursElement = document.getElementById('venue-hours');
                if (hoursElement) {
                    if (place.opening_hours) {
                        let hoursHtml = '<strong>Hours:</strong><br>';
                        place.opening_hours.weekday_text.forEach(function(day) {
                            hoursHtml += day + '<br>';
                        });
                        hoursElement.innerHTML = hoursHtml;
                    } else {
                        hoursElement.innerHTML = '<strong>Hours:</strong> Not available';
                    }
                }
            }
        });
    }
    
    // Initialize detail map
    const detailMapElement = document.getElementById('venue-detail-map');
    if (detailMapElement) {
        const detailMap = new google.maps.Map(detailMapElement, {
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
    }
    
    // Show modal
    if (typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Set up add to voting button
        const addToVotingBtn = document.getElementById('add-to-voting');
        if (addToVotingBtn) {
            addToVotingBtn.addEventListener('click', function() {
                addVenueToVoting(venue);
                bsModal.hide();
            });
        }
    }
}

// Add venue to voting list
function addVenueToVoting(venue) {
    // Get group ID from URL
    const path = window.location.pathname;
    const groupId = path.split('/').pop();
    
    // In a real app, this would save to Firestore
    console.log('Adding venue to voting:', venue.name, 'for group:', groupId);
    
    // Show notification
    if (typeof showNotification === 'function') {
        showNotification('Added ' + venue.name + ' to voting options', 'success');
    }
}

// Helper functions for geocoding
function geocodeAddress(address, successCallback, errorCallback) {
    if (!geocoder) {
        errorCallback('Geocoder not initialized');
        return;
    }
    
    geocoder.geocode({ address: address }, function(results, status) {
        if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            successCallback(
                location.lat(),
                location.lng(),
                results[0].formatted_address,
                results[0].place_id
            );
        } else {
            errorCallback('Geocoding failed: ' + status);
        }
    });
}

function reverseGeocode(lat, lng, callback) {
    if (!geocoder) {
        callback('Geocoder not available');
        return;
    }
    
    const latlng = { lat: lat, lng: lng };
    geocoder.geocode({ location: latlng }, function(results, status) {
        if (status === 'OK' && results[0]) {
            callback(results[0].formatted_address);
        } else {
            callback(lat + ', ' + lng);
        }
    });
}

// Initialize autocomplete for a specific input
function initLocationAutocomplete(input) {
    if (!input) return;
    
    const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'sg' },
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
        types: ['address']
    });
    
    return autocomplete;
}

// Initialize map when Google Maps API is loaded
window.initMap = initMap;