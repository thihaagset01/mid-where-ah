/**
 * location-manager.js - Manages location inputs and related functionality
 * Handles adding/removing location inputs, transport modes, and integration with MapManager
 */

class LocationInputManager {
    constructor() {
        this.personCount = 2; // Start with 2 default locations
        this.maxPersons = 6;  // Maximum number of locations allowed
        
        // Store global reference
        window.locationInputManager = this;
        
        console.log('LocationInputManager initialized');
        
        // Auto-initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    /**
     * Initialize location input manager
     */
    init() {
        console.log('Initializing LocationInputManager');
        
        // Set up add person button
        this.setupAddPersonButton();
        
        return this;
    }
    
    /**
     * Set up add person button
     */
    setupAddPersonButton() {
        const addPersonBtn = document.getElementById('add-person-btn');
        
        if (addPersonBtn) {
            console.log('Setting up add person button');
            
            addPersonBtn.addEventListener('click', () => {
                this.addNewPerson();
            });
        } else {
            console.warn('Add person button not found');
        }
    }
    
    /**
     * Add a new person/location input
     */
    addNewPerson() {
        // Check if we've reached the maximum number of persons
        if (this.personCount >= this.maxPersons) {
            console.log('Maximum number of persons reached');
            
            // Show notification if UIManager is available
            if (window.uiManager) {
                window.uiManager.showNotification('Maximum number of locations reached (6)');
            }
            
            return;
        }
        
        // Increment person count
        this.personCount++;
        
        console.log(`Adding new person #${this.personCount}`);
        
        // Create new location container
        const locationContainer = document.createElement('div');
        locationContainer.className = 'location-container';
        locationContainer.setAttribute('data-person-id', this.personCount);
        
        // Create transport icon
        const transportIcon = document.createElement('div');
        transportIcon.className = 'transport-icon transit';
        transportIcon.setAttribute('data-person', this.personCount);
        transportIcon.setAttribute('data-current-mode', 'TRANSIT');
        transportIcon.setAttribute('data-tooltip', 'Public Transport');
        
        const transportIconInner = document.createElement('i');
        transportIconInner.className = 'fas fa-subway';
        transportIcon.appendChild(transportIconInner);
        
        // Create location input
        const locationInput = document.createElement('input');
        locationInput.type = 'text';
        locationInput.id = `location-${this.personCount}`;
        locationInput.className = 'location-input';
        locationInput.placeholder = `Address ${this.personCount}`;
        locationInput.autocomplete = 'off';
        
        // Assemble location container
        locationContainer.appendChild(transportIcon);
        locationContainer.appendChild(locationInput);
        
        // Add to locations container before the parent container
        const locationsContainer = document.getElementById('locations-container');
        const parentContainer = document.getElementById('parent-container');
        
        if (locationsContainer && parentContainer) {
            locationsContainer.insertBefore(locationContainer, parentContainer);
            
            // Set up transport mode cycling if TransportManager is available
            if (window.transportManager) {
                window.transportManager.setupTransportModeCycling(transportIcon);
            }
            
            // Set up autocomplete for the new input if MapManager is available
            if (window.mapManager) {
                setTimeout(() => {
                    window.mapManager.setupSingleInputAutocomplete(locationInput, this.personCount - 1);
                }, 100);
            }
            
            // Update find button state if MidpointCalculator is available
            if (window.midpointCalculator) {
                window.midpointCalculator.updateFindButtonState();
            }
        } else {
            console.error('Locations container or parent container not found');
        }
    }
}

// Create instance when script loads
new LocationInputManager();
