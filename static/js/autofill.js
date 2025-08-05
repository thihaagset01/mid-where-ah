/**
 * MidWhereAh - Enhanced Stylized Autofill
 * Provides a beautiful, custom-styled autofill dropdown for location inputs
 * Now with full-screen mobile support
 * 
 * IMPORTANT: This script must be loaded AFTER location/MapManager.js to avoid conflicts
 */

class StylizedAutofill {
    constructor() {
        this.activeInput = null;
        this.autofillContainer = null;
        this.fullscreenContainer = null;
        this.searchInput = null;
        this.closeButton = null;
        this.recentSearches = this.loadRecentSearches();
        this.currentRequest = null;
        this.isProcessing = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }

    init() {
        this.createFullscreenContainer();
        this.createAutofillContainer();
        this.setupEventListeners();
        console.log('✨ Stylized autofill initialized');
    }

    // UI Creation Methods
    createFullscreenContainer() {
        if (this.fullscreenContainer) return;
        
        this.fullscreenContainer = document.createElement('div');
        this.fullscreenContainer.className = 'fullscreen-autofill';
        this.fullscreenContainer.style.display = 'none';
        
        // Close button
        this.closeButton = document.createElement('button');
        this.closeButton.className = 'close-autofill';
        this.closeButton.innerHTML = '&times;';
        this.closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideAutofill();
        });
        
        // Search container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search for a location...';
        this.searchInput.className = 'search-input';
        
        searchContainer.appendChild(this.searchInput);
        this.fullscreenContainer.appendChild(this.closeButton);
        this.fullscreenContainer.appendChild(searchContainer);
        document.body.appendChild(this.fullscreenContainer);
        
        // Input event with debounce
        let timeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                this.handleSearchInput(e.target.value);
            }, 300);
        });
    }

    createAutofillContainer() {
        if (this.autofillContainer) return;
        
        this.autofillContainer = document.createElement('div');
        this.autofillContainer.className = 'location-autofill';
        this.fullscreenContainer.appendChild(this.autofillContainer);
    }

    // Event Handlers
    setupEventListeners() {
        // Handle input focus
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('location-input')) {
                e.preventDefault();
                this.showFullscreenAutofill(e.target);
            }
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.fullscreenContainer.style.display === 'block') {
                this.hideAutofill();
            }
        });
    }

    // Core Methods
    showFullscreenAutofill(input) {
        if (this.isProcessing) return;
        
        this.activeInput = input;
        this.fullscreenContainer.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // Add class to body to hide header/nav
        document.body.classList.add('fullscreen-autofill-active');
        
        // Clear previous content
        if (this.autofillContainer) {
            this.autofillContainer.innerHTML = '';
        }
        
        // Focus and show recent searches
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.value = input.value || '';
                this.searchInput.focus();
                this.showRecentSearches();
            }
        }, 10);
    }
    
    hideAutofill() {
        if (this.isProcessing) return;
        
        this.fullscreenContainer.style.display = 'none';
        document.body.style.overflow = '';
        // Remove class from body to show header/nav again
        document.body.classList.remove('fullscreen-autofill-active');
        this.autofillContainer.innerHTML = '';
        this.searchInput.value = '';
        this.activeInput = null;
    }
    
    hideAutofillUIOnly() {
        this.fullscreenContainer.style.display = 'none';
        document.body.style.overflow = '';
        // Remove class from body to show header/nav again
        document.body.classList.remove('fullscreen-autofill-active');
    }

    async handleSearchInput(query) {
        if (this.currentRequest) {
            clearTimeout(this.currentRequest);
        }

        if (query.length >= 2) {
            this.currentRequest = setTimeout(() => {
                this.getPlaceSuggestions(query);
                this.currentRequest = null;
            }, 300);
        } else if (query.length === 0) {
            this.showRecentSearches();
        }
    }

    getPlaceSuggestions(query) {
        if (!window.google?.maps?.places) {
            console.error('Google Maps API not loaded');
            return;
        }

        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions({
            input: query,
            componentRestrictions: { country: 'sg' },
            types: ['address']
        }, (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
                this.renderSuggestions(predictions);
            } else {
                this.showRecentSearches();
            }
        });
    }

    renderSuggestions(predictions) {
        if (!this.autofillContainer) return;
        
        this.autofillContainer.innerHTML = '';
        this.autofillContainer.style.display = 'block';
        
        predictions.forEach(prediction => {
            const item = document.createElement('div');
            item.className = 'autofill-item';
            
            const parts = this.splitPredictionText(prediction.description);
            
            item.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <div class="autofill-content">
                    <div class="autofill-main">${parts.main}</div>
                    <div class="autofill-secondary">${parts.secondary}</div>
                </div>
            `;
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectSuggestion(prediction);
            });
            
            this.autofillContainer.appendChild(item);
        });
    }

    splitPredictionText(text) {
        const commaIndex = text.indexOf(',');
        
        if (commaIndex > 0 && commaIndex < 30) {
            return {
                main: text.substring(0, commaIndex),
                secondary: text.substring(commaIndex + 1).trim()
            };
        } else {
            const cutPoint = Math.min(30, text.length);
            return {
                main: text.substring(0, cutPoint),
                secondary: text.substring(cutPoint).trim()
            };
        }
    }

    showRecentSearches() {
        if (!this.autofillContainer || this.recentSearches.length === 0) {
            return;
        }
        
        this.autofillContainer.innerHTML = '';
        this.autofillContainer.style.display = 'block';
        
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
                    <div class="autofill-secondary">${search.secondary || ''}</div>
                </div>
            `;
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!this.activeInput) return;
                
                const inputToUpdate = this.activeInput;
                const inputId = inputToUpdate.id;
                const placeId = search.placeId;
                
                // Update UI immediately
                inputToUpdate.value = search.main + (search.secondary ? ', ' + search.secondary : '');
                this.hideAutofillUIOnly();
                
                // Process place selection
                this.processPlaceSelection(placeId, inputId, inputToUpdate);
            });
            
            this.autofillContainer.appendChild(item);
        });
    }

    async selectSuggestion(prediction) {
        if (!this.activeInput || this.isProcessing) return;
        this.isProcessing = true;
        
        const inputToUpdate = this.activeInput;
        const inputId = inputToUpdate.id;
        const placeId = prediction.place_id;
        
        // Update UI immediately
        inputToUpdate.value = prediction.description;
        this.hideAutofillUIOnly();
        
        // Add to recent searches
        this.addToRecentSearches({
            main: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
            secondary: prediction.structured_formatting?.secondary_text || prediction.description.split(',').slice(1).join(',').trim(),
            placeId: placeId
        });
        
        // Process place selection
        await this.processPlaceSelection(placeId, inputId, inputToUpdate);
        this.isProcessing = false;
    }

    async processPlaceSelection(placeId, inputId, inputElement) {
        try {
            if (placeId) {
                await this.triggerPlaceSelection(placeId, inputId);
            }
            
            // Dispatch events
            setTimeout(() => {
                const element = document.getElementById(inputId) || inputElement;
                if (!element) return;
                
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.focus();
            }, 50);
        } catch (error) {
            console.error('Error processing place selection:', error);
        } finally {
            this.hideAutofill();
        }
    }

    async triggerPlaceSelection(placeId, inputId) {
        return new Promise((resolve, reject) => {
            if (!placeId || !window.google?.maps?.places) {
                console.warn('Invalid place ID or Google Maps not loaded');
                resolve();
                return;
            }

            const service = new google.maps.places.PlacesService(document.createElement('div'));
            service.getDetails({ placeId }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                    const input = document.getElementById(inputId);
                    if (input) {
                        // Store place data in the input element
                        input.dataset.placeId = place.place_id;
                        input.dataset.lat = place.geometry.location.lat();
                        input.dataset.lng = place.geometry.location.lng();
                        
                        // Trigger map update
                        const event = new CustomEvent('location-updated', {
                            detail: {
                                inputId: inputId,
                                place: place
                            }
                        });
                        document.dispatchEvent(event);
                    }
                    resolve();
                } else {
                    console.error('Place details request failed:', status);
                    reject(new Error('Failed to get place details'));
                }
            });
        });
    }

    // Recent Searches Management
    addToRecentSearches(search) {
        // Remove duplicates
        this.recentSearches = this.recentSearches.filter(
            s => s.placeId !== search.placeId
        );
        
        // Add to beginning
        this.recentSearches.unshift(search);
        
        // Keep only the last 5 searches
        if (this.recentSearches.length > 5) {
            this.recentSearches.pop();
        }
        
        this.saveRecentSearches();
    }

    loadRecentSearches() {
        try {
            const saved = localStorage.getItem('recentLocationSearches');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load recent searches:', e);
            return [];
        }
    }

    saveRecentSearches() {
        try {
            localStorage.setItem('recentLocationSearches', JSON.stringify(this.recentSearches));
        } catch (e) {
            console.error('Failed to save recent searches:', e);
        }
    }

    // Utility Methods
    showAutofill() {
        if (this.autofillContainer) {
            this.autofillContainer.style.display = 'block';
        }
    }

    getColorForPerson(personId) {
        // Simple hash function to generate consistent colors
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];
        const hash = personId.split('').reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    }
}

// Initialize the autofill
document.addEventListener('DOMContentLoaded', () => {
    window.locationAutofill = new StylizedAutofill();
});

// Add styles if they don't exist
if (!document.getElementById('stylized-autofill-styles')) {
    const style = document.createElement('style');
    style.id = 'stylized-autofill-styles';
    style.textContent = `
        .fullscreen-autofill {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: white;
            z-index: 9999;
            padding: 15px;
            padding-top: 15px;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        }

        /* Hide header and nav when modal is active */
        body.fullscreen-autofill-active .group-header-container,
        body.fullscreen-autofill-active .bottom-navigation,
        body.fullscreen-autofill-active .nav-create-popup {
            display: none !important;
        }

        .search-container {
            position: relative;
            margin-bottom: 15px;
            margin-top: 10px;
        }
        
        .search-input {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
            box-sizing: border-box;
        }
        
        .close-autofill {
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
        }
        
        .location-autofill {
            border: 1px solid #eee;
            border-radius: 8px;
            max-height: 70vh;
            overflow-y: auto;
        }
        
        .autofill-item {
            display: flex;
            align-items: center;
            padding: 12px 15px;
            border-bottom: 1px solid #f5f5f5;
            cursor: pointer;
        }
        
        .autofill-item:hover {
            background-color: #f9f9f9;
        }
        
        .autofill-item i {
            margin-right: 12px;
            color: #666;
            font-size: 18px;
            width: 24px;
            text-align: center;
        }
        
        .autofill-content {
            flex: 1;
        }
        
        .autofill-main {
            font-weight: 500;
            color: #333;
        }
        
        .autofill-secondary {
            font-size: 13px;
            color: #888;
            margin-top: 2px;
        }
        
        .autofill-header {
            padding: 10px 15px;
            font-size: 14px;
            color: #666;
            background-color: #f9f9f9;
            border-bottom: 1px solid #eee;
        }
    `;
    document.head.appendChild(style);
}