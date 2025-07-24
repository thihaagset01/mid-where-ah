/**
 * LocationManager class - Manages multiple LocationInput instances
 */
class LocationManager {
    constructor(options = {}) {
        // Default options
        this.options = {
            containerId: 'locations-container',
            minLocations: 2,
            maxLocations: 8,
            initialLocations: 2,
            colorPalette: [
                '#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', 
                '#EC4899', '#10B981', '#F97316', '#6366F1'
            ],
            ...options
        };
        
        // State
        this.locations = new Map(); // personId -> LocationInput
        this.nextPersonId = 1;
        this.initialized = false;
        
        // Bind event handlers
        this.handleLocationChange = this.handleLocationChange.bind(this);
        this.handleLocationRemove = this.handleLocationRemove.bind(this);
        
        // Initialize
        this.init();
    }
    
    init() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing LocationManager...');
        
        // Set up event listeners
        document.addEventListener('locationinput:change', this.handleLocationChange);
        document.addEventListener('locationinput:remove', this.handleLocationRemove);
        
        // Create container if it doesn't exist
        this.ensureContainer();
        
        // Create initial inputs
        this.createInitialInputs();
        
        // Set up add button
        this.setupAddButton();
        
        this.initialized = true;
        console.log('✅ LocationManager initialized');
    }
    
    ensureContainer() {
        let container = document.getElementById(this.options.containerId);
        
        if (!container) {
            // Look for container with class name
            container = document.querySelector(`.${this.options.containerId}`);
            
            if (container) {
                // Set ID if found by class
                container.id = this.options.containerId;
            } else {
                // Create new container
                container = document.createElement('div');
                container.id = this.options.containerId;
                container.className = 'locations-container';
                document.body.appendChild(container);
            }
        }
        
        // Ensure add button container exists
        let addContainer = container.querySelector('.add-person-container');
        if (!addContainer) {
            addContainer = document.createElement('div');
            addContainer.className = 'add-person-container';
            
            const addButton = document.createElement('button');
            addButton.id = 'add-person-btn';
            addButton.className = 'add-person-btn';
            addButton.innerHTML = '<i class="fas fa-plus"></i>';
            addButton.title = 'Add person';
            
            addContainer.appendChild(addButton);
            container.appendChild(addContainer);
        }
        
        this.container = container;
    }
    
    createInitialInputs() {
        // Check for existing inputs
        const existingInputs = document.querySelectorAll('.location-input');
        
        if (existingInputs.length > 0) {
            console.log(`📍 Found ${existingInputs.length} existing location inputs`);
            this.setupExistingInputs(existingInputs);
        } else {
            console.log('📍 Creating new inputs');
            // Create initial inputs
            for (let i = 0; i < this.options.initialLocations; i++) {
                this.addLocation();
            }
        }
    }
    
    setupExistingInputs(inputs) {
        let maxPersonId = 0;
        
        inputs.forEach((input, index) => {
            const container = input.closest('.location-container');
            let personId;
            
            if (container && container.hasAttribute('data-person-id')) {
                // Use existing person ID from HTML
                personId = parseInt(container.getAttribute('data-person-id'));
            } else {
                // Assign sequential person ID
                personId = index + 1;
            }
            
            // Create LocationInput instance for this input
            const locationInput = new LocationInput(personId, this.options.containerId, {
                colorPalette: this.options.colorPalette,
                allowRemove: personId > 2 // Don't allow removing the first two inputs
            });
            
            // Store in locations map
            const inputId = `location-${personId}`;
            this.locations.set(personId, locationInput);
            
            // Track highest person ID
            maxPersonId = Math.max(maxPersonId, personId);
        });
        
        // Set next person ID
        this.nextPersonId = maxPersonId + 1;
    }
    
    setupAddButton() {
        const addBtn = document.getElementById('add-person-btn');
        if (!addBtn) return;
        
        // Remove any existing listeners
        const newBtn = addBtn.cloneNode(true);
        addBtn.parentNode.replaceChild(newBtn, addBtn);
        
        // Add event listener
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addLocation();
        });
        
        // Update button state
        this.updateAddButtonState();
    }
    
    addLocation() {
        if (this.locations.size >= this.options.maxLocations) {
            if (typeof showErrorNotification === 'function') {
                showErrorNotification(`Maximum ${this.options.maxLocations} people allowed`);
            }
            return null;
        }
        
        const personId = this.nextPersonId++;
        
        // Create new LocationInput
        const locationInput = new LocationInput(personId, this.options.containerId, {
            colorPalette: this.options.colorPalette,
            allowRemove: this.locations.size >= (this.options.minLocations - 1) // Allow remove if we have enough locations
        });
        
        // Store in locations map using personId as key (not inputId)
        this.locations.set(personId, locationInput);
        
        // Update UI
        this.updateUI();
        
        return locationInput;
    }
    
    removeLocation(personId) {
        const locationInput = this.locations.get(personId);
        
        if (!locationInput) return;
        
        // Destroy the LocationInput instance
        locationInput.destroy();
        
        // Remove from locations map
        this.locations.delete(personId);
        
        // Update UI
        this.updateUI();
    }
    
    // Get display order of locations (stable IDs, sorted)
    getDisplayOrder() {
        return Array.from(this.locations.keys()).sort();
    }
    
    updateUI() {
        this.updateAddButtonState();
        this.updateRemoveButtons();
        this.checkAllLocationsAndUpdateButton();
    }
    
    updateAddButtonState() {
        const addBtn = document.getElementById('add-person-btn');
        if (!addBtn) return;
        
        const count = this.locations.size;
        
        // Show/hide add button
        addBtn.style.display = count < this.options.maxLocations ? 'flex' : 'none';
        
        if (count >= this.options.maxLocations) {
            addBtn.innerHTML = '<i class="fas fa-users"></i>';
            addBtn.disabled = true;
            addBtn.title = 'Maximum people reached';
        } else {
            addBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addBtn.disabled = false;
            addBtn.title = 'Add person';
        }
    }
    
    updateRemoveButtons() {
        const count = this.locations.size;
        
        // Update each location's remove button visibility
        this.locations.forEach(location => {
            if (location.removeBtn) {
                const shouldShow = count > this.options.minLocations && location.personId > 2;
                location.removeBtn.style.display = shouldShow ? 'inline-flex' : 'none';
            }
        });
    }
    
    handleLocationChange(event) {
        const { inputId, state } = event.detail;
        console.log(`Location changed: ${inputId}`, state);
        
        // Check if all locations are valid and update find button
        this.checkAllLocationsAndUpdateButton();
    }
    
    handleLocationRemove(event) {
        const { personId } = event.detail;
        console.log(`Remove location requested: Person ${personId}`);
        
        this.removeLocation(personId);
    }
    
    checkAllLocationsAndUpdateButton() {
        const findBtn = document.getElementById('find-central-btn');
        if (!findBtn) return;
        
        // Count valid locations
        let validCount = 0;
        this.locations.forEach(location => {
            if (location.state.isValid) {
                validCount++;
            }
        });
        
        // Enable/disable find button
        const hasEnoughLocations = validCount >= this.options.minLocations;
        
        findBtn.disabled = !hasEnoughLocations;
        findBtn.classList.toggle('active', hasEnoughLocations);
        
        // Update button text
        if (!hasEnoughLocations) {
            findBtn.title = `Need at least ${this.options.minLocations} valid locations`;
        } else {
            findBtn.title = 'Find central location';
        }
    }
    
    getAllLocationData() {
        const data = [];
        
        this.locations.forEach((location, personId) => {
            if (location.state.isValid && location.state.position) {
                data.push({
                    personId: personId,
                    inputId: location.inputId,
                    position: location.state.position,
                    transportMode: location.state.transportMode,
                    address: location.state.address
                });
            }
        });
        
        return data;
    }
    
    getValidLocations() {
        return Array.from(this.locations.values())
            .filter(loc => loc.state.isValid)
            .map(loc => loc.state);
    }
    
    destroy() {
        // Remove event listeners
        document.removeEventListener('locationinput:change', this.handleLocationChange);
        document.removeEventListener('locationinput:remove', this.handleLocationRemove);
        
        // Destroy all location inputs
        this.locations.forEach(location => {
            location.destroy();
        });
        
        // Clear locations map
        this.locations.clear();
        
        console.log('LocationManager destroyed');
    }
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LocationManager };
}
