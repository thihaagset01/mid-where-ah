/**
 * Service Initialization Module
 * Ensures all services are properly initialized and available
 */

class ServiceInitializer {
    constructor() {
        this.initialized = false;
        this.services = {};
    }

    /**
     * Initialize all services
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Import services
            const MarkerStyleService = (await import('./MarkerStyleService.js')).default;
            const UIService = (await import('./UIService.js')).default;
            
            // Initialize services in order of dependency
            this.services.markerStyleService = new MarkerStyleService();
            this.services.uiService = new UIService();
            
            // Make services globally available (for legacy code)
            window.markerStyleService = this.services.markerStyleService;
            window.uiService = this.services.uiService;
            
            this.initialized = true;
            console.log('Services initialized:', Object.keys(this.services));
            
            // Dispatch event when services are ready
            const event = new CustomEvent('servicesReady', { detail: this.services });
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('Failed to initialize services:', error);
            throw error;
        }
    }

    /**
     * Get a service by name
     * @param {string} serviceName - Name of the service to retrieve
     * @returns {Object} The requested service
     * @throws {Error} If services are not initialized or service doesn't exist
     */
    getService(serviceName) {
        if (!this.initialized) {
            throw new Error('Services have not been initialized. Call initialize() first.');
        }
        
        const service = this.services[serviceName];
        if (!service) {
            throw new Error(`Service '${serviceName}' not found. Available services: ${Object.keys(this.services).join(', ')}`);
        }
        
        return service;
    }
}

// Create and export singleton instance
const serviceInitializer = new ServiceInitializer();

export default serviceInitializer;
