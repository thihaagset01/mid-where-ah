/**
 * SingaporeGeocoder class - Simplified geocoding with strategy pattern and caching
 * Handles Singapore-specific geocoding with multiple strategies
 */
class SingaporeGeocoder {
    constructor() {
        this.cache = new Map();
        this.mrt = new Map();
        
        // Initialize MRT stations data
        this.initMRTStations();
        
        console.log('🧭 SingaporeGeocoder initialized');
    }
    
    /**
     * Geocode an address using multiple strategies
     * @param {string} address - The address to geocode
     * @returns {Promise<Object>} - A promise that resolves to a geocoding result
     */
    async geocode(address) {
        if (!address) {
            throw new Error('Address is required');
        }
        
        // Normalize address
        address = address.trim();
        
        // Check cache first
        if (this.cache.has(address)) {
            console.log(`🔍 Cache hit for "${address}"`);
            return this.cache.get(address);
        }
        
        console.log(`🔍 Geocoding "${address}"`);
        
        // Define geocoding strategies in order of preference
        const strategies = [
            () => this.tryPostalCode(address),
            () => this.tryMRTStation(address),
            () => this.tryGeneral(address)
        ];
        
        // Try each strategy in sequence
        for (const strategy of strategies) {
            try {
                const result = await strategy();
                if (result) {
                    // Cache successful result
                    this.cache.set(address, result);
                    return result;
                }
            } catch (e) {
                // Try next strategy
                console.log(`Strategy failed: ${e.message}`);
            }
        }
        
        // If all strategies fail
        throw new Error(`Cannot geocode: ${address}`);
    }
    
    /**
     * Try to geocode using Singapore postal code
     * @param {string} address - The address to geocode
     * @returns {Promise<Object|null>} - A promise that resolves to a geocoding result or null
     */
    async tryPostalCode(address) {
        // Singapore postal code pattern: 6 digits
        const postalCodeMatch = address.match(/\b\d{6}\b/);
        
        if (!postalCodeMatch) {
            return null;
        }
        
        const postalCode = postalCodeMatch[0];
        console.log(`📮 Trying postal code strategy for "${postalCode}"`);
        
        // Use Google Geocoder with postal code
        return new Promise((resolve, reject) => {
            if (!window.geocoder) {
                reject(new Error('Google Geocoder not available'));
                return;
            }
            
            window.geocoder.geocode(
                { address: postalCode, region: 'sg' },
                (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                        console.log(`✅ Postal code strategy succeeded for "${postalCode}"`);
                        resolve(this.formatGeocodingResult(results[0], address));
                    } else {
                        reject(new Error(`Postal code geocoding failed: ${status}`));
                    }
                }
            );
        });
    }
    
    /**
     * Try to geocode using Singapore MRT station names
     * @param {string} address - The address to geocode
     * @returns {Promise<Object|null>} - A promise that resolves to a geocoding result or null
     */
    async tryMRTStation(address) {
        // Check if address contains MRT or station
        const isMRT = /\bmrt\b|\bstation\b/i.test(address);
        
        // Normalize address for MRT lookup
        const normalizedAddress = address.toLowerCase()
            .replace(/\bmrt\b|\bstation\b/gi, '')
            .trim();
        
        // If not explicitly an MRT station and doesn't match our MRT data, skip
        if (!isMRT && !this.findMRTMatch(normalizedAddress)) {
            return null;
        }
        
        console.log(`🚇 Trying MRT station strategy for "${normalizedAddress}"`);
        
        // Try to find matching MRT station
        const station = this.findMRTMatch(normalizedAddress);
        
        if (!station) {
            return null;
        }
        
        // Create a result object similar to Google Geocoder result
        const result = {
            geometry: {
                location: new google.maps.LatLng(station.lat, station.lng)
            },
            formatted_address: `${station.name} MRT Station, Singapore`,
            address_components: [
                { short_name: station.name, long_name: `${station.name} MRT Station` }
            ],
            types: ['transit_station'],
            place_id: `mrt_${station.name.toLowerCase().replace(/\s+/g, '_')}`
        };
        
        console.log(`✅ MRT station strategy succeeded for "${station.name}"`);
        return this.formatGeocodingResult(result, address);
    }
    
    /**
     * Try general geocoding using Google Geocoder
     * @param {string} address - The address to geocode
     * @returns {Promise<Object>} - A promise that resolves to a geocoding result
     */
    async tryGeneral(address) {
        console.log(`🌍 Trying general geocoding strategy for "${address}"`);
        
        // Add Singapore context if not present
        const searchAddress = /singapore|sg/i.test(address) ? 
            address : `${address}, Singapore`;
        
        // Use Google Geocoder
        return new Promise((resolve, reject) => {
            if (!window.geocoder) {
                reject(new Error('Google Geocoder not available'));
                return;
            }
            
            window.geocoder.geocode(
                { address: searchAddress },
                (results, status) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                        console.log(`✅ General geocoding strategy succeeded for "${address}"`);
                        resolve(this.formatGeocodingResult(results[0], address));
                    } else {
                        reject(new Error(`General geocoding failed: ${status}`));
                    }
                }
            );
        });
    }
    
    /**
     * Format geocoding result to a consistent structure
     * @param {Object} result - The raw geocoding result
     * @param {string} originalAddress - The original address query
     * @returns {Object} - A formatted geocoding result
     */
    formatGeocodingResult(result, originalAddress) {
        // Extract the most important information
        return {
            geometry: result.geometry,
            formatted_address: result.formatted_address || originalAddress,
            address_components: result.address_components || [],
            place_id: result.place_id || `custom_${Date.now()}`,
            types: result.types || ['geocode'],
            originalAddress: originalAddress
        };
    }
    
    /**
     * Find a matching MRT station from partial name
     * @param {string} partialName - Partial name of the MRT station
     * @returns {Object|null} - The matching MRT station or null
     */
    findMRTMatch(partialName) {
        // Simple fuzzy matching
        const normalized = partialName.toLowerCase();
        
        // Try exact match first
        if (this.mrt.has(normalized)) {
            return this.mrt.get(normalized);
        }
        
        // Try partial match
        for (const [name, station] of this.mrt.entries()) {
            if (name.includes(normalized) || normalized.includes(name)) {
                return station;
            }
        }
        
        return null;
    }
    
    /**
     * Initialize MRT stations data
     */
    initMRTStations() {
        // Sample MRT stations data (would be expanded in a real implementation)
        const stations = [
            { name: 'Orchard', lat: 1.3038, lng: 103.8319 },
            { name: 'City Hall', lat: 1.2931, lng: 103.8519 },
            { name: 'Raffles Place', lat: 1.2830, lng: 103.8513 },
            { name: 'Marina Bay', lat: 1.2764, lng: 103.8549 },
            { name: 'Bugis', lat: 1.3009, lng: 103.8559 },
            { name: 'Dhoby Ghaut', lat: 1.2993, lng: 103.8455 },
            { name: 'Jurong East', lat: 1.3329, lng: 103.7421 },
            { name: 'Woodlands', lat: 1.4369, lng: 103.7864 },
            { name: 'Changi Airport', lat: 1.3592, lng: 103.9894 },
            { name: 'Tampines', lat: 1.3546, lng: 103.9450 }
        ];
        
        // Populate MRT map
        stations.forEach(station => {
            this.mrt.set(station.name.toLowerCase(), station);
        });
    }
    
    /**
     * Clear the geocoding cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Geocoder cache cleared');
    }
}

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SingaporeGeocoder };
}
