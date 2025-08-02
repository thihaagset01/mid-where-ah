/**
 * VenueMapFeatures.js - Venue-related map functionality
 * SINGLE instance to prevent duplicates
 */

class VenueMapFeatures {
    constructor() {
        // Prevent multiple instances
        if (window.venueMapFeatures) {
            return window.venueMapFeatures;
        }
        
        this.map = null;
        this.placesService = null;
        this.directionsService = null;
        this.directionsRenderer = null;
        this.currentVenues = [];
        this.venueMarkers = [];
        this.initialized = false;
        
        window.venueMapFeatures = this;
        this.waitForMap();
    }

    waitForMap() {
        // Listen for map ready event ONCE
        if (!this.mapListener) {
            this.mapListener = document.addEventListener('mapReady', this.onMapReady.bind(this));
        }
    }

    onMapReady(event) {
        // Prevent multiple initializations
        if (this.initialized) {
            return;
        }
        
        this.map = event.detail.map;
        this.initializeServices();
        
        // Initialize based on current page
        const currentPage = window.location.pathname;
        if (currentPage === '/app' || currentPage.includes('home')) {
            this.initializeHomeFeatures();
        } else if (currentPage.includes('venues')) {
            this.initializeVenueListFeatures();
        }
        
        this.initialized = true;
    }

    initializeServices() {
        if (!this.map) return;
        
        try {
            // Use modern Places API if available, fallback to legacy
            if (google.maps.places.Place) {
                // Modern Places API
                this.placesService = new google.maps.places.PlacesService(this.map);
            } else {
                // Legacy fallback
                this.placesService = new google.maps.places.PlacesService(this.map);
            }
            
            this.directionsService = new google.maps.DirectionsService();
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                draggable: false,
                suppressMarkers: true
            });
            this.directionsRenderer.setMap(this.map);
        } catch (error) {
            console.warn('Some Places services not available:', error);
        }
    }

    initializeHomeFeatures() {
        // Set up venue search functionality for home page
        this.setupVenueSearch();
    }

    initializeVenueListFeatures() {
        // Set up features specific to venue listing pages
        this.setupVenueListHandlers();
    }

    setupVenueSearch() {
        // Implement venue search functionality
        const searchButton = document.getElementById('find-central-btn');
        if (searchButton) {
            searchButton.addEventListener('click', this.handleVenueSearch.bind(this));
        }
    }

    setupVenueListHandlers() {
        // Set up handlers for venue list interactions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('venue-item')) {
                this.handleVenueSelection(e.target);
            }
        });
    }

    handleVenueSearch() {
        // Implement venue search logic
        console.log('Venue search triggered');
    }

    handleVenueSelection(venueElement) {
        // Handle venue selection from list
        console.log('Venue selected:', venueElement);
    }

    clearVenueMarkers() {
        this.venueMarkers.forEach(marker => marker.setMap(null));
        this.venueMarkers = [];
    }

    addVenueMarker(venue) {
        if (!this.map || !venue.geometry) return null;

        const marker = new google.maps.Marker({
            position: venue.geometry.location,
            map: this.map,
            title: venue.name,
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(32, 32)
            }
        });

        this.venueMarkers.push(marker);
        return marker;
    }
}

// SINGLE initialization when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (!window.venueMapFeatures) {
        new VenueMapFeatures();
    }
});