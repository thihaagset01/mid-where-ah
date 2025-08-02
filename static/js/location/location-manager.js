

class LocationInputManager {
    constructor() {
        this.maxPersons = 10;
        this.activePersonIds = new Set([1, 2]); // Track active IDs
        window.locationInputManager = this;
        
        console.log('LocationInputManager initialized');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        console.log('Initializing LocationInputManager');
        this.setupAddPersonButton();
        return this;
    }
    
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
    
    // Find the next available person ID
    getNextAvailableId() {
        for (let i = 3; i <= this.maxPersons; i++) {
            if (!this.activePersonIds.has(i)) {
                return i;
            }
        }
        return null; // No available IDs
    }
    
    addNewPerson() {
        if (this.activePersonIds.size >= this.maxPersons) {
            console.log('Maximum number of persons reached');
            if (window.uiManager) {
                window.uiManager.showNotification('Maximum number of locations reached (6)');
            }
            return;
        }
        
        const personId = this.getNextAvailableId();
        if (!personId) {
            console.error('No available person ID');
            return;
        }
        
        // Add to active set
        this.activePersonIds.add(personId);
        
        console.log(`Adding new person #${personId}`);
        
        // Create container
        const locationContainer = document.createElement('div');
        locationContainer.className = 'location-container';
        locationContainer.setAttribute('data-person-id', personId);
        
        // Create transport icon
        const transportIcon = document.createElement('div');
        transportIcon.className = 'transport-icon transit';
        transportIcon.setAttribute('data-person', personId);
        transportIcon.setAttribute('data-current-mode', 'TRANSIT');
        transportIcon.setAttribute('data-tooltip', 'Public Transport');
        
        const transportIconInner = document.createElement('i');
        transportIconInner.className = 'fas fa-subway';
        transportIcon.appendChild(transportIconInner);
        
        // Create input
        const locationInput = document.createElement('input');
        locationInput.type = 'text';
        locationInput.id = `location-${personId}`;
        locationInput.className = 'location-input';
        locationInput.placeholder = `Address ${personId}`;
        locationInput.autocomplete = 'off';
        
        // CREATE REMOVE BUTTON (only for person 3+)
        let removeBtn = null;
        if (personId > 2) {
            removeBtn = document.createElement('button');
            removeBtn.className = 'remove-person-btn';
            removeBtn.title = 'Remove Person';
            removeBtn.style.display = 'inline-flex';
            
            const removeIcon = document.createElement('i');
            removeIcon.className = 'fas fa-times';
            removeBtn.appendChild(removeIcon);
            
            // Add click handler with proper ID tracking
            removeBtn.addEventListener('click', () => {
                console.log(`Removing person ${personId}`);
                
                // Remove from active set
                this.activePersonIds.delete(personId);
                
                // Remove DOM element
                locationContainer.remove();
                
                console.log('Active person IDs:', Array.from(this.activePersonIds));
            });
        }
        
        // Assemble container
        locationContainer.appendChild(transportIcon);
        locationContainer.appendChild(locationInput);
        if (removeBtn) {
            locationContainer.appendChild(removeBtn);
        }
        
        // Add to DOM
        const locationsContainer = document.getElementById('locations-container');
        const parentContainer = document.getElementById('parent-container');
        
        if (locationsContainer && parentContainer) {
            locationsContainer.insertBefore(locationContainer, parentContainer);
            
            // Set up autocomplete
            if (window.mapManager) {
                setTimeout(() => {
                    window.mapManager.setupSingleInputAutocomplete(locationInput, personId - 1);
                }, 100);
            }
            
            // Update find button
            if (window.midpointCalculator) {
                window.midpointCalculator.updateFindButtonState();
            }
        } else {
            console.error('Locations container or parent container not found');
        }
        
        console.log('Active person IDs after add:', Array.from(this.activePersonIds));
    }
}

// Create instance when script loads
new LocationInputManager(); 