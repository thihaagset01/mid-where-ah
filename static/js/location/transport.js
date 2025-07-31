/**
 * transport.js - Transport mode management for MidWhereAh
 * Handles transport mode cycling and UI updates
 */

class TransportManager {
    constructor() {
        // Transport modes configuration
        this.TRANSPORT_MODES = [
            { mode: 'TRANSIT', icon: '<i class="fas fa-subway"></i>', name: 'Public Transport', class: 'transit' },
            { mode: 'DRIVING', icon: '<i class="fas fa-car"></i>', name: 'Car/Taxi', class: 'driving' },
            { mode: 'WALKING', icon: '<i class="fas fa-walking"></i>', name: 'Walking', class: 'walking' }
        ];
        
        // Initialize global storage if not exists
        window.userTransportModes = window.userTransportModes || new Map();
        
        console.log('TransportManager initialized');
    }
    
    /**
     * Initialize transport manager
     */
    init() {
        this.setupTransportCycling();
        return this;
    }
    
    /**
     * Set up transport mode cycling
     */
    setupTransportCycling() {
        document.addEventListener('click', (e) => {
            const transportIcon = e.target.classList.contains('transport-icon') ? 
                                 e.target : e.target.closest('.transport-icon');
            
            if (transportIcon) {
                this.cycleTransportMode(transportIcon);
            }
        });
    }
    
    /**
     * Cycle through transport modes
     */
    cycleTransportMode(iconElement) {
        const person = iconElement.getAttribute('data-person');
        const currentMode = iconElement.getAttribute('data-current-mode');
        
        const currentIndex = this.TRANSPORT_MODES.findIndex(mode => mode.mode === currentMode);
        const nextIndex = (currentIndex + 1) % this.TRANSPORT_MODES.length;
        const nextMode = this.TRANSPORT_MODES[nextIndex];
        
        this.updateTransportIcon(iconElement, nextMode, person);
        
        iconElement.classList.add('tap-animation');
        setTimeout(() => iconElement.classList.remove('tap-animation'), 300);
        
        console.log(`🔄 Person ${person} switched to: ${nextMode.name}`);
    }
    
    /**
     * Update transport icon in the UI
     */
    updateTransportIcon(iconElement, modeConfig, person) {
        const locationId = `location-${person}`;
        
        iconElement.innerHTML = modeConfig.icon;
        iconElement.setAttribute('data-current-mode', modeConfig.mode);
        iconElement.setAttribute('data-tooltip', modeConfig.name);
        iconElement.className = `transport-icon ${modeConfig.class}`;
        
        // Update global storage
        window.userTransportModes.set(locationId, modeConfig.mode);
        
        // Update locationData if available
        if (window.locationData && window.locationData.has(locationId)) {
            const locationData = window.locationData.get(locationId);
            locationData.transportMode = modeConfig.mode;
            window.locationData.set(locationId, locationData);
        }
        
        // Update LocationInput if using the new component system
        if (window.locationManager && window.locationManager.locations) {
            const locationInput = window.locationManager.getLocationById(person);
            if (locationInput) {
                locationInput.transportMode = modeConfig.mode;
            }
        }
        
        // Trigger validation check if available
        if (window.midpointCalculator) {
            window.midpointCalculator.updateFindButtonState();
        } else if (typeof checkAllLocationsAndUpdateButton === 'function') {
            checkAllLocationsAndUpdateButton();
        }
    }
    
    /**
     * Get transport mode for a location
     */
    getTransportMode(locationId) {
        return window.userTransportModes.get(locationId) || 'TRANSIT';
    }
    
    /**
     * Set transport mode for a location
     */
    setTransportMode(locationId, mode) {
        window.userTransportModes.set(locationId, mode);
    }
}

// Create global instance
window.transportManager = new TransportManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize transport manager
    window.transportManager.init();
});
