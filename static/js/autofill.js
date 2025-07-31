/**
 * MidWhereAh - Enhanced Stylized Autofill
 * Provides a beautiful, custom-styled autofill dropdown for location inputs
 * 
 * IMPORTANT: This script must be loaded AFTER location/MapManager.js to avoid conflicts
 */

class StylizedAutofill {
    constructor() {
        this.activeInput = null;
        this.autofillContainer = null;
        this.recentSearches = this.loadRecentSearches();
        
        // Wait for DOM and MapManager to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // Give MapManager a chance to initialize
            setTimeout(() => this.init(), 100);
        }
    }

    init() {
        // Create autofill container once
        this.createAutofillContainer();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✨ Stylized autofill initialized');
    }

    createAutofillContainer() {
        // Create the dropdown container if it doesn't exist
        if (!this.autofillContainer) {
            this.autofillContainer = document.createElement('div');
            this.autofillContainer.className = 'location-autofill';
            this.autofillContainer.style.display = 'none';
            document.body.appendChild(this.autofillContainer);
        }
    }

    setupEventListeners() {
        // Listen for focus on location inputs
        document.addEventListener('focusin', (e) => {
            if (e.target.classList.contains('location-input')) {
                this.handleInputFocus(e.target);
            }
        });

        // Listen for input on location inputs
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('location-input')) {
                this.handleInputChange(e.target);
            }
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('location-input') && 
                !e.target.closest('.location-autofill')) {
                this.hideAutofill();
            }
        });
    }

    handleInputFocus(input) {
        this.activeInput = input;
        
        // Position the dropdown below the input
        this.positionAutofillDropdown(input);
        
        // Show recent searches if available
        if (this.recentSearches.length > 0) {
            this.showRecentSearches();
        }
    }

    handleInputChange(input) {
        this.activeInput = input;
        const query = input.value.trim();
        
        if (query.length >= 2) {
            // Position and show the dropdown
            this.positionAutofillDropdown(input);
            
            // Get suggestions from Google Places API
            this.getPlaceSuggestions(query);
        } else if (query.length === 0) {
            // Show recent searches if available
            if (this.recentSearches.length > 0) {
                this.showRecentSearches();
            } else {
                this.hideAutofill();
            }
        } else {
            this.hideAutofill();
        }
    }

    positionAutofillDropdown(input) {
        const inputRect = input.getBoundingClientRect();
        const inputWithIcon = input.closest('.input-with-icon');
        const rect = inputWithIcon ? inputWithIcon.getBoundingClientRect() : inputRect;
        
        this.autofillContainer.style.top = `${rect.bottom + window.scrollY}px`;
        this.autofillContainer.style.left = `${rect.left + window.scrollX}px`;
        this.autofillContainer.style.width = `${rect.width}px`;
    }

    getPlaceSuggestions(query) {
        // Use Google Places API for suggestions
        if (window.google && window.google.maps && window.google.maps.places) {
            const service = new google.maps.places.AutocompleteService();
            
            service.getPlacePredictions({
                input: query,
                componentRestrictions: { country: 'sg' },
                types: ['address']
            }, (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                    this.renderSuggestions(predictions);
                } else {
                    console.log('No predictions found or error:', status);
                    this.hideAutofill();
                }
            });
        } else {
            console.error('Google Places API not available');
        }
    }

    renderSuggestions(predictions) {
        this.autofillContainer.innerHTML = '';
        
        predictions.forEach(prediction => {
            const item = document.createElement('div');
            item.className = 'autofill-item';
            
            // Split the description into main and secondary parts
            const parts = this.splitPredictionText(prediction.description);
            
            item.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <div class="autofill-content">
                    <div class="autofill-main">${parts.main}</div>
                    <div class="autofill-secondary">${parts.secondary}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectSuggestion(prediction);
            });
            
            this.autofillContainer.appendChild(item);
        });
        
        this.showAutofill();
    }

    splitPredictionText(text) {
        // Split the text at the first comma or after the first 20 characters
        const commaIndex = text.indexOf(',');
        
        if (commaIndex > 0 && commaIndex < 30) {
            return {
                main: text.substring(0, commaIndex),
                secondary: text.substring(commaIndex + 1).trim()
            };
        } else {
            // If no comma or comma is too far, split at a reasonable length
            const cutPoint = Math.min(30, text.length);
            return {
                main: text.substring(0, cutPoint),
                secondary: text.substring(cutPoint).trim()
            };
        }
    }

    showRecentSearches() {
        this.autofillContainer.innerHTML = '';
        
        // Add a header for recent searches
        const header = document.createElement('div');
        header.className = 'autofill-header';
        header.textContent = 'Recent Searches';
        this.autofillContainer.appendChild(header);
        
        this.recentSearches.forEach(search => {
            const item = document.createElement('div');
            item.className = 'autofill-item';
            
            item.innerHTML = `
                <i class="fas fa-history"></i>
                <div class="autofill-content">
                    <div class="autofill-main">${search.main}</div>
                    <div class="autofill-secondary">${search.secondary}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                if (this.activeInput) {
                    this.activeInput.value = search.main + (search.secondary ? ', ' + search.secondary : '');
                    this.triggerPlaceSelection(search.placeId);
                }
                this.hideAutofill();
            });
            
            this.autofillContainer.appendChild(item);
        });
        
        this.showAutofill();
    }

    selectSuggestion(prediction) {
        if (this.activeInput) {
            this.activeInput.value = prediction.description;
            
            // Save to recent searches
            this.addToRecentSearches({
                main: this.splitPredictionText(prediction.description).main,
                secondary: this.splitPredictionText(prediction.description).secondary,
                placeId: prediction.place_id
            });
            
            // Trigger place selection in Google Maps
            this.triggerPlaceSelection(prediction.place_id);
        }
        
        this.hideAutofill();
    }

    triggerPlaceSelection(placeId) {
        if (!window.google || !window.google.maps || !window.google.maps.places) {
            console.error('Google Places API not available');
            return;
        }
        
        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
        
        placesService.getDetails({
            placeId: placeId,
            fields: ['geometry', 'formatted_address', 'name']
        }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                // Store location data
                if (this.activeInput && this.activeInput.id) {
                    window.locationData.set(this.activeInput.id, {
                        place: place,
                        position: place.geometry.location,
                        transportMode: window.userTransportModes.get(this.activeInput.id) || 'TRANSIT',
                        address: place.formatted_address || place.name
                    });
                    
                    // Get person color for marker
                    const container = this.activeInput.closest('.location-container');
                    const personId = container?.getAttribute('data-person-id');
                    const personColor = personId ? this.getColorForPerson(personId) : '#8B5DB8';
                    
                    // Add marker to map
                    addLocationMarker(place.geometry.location, this.activeInput.id, personColor);
                    
                    // Check if we should show the find central button
                    if (window.hybridLocationManager) {
                        window.hybridLocationManager.debouncedLocationCheck();
                    }
                }
            } else {
                console.error('Error getting place details:', status);
            }
        });
    }

    getColorForPerson(personId) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#FF9F68', '#83D0CB', '#2A9D8F'
        ];
        
        return colors[(parseInt(personId) - 1) % colors.length];
    }

    addToRecentSearches(search) {
        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(item => 
            item.placeId !== search.placeId
        );
        
        // Add to beginning
        this.recentSearches.unshift(search);
        
        // Keep only last 5
        if (this.recentSearches.length > 5) {
            this.recentSearches.pop();
        }
        
        // Save to localStorage
        this.saveRecentSearches();
    }

    loadRecentSearches() {
        try {
            const saved = localStorage.getItem('midWhereAh_recentSearches');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error loading recent searches:', e);
            return [];
        }
    }

    saveRecentSearches() {
        try {
            localStorage.setItem('midWhereAh_recentSearches', JSON.stringify(this.recentSearches));
        } catch (e) {
            console.error('Error saving recent searches:', e);
        }
    }

    showAutofill() {
        this.autofillContainer.style.display = 'block';
    }

    hideAutofill() {
        this.autofillContainer.style.display = 'none';
    }
}

// Initialize the stylized autofill when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.stylizedAutofill = new StylizedAutofill();
});
