/**
 * midpoint.js - Midpoint calculation functionality for MidWhereAh
 * Handles calculation of central meeting points based on multiple locations
 * STREAMLINED VERSION - Goes directly to venues after calculation with visualization
 * TECHNICAL DEBT MINIMIZED - Fixed button parameter passing and improved error handling
 */

// MidpointCalculator class - using prototype-based syntax for better compatibility
function MidpointCalculator() {
    // Store directionsRenderers for cleanup
    this.directionsRenderers = [];
    this.midpointMarker = null;
    this.routeMarkers = [];
    
    // Initialize services
    this.services = {};
    this.initialized = false;
    
    console.log('MidpointCalculator initialized');
}

/**
 * Initialize services asynchronously
 * @returns {Promise<void>}
 */
MidpointCalculator.prototype.initializeServices = async function() {
    if (this.initialized) return;
    
    try {
        // Wait for global services to be available
        await this.waitForServices();
        
        // Get services from global scope
        this.services.uiService = window.uiService;
        this.services.markerStyleService = window.markerStyleService;
        this.services.optimizationDisplayService = window.optimizationDisplayService;
        this.services.venueNavigationService = window.venueNavigationService;
        
        this.initialized = true;
        console.log('MidpointCalculator services initialized');
    } catch (error) {
        console.error('Failed to initialize services:', error);
        // Continue without services for basic functionality
        this.initialized = true;
    }
};

/**
 * Wait for services to be available in global scope
 */
MidpointCalculator.prototype.waitForServices = function() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        const checkServices = () => {
            attempts++;
            
            if (window.uiService || attempts >= maxAttempts) {
                resolve();
                return;
            }
            
            setTimeout(checkServices, 100);
        };
        
        checkServices();
    });
};

/**
 * Initialize midpoint calculator
 */
MidpointCalculator.prototype.init = async function() {
    console.log('Initializing MidpointCalculator...');
    
    try {
        // Initialize services
        await this.initializeServices();
        
        // Set up the find central location button
        this.setupFindCentralButton();
        
        console.log('MidpointCalculator initialization complete');
    } catch (error) {
        console.error('Error initializing MidpointCalculator:', error);
        // Fallback to basic functionality if services fail to initialize
        this.setupFindCentralButton();
    }
};

/**
 * Set up the find central location button
 */
MidpointCalculator.prototype.setupFindCentralButton = function() {
    const findCentralBtn = document.getElementById('find-central-btn');
    if (!findCentralBtn) {
        console.warn('Find central button not found in the DOM');
        return;
    }
    
    // Clear existing event listeners
    const newBtn = findCentralBtn.cloneNode(true);
    findCentralBtn.parentNode.replaceChild(newBtn, findCentralBtn);
    
    // Set up the button with basic functionality
    newBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Find Central Location';
    newBtn.className = 'btn btn-primary find-central-btn';
    
    // Add click handler
    newBtn.addEventListener('click', () => {
        this.handleFindCentralLocation();
    });
    
    // Store reference
    this.findCentralBtn = newBtn;
    
    // Update button state based on locations
    this.updateFindButtonState();
};

/**
 * Set the loading state of a button
 * @param {HTMLElement} button - The button element to update
 * @param {boolean} isLoading - Whether the button should be in a loading state
 */
MidpointCalculator.prototype.setButtonLoading = function(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        const originalContent = button.innerHTML;
        button.setAttribute('data-original-content', originalContent);
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finding...';
        button.disabled = true;
        button.style.pointerEvents = 'none';
    } else {
        const originalContent = button.getAttribute('data-original-content');
        if (originalContent) {
            button.innerHTML = originalContent;
            button.removeAttribute('data-original-content');
        }
        button.disabled = false;
        button.style.pointerEvents = 'auto';
    }
};

/**
 * Update the find button state based on valid locations
 */
MidpointCalculator.prototype.updateFindButtonState = function() {
    const findCentralBtn = this.findCentralBtn || document.getElementById('find-central-btn');
    if (!findCentralBtn) return;
    
    const locationData = this.getAllLocationData();
    const validLocations = locationData.filter(function(loc) { 
        return loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng);
    });
    
    const hasValidLocations = validLocations.length >= 2;
    
    // Update button state
    if (hasValidLocations) {
        findCentralBtn.classList.remove('disabled');
        findCentralBtn.disabled = false;
    } else {
        findCentralBtn.classList.add('disabled');
        findCentralBtn.disabled = true;
    }
};

/**
 * Handle the find central location button click - WITH VISUALIZATION
 */
MidpointCalculator.prototype.handleFindCentralLocation = function() {
    const findCentralBtn = this.findCentralBtn || document.getElementById('find-central-btn');
    if (!findCentralBtn) {
        console.error('Find central button not found');
        return;
    }
    
    // Performance optimization: Debounce rapid clicks
    if (this._isProcessingRequest) {
        console.log('Request already in progress');
        return;
    }
    this._isProcessingRequest = true;
    
    // Get and validate locations
    const locationData = this.getAllLocationData();
    const validLocations = [];
    
    for (let i = 0; i < locationData.length; i++) {
        const loc = locationData[i];
        if (loc && loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng)) {
            validLocations.push(loc);
        }
    }
    
    if (validLocations.length < 2) {
        this.showErrorMessage('Please add at least 2 valid locations');
        this._isProcessingRequest = false;
        return;
    }
    
    console.log(`Processing ${validLocations.length} valid locations`);
    
    // Prepare user data for optimization
    const users = validLocations.map(function(loc, index) {
        return {
            lat: parseFloat(loc.lat), 
            lng: parseFloat(loc.lng),
            mode: loc.transportMode || 'TRANSIT',
            weight: 1.0,
            name: 'Person ' + (loc.personId || (index + 1))
        };
    });
    
    // Store users globally for later use
    window.currentUsers = users;
    
    const self = this;
    
    // Initialize AlgorithmVisualizer if it doesn't exist and we have a map
    if (!window.algorithmVisualizer && window.map && window.AlgorithmVisualizer) {
        console.log('🎨 Creating new AlgorithmVisualizer instance');
        window.algorithmVisualizer = new window.AlgorithmVisualizer(window.map);
    }
    
    // Check if we can show visualization
    const canShowVisualization = !!(window.algorithmVisualizer && window.map && window.meetingPointOptimizer);
    const userWantsVisualization = true; // You can make this a user setting
    
    console.log('🔍 Visualization check:', {
        hasVisualizer: !!window.algorithmVisualizer,
        hasMap: !!window.map,
        hasOptimizer: !!window.meetingPointOptimizer,
        canShow: canShowVisualization,
        userWants: userWantsVisualization
    });
    
    if (canShowVisualization && userWantsVisualization) {
        console.log('🎬 Starting optimization with visualization...');
        
        // Change button to show visualization is starting
        findCentralBtn.innerHTML = '<i class="fas fa-brain fa-pulse"></i> Analyzing...';
        findCentralBtn.style.pointerEvents = 'none';
        
        // Start the visualization
        window.algorithmVisualizer.visualizeOptimization(users, function(result) {
            console.log('🎯 Visualization completed with result:', result);
            
            if (result) {
                self.handleOptimizationResult(result).catch(function(error) {
                    console.error('Error handling optimization result:', error);
                    self.fallbackToBasicMidpointWithVenues();
                });
            } else {
                console.warn('⚠️ Visualization completed without result, falling back to basic midpoint');
                self.fallbackToBasicMidpointWithVenues();
            }
            
            // Re-enable the button
            self.setButtonLoading(findCentralBtn, false);
            self._isProcessingRequest = false;
        });
    } else {
        // Fallback to direct optimization without visualization
        console.log('🚀 Running optimization without visualization...');
        console.log('Reason: Visualizer available?', !!window.algorithmVisualizer, 'Map available?', !!window.map, 'Optimizer available?', !!window.meetingPointOptimizer);
        
        // Set loading state
        this.setButtonLoading(findCentralBtn, true);
        
        if (!window.meetingPointOptimizer) {
            console.error('MeetingPointOptimizer not available');
            this.fallbackToBasicMidpointWithVenues();
            this.setButtonLoading(findCentralBtn, false);
            this._isProcessingRequest = false;
            return;
        }
        
        // Show a simple loading message
        this.showInfoMessage('Finding the best meeting point...');
        
        window.meetingPointOptimizer.findOptimalMeetingPoint(users)
            .then(function(result) {
                if (result) {
                    console.log('✅ Optimization completed with result:', result);
                    return self.handleOptimizationResult(result);
                } else {
                    console.warn('⚠️ Optimization completed without result, falling back to basic midpoint');
                    self.fallbackToBasicMidpointWithVenues();
                    return null;
                }
            })
            .catch(function(error) {
                console.error('❌ Error during optimization:', error);
                self.showErrorMessage('An error occurred during optimization');
                self.fallbackToBasicMidpointWithVenues();
                return null;
            })
            .finally(function() {
                // Re-enable the button
                if (findCentralBtn) self.setButtonLoading(findCentralBtn, false);
                self._isProcessingRequest = false;
            });
    }
};

/**
 * Handle optimization result
 */
MidpointCalculator.prototype.handleOptimizationResult = function(result) {
    return new Promise((resolve, reject) => {
        try {
            if (!result || !result.point) {
                reject(new Error('Invalid optimization result'));
                return;
            }
            
            // Show success message
            const venueCount = result.venues ? result.venues.length : 0;
            const fairness = result.fairness ? (result.fairness * 100).toFixed(1) : '0';
            this.showSuccessToast(`Found ${venueCount} venues • ${fairness}% fairness`);
            
            // Show detailed marker with popup (like event map)
            this.showDetailedMarkerWithPopup(result);
            
            // Store result for later use
            this.lastOptimalResult = result;
            
            // REMOVED: Automatic redirect to venues
            // Users can now choose when to explore venues via the popup buttons
            resolve();
            
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Show detailed marker with popup (like event map)
 * @param {Object} result - The result object containing point and metadata
 */
MidpointCalculator.prototype.showDetailedMarkerWithPopup = function(result) {
    // Clear existing midpoint marker
    if (this.midpointMarker) {
        this.midpointMarker.setMap(null);
    }

    if (!window.map) return;

    const isOptimal = result.metadata && !result.metadata.fallbackUsed;
    const color = isOptimal ? '#2E7D32' : '#FF9800';
    const fairness = result.fairness || 0;
    
    // Create detailed marker
    this.midpointMarker = new google.maps.Marker({
        position: result.point,
        map: window.map,
        title: 'Meeting Point • ' + (result.venues && result.venues.length ? result.venues.length : 0) + ' venues nearby',
        animation: google.maps.Animation.DROP,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
            scale: 15
        }
    });

    // Create detailed info window with travel times (like event map)
    const locationData = this.getAllLocationData();
    const validLocations = locationData.filter(function(loc) { 
        return loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng);
    });

    const travelInfo = result.times ? result.times.map((time, i) => 
        `<li>Person ${validLocations[i]?.personId || (i + 1)}: ${Math.round(time)} min</li>`
    ).join('') : '<li>Travel times calculated</li>';

    const venueInfo = result.venues && result.venues.length > 0 ? 
        result.venues.slice(0, 3).map(v => `
            <div style="margin-bottom: 4px;">
                <strong>${v.name}</strong> ⭐ ${v.rating || 'N/A'}
            </div>
        `).join('') : '<div style="color: #666;">No venues found nearby</div>';

    const infoContent = `
        <div class="optimal-point-info" style="max-width: 320px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            <h4 style="color: ${color}; margin: 0 0 12px 0; font-size: 16px;">
                🎯 Meeting Point
            </h4>
            
            <div class="optimization-stats" style="margin-bottom: 12px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span><strong>Fairness Score:</strong></span>
                    <span style="color: ${color}; font-weight: 500;">${(fairness * 100).toFixed(1)}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span><strong>Time Range:</strong></span>
                    <span>${Math.round(result.timeRange || 0)} min</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span><strong>Avg Travel:</strong></span>
                    <span>${Math.round(result.avgTime || 0)} min</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span><strong>Algorithm:</strong></span>
                    <span style="font-size: 11px; color: #666;">${Math.round(result.metadata?.duration || 0)}ms</span>
                </div>
            </div>
            
            <div class="travel-times" style="margin-bottom: 12px;">
                <h5 style="margin: 0 0 6px 0; font-size: 13px; color: #333;">🚶 Travel Times:</h5>
                <ul style="margin: 0; padding-left: 16px; font-size: 12px; color: #555;">
                    ${travelInfo}
                </ul>
            </div>
            
            ${result.venues && result.venues.length > 0 ? `
                <div class="venues-info" style="margin-bottom: 12px;">
                    <h5 style="margin: 0 0 6px 0; font-size: 13px; color: #333;">📍 Nearby Venues:</h5>
                    <div style="font-size: 12px;">
                        ${venueInfo}
                    </div>
                </div>
            ` : ''}
            
            <div style="margin-top: 15px; text-align: center;">
                <button onclick="window.midpointCalculator.shareMeetingPoint()" 
                        style="background: ${color}; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 8px;">
                    📤 Share Location
                </button>
                <button onclick="window.midpointCalculator.exploreVenuesFromPopup()" 
                        style="background: #17a2b8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    🔍 Explore Venues
                </button>
            </div>
        </div>
    `;

    const infoWindow = new google.maps.InfoWindow({ 
        content: infoContent,
        maxWidth: 350
    });

    this.midpointMarker.addListener('click', () => {
        infoWindow.open(window.map, this.midpointMarker);
    });

    // Auto-open the info window like event map
    setTimeout(() => {
        infoWindow.open(window.map, this.midpointMarker);
    }, 800);

    // Center map on optimal point
    window.map.panTo(result.point);
    window.map.setZoom(15);

    // Store result for other methods
    this.lastOptimalResult = result;
};

/**
 * FIXED: Explore venues from popup - uses stored result
 */
MidpointCalculator.prototype.exploreVenuesFromPopup = function() {
    console.log('🔍 Exploring venues from popup');
    
    if (!this.lastOptimalResult) {
        console.error('No optimization result available');
        this.showErrorMessage('No meeting point data available. Please calculate again.');
        return;
    }
    
    // Call the main venues method with the stored result
    this.goDirectlyToVenues(this.lastOptimalResult);
};

/**
 * Share meeting point location
 */
MidpointCalculator.prototype.shareMeetingPoint = function() {
    if (!this.lastOptimalResult || !this.lastOptimalResult.point) {
        this.showErrorMessage('No meeting point to share');
        return;
    }
    
    const point = this.lastOptimalResult.point;
    const fairnessText = this.lastOptimalResult.fairness ? 
        ` (${(this.lastOptimalResult.fairness * 100).toFixed(1)}% fairness)` : '';
    
    const googleMapsUrl = `https://www.google.com/maps?q=${point.lat},${point.lng}`;
    const text = `Meeting point${fairnessText}\n${googleMapsUrl}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Meeting Point',
            text: text,
            url: googleMapsUrl
        }).catch((err) => {
            console.log('Error sharing:', err);
            // Fallback to clipboard
            this.copyToClipboard(text);
        });
    } else {
        this.copyToClipboard(text);
    }
};

/**
 * Copy text to clipboard
 */
MidpointCalculator.prototype.copyToClipboard = function(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            this.showSuccessToast('📋 Meeting point copied to clipboard!');
        }).catch(() => {
            // Show shareable text in alert as last resort
            prompt('Copy this meeting point:', text);
        });
    } else {
        // Show shareable text in prompt for older browsers
        prompt('Copy this meeting point:', text);
    }
};

/**
 * Go directly to venues page
 * @param {Object} result - The result object containing point and venues
 */
MidpointCalculator.prototype.goDirectlyToVenues = function(result) {
    // Validate input
    if (!result || !result.point) {
        console.error('Invalid result object passed to goDirectlyToVenues:', result);
        this.showErrorMessage('Invalid meeting point data. Please try again.');
        return;
    }
    
    const point = result.point;
    const venues = result.venues || [];

    console.log('🚀 Going directly to venues with result:', result);

    // Store venues data in sessionStorage for temp venues page
    const tempSession = {
        midpoint: point,
        venues: venues.map(v => ({
            ...v,
            // Ensure we have the necessary properties for the venue card
            name: v.name || 'Unnamed Venue',
            vicinity: v.vicinity || v.formatted_address || 'No address available',
            rating: v.rating || 0,
            price_level: v.price_level || 0,
            photos: v.photos || [],
            geometry: v.geometry || { location: point }
        })),
        timestamp: Date.now(),
        source: 'midpoint_calculator',
        fairness: result.fairness || 0,
        avgTime: result.avgTime || 0,
        timeRange: result.timeRange || 0
    };
    
    try {
        // Use VenueNavigationService if available
        if (window.venueNavigationService) {
            window.venueNavigationService.saveOptimizationResults(result, 'homepage');
            window.venueNavigationService.navigateToVenueExploration({
                source: 'homepage',
                swipeMode: false
            });
        } else {
            // Fallback to direct sessionStorage and redirect
            sessionStorage.setItem('tempVenues', JSON.stringify(tempSession));
            window.location.href = '/mobile/venues/temp';
        }
    } catch (error) {
        console.error('Error navigating to venues:', error);
        // Fallback to basic redirect
        sessionStorage.setItem('tempVenues', JSON.stringify(tempSession));
        window.location.href = '/mobile/venues/temp';
    }
};

/**
 * Fallback to basic geometric midpoint with venue search
 */
MidpointCalculator.prototype.fallbackToBasicMidpointWithVenues = function() {
    console.log('🔄 Using fallback to basic midpoint with venue search...');
    
    const locationData = this.getAllLocationData();
    const validLocations = locationData.filter(function(loc) { 
        return loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng);
    });
    
    if (validLocations.length === 0) {
        this.showErrorMessage('No valid locations available');
        return;
    }

    // Calculate basic geometric midpoint
    const midpoint = this.calculateGeometricMidpoint(validLocations);
    
    if (!midpoint) {
        this.showErrorMessage('Could not calculate meeting point');
        return;
    }

    // Search for venues around the basic midpoint
    return this.searchVenuesAroundPoint(midpoint)
        .then((venues) => {
            const basicResult = {
                point: midpoint,
                times: [],
                venues: venues,
                score: 0,
                fairness: 0,
                avgTime: 0,
                timeRange: 0,
                source: 'geometric_fallback',
                metadata: {
                    fallbackUsed: true,
                    duration: 0
                }
            };

            this.showSuccessToast(`Found ${venues.length} venues • Basic midpoint`);
            this.showDetailedMarkerWithPopup(basicResult);
            
            // REMOVED: Automatic redirect to venues
            // Users can now choose when to explore venues via the popup buttons
            return Promise.resolve();
        })
        .catch((error) => {
            console.error('Error finding venues:', error);
            this.showErrorMessage('Could not find venues. Please try again.');
            throw error;
        });
};

/**
 * Search for venues around a point
 * @param {Object} point - The point to search around (should have lat/lng properties)
 * @returns {Promise<Array>} A promise that resolves with an array of venue objects
 */
MidpointCalculator.prototype.searchVenuesAroundPoint = function(point) {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps || !window.google.maps.places || !window.google.maps.places.PlacesService) {
            reject(new Error('Google Maps Places API not available'));
            return;
        }

        const service = new google.maps.places.PlacesService(window.map);
        
        const request = {
            location: point,
            radius: 1000, // 1km radius
            type: ['restaurant', 'cafe', 'food'],
            keyword: 'restaurant cafe food'
        };

        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                // Sort by rating and limit to top venues
                const sortedVenues = results
                    .filter(place => place.rating && place.rating > 3.0)
                    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                    .slice(0, 20);
                
                resolve(sortedVenues);
            } else {
                resolve([]); // Return empty array if no venues found
            }
        });
    });
};

/**
 * Show success toast notification
 */
MidpointCalculator.prototype.showSuccessToast = function(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        box-shadow: 0 4px 20px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        opacity: 0;
        transform: translateX(-50%) translateY(-10px);
        transition: all 0.3s ease;
        max-width: 90vw;
        text-align: center;
    `;
    
    toast.innerHTML = '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' + message;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(function() {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-10px)';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
};

/**
 * Get all location data from various location management systems
 */
MidpointCalculator.prototype.getAllLocationData = function() {
    let locations = [];
    
    // Method 1: New LocationManager system
    if (window.locationManager && window.locationManager.locations) {
        window.locationManager.locations.forEach((locationInput, personId) => {
            if (locationInput.state.isValid && locationInput.state.position) {
                locations.push({
                    personId: personId,
                    lat: locationInput.state.position.lat(),
                    lng: locationInput.state.position.lng(), 
                    name: locationInput.state.address,
                    transportMode: locationInput.state.transportMode,
                    isValid: true
                });
            } else {
                locations.push({
                    personId: personId,
                    isValid: false
                });
            }
        });
        
        console.log('LocationManager data:', locations);
        return locations;
    }
    
    // Method 2: LocationInputEnhancers (homepage)
    if (window.locationInputEnhancers) {
        window.locationInputEnhancers.forEach((enhancer, inputId) => {
            const personId = enhancer.personId;
            
            if (enhancer.state.isValid && enhancer.state.position) {
                locations.push({
                    personId: personId,
                    lat: enhancer.state.position.lat(),
                    lng: enhancer.state.position.lng(),
                    name: enhancer.state.address,
                    transportMode: enhancer.state.transportMode,
                    isValid: true
                });
            } else {
                locations.push({
                    personId: personId,
                    isValid: false
                });
            }
        });
        
        console.log('LocationInputEnhancers data:', locations);
        return locations;
    }
    
    // Method 3: Legacy locationData support  
    if (window.locationData) {
        window.locationData.forEach((data, locationId) => {
            if (data.lat && data.lng) {
                const personId = locationId.replace('location-', '');
                locations.push({
                    personId: personId,
                    lat: data.lat,
                    lng: data.lng,
                    name: data.address || 'Unknown location',
                    transportMode: window.userTransportModes?.get(locationId) || 'TRANSIT',
                    isValid: true
                });
            } else {
                const personId = locationId.replace('location-', '');
                locations.push({
                    personId: personId,
                    isValid: false
                });
            }
        });
        
        console.log('Legacy locationData:', locations);
        return locations;
    }
    
    // Method 4: Check DOM for location inputs as final fallback
    const locationInputs = document.querySelectorAll('.location-input');
    locationInputs.forEach((input, index) => {
        const value = input.value.trim();
        if (value) {
            // This would need geocoding, so mark as potentially valid
            locations.push({
                personId: index + 1,
                lat: null, // Would need geocoding
                lng: null,
                name: value,
                transportMode: 'TRANSIT',
                isValid: false // Can't validate without geocoding
            });
        }
    });
    
    console.log('Final location data:', locations);
    return locations;
};
    
/**
 * Calculate the geometric midpoint of multiple locations
 */
MidpointCalculator.prototype.calculateGeometricMidpoint = function(locations) {
    if (!locations || locations.length === 0) return null;
    
    let totalLat = 0;
    let totalLng = 0;
    let validCount = 0;
    
    locations.forEach(location => {
        if (location.lat && location.lng) {
            totalLat += location.lat;
            totalLng += location.lng;
            validCount++;
        }
    });
    
    if (validCount === 0) return null;
    
    return {
        lat: totalLat / validCount,
        lng: totalLng / validCount
    };
};

/**
 * Show error message
 */
MidpointCalculator.prototype.showErrorMessage = function(message) {
    console.error('❌', message);
    
    // Try to use existing notification system
    if (window.uiManager && window.uiManager.showErrorNotification) {
        window.uiManager.showErrorNotification(message);
    } else if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        // Fallback to alert
        alert('Error: ' + message);
    }
};

/**
 * Show info message
 */
MidpointCalculator.prototype.showInfoMessage = function(message) {
    console.log('ℹ️', message);
    
    // Try to use existing notification system
    if (window.uiManager && window.uiManager.showInfoNotification) {
        window.uiManager.showInfoNotification(message);
    } else if (typeof showNotification === 'function') {
        showNotification(message, 'info');
    } else {
        // Fallback to console
        console.log(message);
    }
};

// Create global instance
window.midpointCalculator = new MidpointCalculator();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize midpoint calculator
    window.midpointCalculator.init();
});