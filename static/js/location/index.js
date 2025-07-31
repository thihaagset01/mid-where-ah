/**
 * Location module index - Exports all location-related components
 * This file serves as the entry point for the location module
 */

// Import existing location components
// Note: These are not ES module imports but references to global objects
// that are created when the individual files are loaded via script tags

// Export components to global namespace for backward compatibility
window.LocationModule = {
    LocationInput: window.LocationInput,
    LocationManager: window.LocationManager,
    SingaporeGeocoder: window.SingaporeGeocoder,
    MidpointCalculator: window.midpointCalculator,
    TransportManager: window.transportManager,
    MapManager: window.mapManager, // From MapManager.js
    
    // Initialize all location components
    init() {
        console.log('Initializing Location Module');
        
        // Initialize SingaporeGeocoder if not already initialized
        if (!window.singaporeGeocoder && window.SingaporeGeocoder) {
            window.singaporeGeocoder = new window.SingaporeGeocoder();
        }
        
        return this;
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize location module
    window.LocationModule.init();
});
