/**
 * Homepage Collapsible Container Manager
 * Makes the locations container behave like the event map manager
 */

class HomepageCollapsibleManager {
    constructor() {
        this.isExpanded = false;
        this.isDragging = false;
        this.startY = 0;
        this.currentY = 0;
        
        this.init();
    }
    
    init() {
        this.addCollapsibleStyles();
        this.setupCollapsibleBehavior();
        this.setupHeaderToggle();
        this.setupMapInteraction();
        
        console.log('📱 Homepage collapsible container initialized');
    }
    
    addCollapsibleStyles() {
        // Only add styles if not already present
        if (document.getElementById('homepage-collapsible-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'homepage-collapsible-styles';
        style.textContent = `
            /* Transform existing locations container into collapsible drawer */
            .locations-container {
                position: fixed !important;
                top: 72px !important; /* Below mobile header */
                left: 0 !important;
                right: 0 !important;
                background: rgba(255, 255, 255, 0.95) !important;
                border-radius: 0 0 20px 20px !important;
                backdrop-filter: blur(10px) !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
                z-index: 1000 !important;
                transform: translateY(-75%) !important; /* Show some content by default */
                transition: transform 0.3s ease !important;
                max-height: 70vh !important;
                display: flex !important;
                flex-direction: column !important;
                width: 100vw !important;
                cursor: pointer !important;
                user-select: none !important;
            }
            
            .locations-container.expanded {
                transform: translateY(0) !important; /* Full expansion */
            }
            
            /* Container content wrapper */
            .container-content {
                padding: 16px !important;
                overflow-y: auto !important;
                max-height: calc(70vh - 80px) !important;
                order: 0 !important; /* Content first */
            }
            
            /* Handle area at bottom */
            .handle-area {
                padding: 12px 20px 8px !important;
                text-align: center !important;
                border-top: 1px solid rgba(0, 0, 0, 0.05) !important;
                order: 1 !important; /* Handle at bottom */
                cursor: pointer !important;
                background: rgba(255, 255, 255, 0.9) !important;
                border-radius: 0 0 20px 20px !important;
            }
            
            .container-handle {
                width: 40px !important;
                height: 4px !important;
                background: #ddd !important;
                border-radius: 2px !important;
                margin: 0 auto !important;
                margin-top: 8px !important;
                margin-bottom: 4px !important;
                transition: background-color 0.2s ease !important;
            }
            
            .container-handle:hover {
                background: #8B5DB8 !important;
            }
            
            .handle-title {
                font-size: 14px !important;
                font-weight: 600 !important;
                color: #8B5DB8 !important;
                margin: 2px !important;
            }
            
            /* Header indicator */
            .group-header-container.container-expanded::after {
                content: '' !important;
                position: absolute !important;
                bottom: -2px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                width: 40px !important;
                height: 3px !important;
                background: #8B5DB8 !important;
                border-radius: 0 0 2px 2px !important;
                opacity: 1 !important;
                transition: opacity 0.2s ease !important;
            }
            
            /* Enhanced location containers */
            .location-container {
                background: rgba(248, 249, 250, 0.8) !important;
                border-radius: 14px !important;
                padding: 12px !important;
                margin-bottom: 12px !important;
                border: 2px solid transparent !important;
                transition: all 0.3s ease !important;
                backdrop-filter: blur(5px) !important;
            }
            
            .location-container:hover {
                background: rgba(255, 255, 255, 0.9) !important;
                border-color: rgba(139, 93, 184, 0.3) !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            }
            
            /* Enhanced input styling */
            .location-input {
                background: rgba(255, 255, 255, 0.9) !important;
                border: 1px solid rgba(0, 0, 0, 0.1) !important;
                border-radius: 8px !important;
                transition: all 0.3s ease !important;
            }
            
            .location-input:focus {
                background: white !important;
                border-color: #8B5DB8 !important;
                box-shadow: 0 0 0 0.2rem rgba(139, 93, 184, 0.25) !important;
            }
            
            /* Button container styling */
            #parent-container {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                margin-top: 16px !important;
                padding-top: 12px !important;
                border-top: 1px solid rgba(0, 0, 0, 0.05) !important;
            }
            
            /* Enhanced button styling with remove button support */
            .add-person-circle {
                background: linear-gradient(135deg, #8B5DB8, #6A4A8C) !important;
                border: none !important;
                border-radius: 50% !important;
                width: 48px !important;
                height: 48px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: white !important;
                font-size: 18px !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                box-shadow: 0 4px 16px rgba(139, 93, 184, 0.3) !important;
            }
            
            .add-person-circle:hover {
                transform: scale(1.1) !important;
                box-shadow: 0 6px 20px rgba(139, 93, 184, 0.4) !important;
            }
            
            .remove-person-btn {
                width: 28px !important;
                height: 28px !important;
                border-radius: 6px !important;
                border: none !important;
                background: #f8f9fa !important;
                color: #666 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 12px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                margin-left: 8px !important;
                opacity: 0.7 !important;
            }
            
            .remove-person-btn:hover {
                background: #dc3545 !important;
                color: white !important;
                opacity: 1 !important;
                transform: scale(1.05) !important;
            }
            
            .location-container:hover .remove-person-btn {
                opacity: 1 !important;
            }
            
            .find-central-btn {
                background: linear-gradient(135deg, #8B5DB8, #6A4A8C) !important;
                border: none !important;
                border-radius: 24px !important;
                padding: 12px 20px !important;
                color: white !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                box-shadow: 0 4px 16px rgba(139, 93, 184, 0.3) !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
            }
            
            .find-central-btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(139, 93, 184, 0.4) !important;
            }
            
            .find-central-btn:disabled {
                background: #dee2e6 !important;
                color: #6c757d !important;
                cursor: not-allowed !important;
                transform: none !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .locations-container {
                    top: 72px !important; /* Adjust for mobile header */
                    border-radius: 0 0 16px 16px !important;
                }
                
                .container-content {
                    padding: 12px !important;
                }
                
                .location-container {
                    padding: 10px !important;
                    margin-bottom: 10px !important;
                }
                
                .add-person-circle {
                    width: 44px !important;
                    height: 44px !important;
                    font-size: 16px !important;
                }
                
                .find-central-btn {
                    padding: 10px 16px !important;
                    font-size: 13px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setupCollapsibleBehavior() {
        const container = document.getElementById('locations-container');
        if (!container) return;
        
        // Wrap existing content
        this.wrapContainerContent(container);
        
        // Add handle area
        this.addHandleArea(container);
        
        // Restore add person button functionality
        this.setupAddPersonButton();
        
        // Set initial state (collapsed)
        container.classList.remove('expanded');
        this.isExpanded = false;
    }
    
    wrapContainerContent(container) {
        // Check if already wrapped
        if (container.querySelector('.container-content')) return;
        
        // Get all existing children except the parent-container
        const existingChildren = Array.from(container.children).filter(
            child => child.id !== 'parent-container'
        );
        
        // Create content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'container-content';
        
        // Move existing children to wrapper
        existingChildren.forEach(child => {
            contentWrapper.appendChild(child);
        });
        
        // Add parent-container to wrapper
        const parentContainer = container.querySelector('#parent-container');
        if (parentContainer) {
            contentWrapper.appendChild(parentContainer);
        }
        
        // Add wrapper to container
        container.appendChild(contentWrapper);
    }
    
    addHandleArea(container) {
        // Check if handle already exists
        if (container.querySelector('.handle-area')) return;
        
        const handleArea = document.createElement('div');
        handleArea.className = 'handle-area';
        handleArea.id = 'container-handle';
        
        const title = document.createElement('h4');
        title.className = 'handle-title';
        title.textContent = 'Find Meetup Location';
        
        const handle = document.createElement('div');
        handle.className = 'container-handle';
        
        handleArea.appendChild(title);
        handleArea.appendChild(handle);
        
        container.appendChild(handleArea);
        
        // Add click handler to handle area
        handleArea.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleContainer();
        });
    }
    
    setupAddPersonButton() {
        const addPersonBtn = document.getElementById('add-person-btn');
        if (!addPersonBtn) {
            console.warn('Add person button not found');
            return;
        }
        
        // Remove any existing event listeners to prevent duplicates
        const newAddPersonBtn = addPersonBtn.cloneNode(true);
        addPersonBtn.parentNode.replaceChild(newAddPersonBtn, addPersonBtn);
        
        // Add the click event listener
        newAddPersonBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.addNewPerson();
        });
        
        console.log('✅ Add person button functionality restored');
    }
    
    addNewPerson() {
        const locationsContainer = document.querySelector('.container-content');
        const parentContainer = document.getElementById('parent-container');
        
        if (!locationsContainer || !parentContainer) {
            console.error('Required containers not found');
            return;
        }
        
        // Find next available person ID
        const existingInputs = document.querySelectorAll('.location-input');
        const existingIds = Array.from(existingInputs).map(input => 
            parseInt(input.id.replace('location-', ''))
        );
        
        let nextId = 3; // Start from 3 since 1 and 2 are default
        while (existingIds.includes(nextId) && nextId <= 10) {
            nextId++;
        }
        
        if (nextId > 10) {
            alert('Maximum number of locations reached (10)');
            return;
        }
        
        // Create new location container
        const locationContainer = document.createElement('div');
        locationContainer.className = 'location-container';
        locationContainer.setAttribute('data-person-id', nextId);
        
        // Create transport icon
        const transportIcon = document.createElement('div');
        transportIcon.className = 'transport-icon transit';
        transportIcon.setAttribute('data-person', nextId);
        transportIcon.setAttribute('data-current-mode', 'TRANSIT');
        transportIcon.setAttribute('data-tooltip', 'Public Transport');
        
        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-subway';
        transportIcon.appendChild(iconElement);
        
        // Create input
        const locationInput = document.createElement('input');
        locationInput.type = 'text';
        locationInput.className = 'location-input';
        locationInput.id = `location-${nextId}`;
        locationInput.placeholder = `Person ${nextId}'s location`;
        locationInput.autocomplete = 'off';
        
        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-person-btn';
        removeBtn.title = 'Remove Person';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        
        // Add remove functionality
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Remove the container
            locationContainer.remove();
            
            // Remove from enhancers if exists
            if (window.locationInputEnhancers) {
                window.locationInputEnhancers.delete(`location-${nextId}`);
            }
            
            // Update handle title
            setTimeout(() => this.updateHandleTitle(), 100);
            
            // Update find button state
            if (window.midpointCalculator && window.midpointCalculator.updateFindButtonState) {
                window.midpointCalculator.updateFindButtonState();
            }
            
            console.log(`Removed person ${nextId}`);
        });
        
        // Assemble container
        locationContainer.appendChild(transportIcon);
        locationContainer.appendChild(locationInput);
        locationContainer.appendChild(removeBtn);
        
        // Insert before parent container
        locationsContainer.insertBefore(locationContainer, parentContainer);
        
        // Enhance the new input with our LocationInputEnhancer
        setTimeout(() => {
            // First, try to get the LocationInputEnhancer class
            let LocationInputEnhancer = window.LocationInputEnhancer;
            
            // If not available globally, try to find it in the homepage integration script
            if (!LocationInputEnhancer && window.locationInputEnhancers) {
                // Get the constructor from an existing enhancer
                const existingEnhancer = Array.from(window.locationInputEnhancers.values())[0];
                if (existingEnhancer && existingEnhancer.constructor) {
                    LocationInputEnhancer = existingEnhancer.constructor;
                }
            }
            
            if (LocationInputEnhancer) {
                console.log(`🔧 Enhancing new input: location-${nextId}`);
                const enhancer = new LocationInputEnhancer(locationInput);
                
                if (!window.locationInputEnhancers) {
                    window.locationInputEnhancers = new Map();
                }
                window.locationInputEnhancers.set(`location-${nextId}`, enhancer);
                
                console.log(`✅ Enhanced location-${nextId} with full functionality`);
            } else {
                console.error('❌ LocationInputEnhancer not available - new input will not have enhanced functionality');
                
                // Fallback: Set up basic autocomplete at least
                this.setupBasicAutocomplete(locationInput, nextId);
            }
            
            // Update handle title
            this.updateHandleTitle();
        }, 200); // Increase delay to ensure everything is ready
        
        // Expand container to show new input
        if (!this.isExpanded) {
            this.expandContainer();
        }
        
        // Focus the new input
        locationInput.focus();
        
        console.log(`Added new person ${nextId}`);
    }
    
    // Fallback autocomplete setup for new inputs if LocationInputEnhancer fails
    setupBasicAutocomplete(input, personId) {
        console.log(`🔄 Setting up fallback autocomplete for location-${personId}`);
        
        // Wait for Google Maps to be available
        if (!window.google?.maps?.places?.Autocomplete) {
            setTimeout(() => this.setupBasicAutocomplete(input, personId), 1000);
            return;
        }
        
        try {
            const autocomplete = new google.maps.places.Autocomplete(input, {
                componentRestrictions: { country: "sg" },
                fields: ["geometry", "formatted_address", "name"]
            });
            
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                
                if (place && place.geometry) {
                    console.log(`📍 Place selected for location-${personId}:`, place.formatted_address);
                    
                    // Get map reference
                    const map = window.mapManager?.getMap() || window.map;
                    if (map) {
                        // Create marker
                        const marker = new google.maps.Marker({
                            position: place.geometry.location,
                            map: map,
                            title: place.formatted_address,
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                fillColor: this.getPersonColor(personId),
                                fillOpacity: 0.9,
                                strokeColor: '#ffffff',
                                strokeWeight: 3,
                                scale: 10
                            },
                            animation: google.maps.Animation.DROP
                        });
                        
                        // Pan to marker
                        map.panTo(place.geometry.location);
                        
                        // Store in global data for compatibility
                        if (!window.locationData) window.locationData = new Map();
                        window.locationData.set(`location-${personId}`, {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                            address: place.formatted_address,
                            transportMode: 'TRANSIT'
                        });
                        
                        // Update find button
                        if (window.midpointCalculator && window.midpointCalculator.updateFindButtonState) {
                            window.midpointCalculator.updateFindButtonState();
                        }
                        
                        // Add visual feedback
                        input.style.borderColor = '#28a745';
                        input.style.backgroundColor = '#f8fff9';
                    }
                }
            });
            
            input.setAttribute('data-autocomplete-initialized', 'true');
            console.log(`✅ Fallback autocomplete set up for location-${personId}`);
            
        } catch (error) {
            console.error(`❌ Failed to set up fallback autocomplete for location-${personId}:`, error);
        }
    }
    
    // Get color for person ID
    getPersonColor(personId) {
        const colors = ['#EF4444', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'];
        return colors[(personId - 1) % colors.length];
    }
    
    setupHeaderToggle() {
        const header = document.querySelector('.group-header-container');
        if (!header) return;
        
        // Make header clickable to toggle container
        header.style.cursor = 'pointer';
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking on logo or other interactive elements
            if (e.target.closest('img, a, button')) return;
            
            this.toggleContainer();
        });
    }
    
    setupMapInteraction() {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        // Collapse container when interacting with map
        mapElement.addEventListener('click', () => {
            if (this.isExpanded) {
                this.collapseContainer();
            }
        });
        
        mapElement.addEventListener('touchstart', () => {
            if (this.isExpanded) {
                this.collapseContainer();
            }
        });
        
        // CRITICAL FIX: Setup map event listeners with proper checking
        const setupMapListeners = (map) => {
            // FIXED: Check if map exists and has addListener method
            if (!map || typeof map.addListener !== 'function') {
                console.warn('Map not ready for listeners, skipping map interaction setup');
                return;
            }
            
            try {
                map.addListener('click', () => {
                    if (this.isExpanded) {
                        this.collapseContainer();
                    }
                });
                
                map.addListener('drag', () => {
                    if (this.isExpanded) {
                        this.collapseContainer();
                    }
                });
                
                console.log('✅ Map listeners set up successfully');
            } catch (error) {
                console.warn('Failed to set up map listeners:', error);
            }
        };
        
        // FIXED: Setup now if map exists and is ready, or wait for map ready event
        const currentMap = window.mapManager?.getMap() || window.map;
        if (currentMap && typeof currentMap.addListener === 'function') {
            setupMapListeners(currentMap);
        } else {
            // Wait for map to be ready
            document.addEventListener('mapReady', () => {
                const readyMap = window.mapManager?.getMap() || window.map;
                if (readyMap && typeof readyMap.addListener === 'function') {
                    setupMapListeners(readyMap);
                }
            });
            
            // Alternative: Wait for window.map to be available
            let mapCheckAttempts = 0;
            const checkForMap = () => {
                const map = window.mapManager?.getMap() || window.map;
                if (map && typeof map.addListener === 'function') {
                    setupMapListeners(map);
                } else if (mapCheckAttempts < 20) { // Try for 10 seconds
                    mapCheckAttempts++;
                    setTimeout(checkForMap, 500);
                } else {
                    console.warn('Map not available after 10 seconds, skipping map listeners');
                }
            };
            
            setTimeout(checkForMap, 1000); // Start checking after 1 second
        }
    }
    
    toggleContainer() {
        if (this.isExpanded) {
            this.collapseContainer();
        } else {
            this.expandContainer();
        }
    }
    
    expandContainer() {
        const container = document.getElementById('locations-container');
        const header = document.querySelector('.group-header-container');
        
        if (container) {
            container.classList.add('expanded');
            this.isExpanded = true;
            
            // Update header indicator
            if (header) {
                header.classList.add('container-expanded');
            }
            
            console.log('📱 Container expanded');
        }
    }
    
    collapseContainer() {
        const container = document.getElementById('locations-container');
        const header = document.querySelector('.group-header-container');
        
        if (container) {
            container.classList.remove('expanded');
            this.isExpanded = false;
            
            // Remove header indicator
            if (header) {
                header.classList.remove('container-expanded');
            }
            
            console.log('📱 Container collapsed');
        }
    }
    
    // Update handle title based on location count
    updateHandleTitle() {
        const handleTitle = document.querySelector('.handle-title');
        if (!handleTitle) return;
        
        // Count valid locations
        let validCount = 0;
        if (window.locationInputEnhancers) {
            window.locationInputEnhancers.forEach(enhancer => {
                if (enhancer.state.isValid) {
                    validCount++;
                }
            });
        }
        
        if (validCount === 0) {
            handleTitle.textContent = 'Add Locations to Find Meetup';
        } else if (validCount === 1) {
            handleTitle.textContent = '1 Location • Add More';
        } else {
            handleTitle.textContent = `${validCount} Locations • Find Meetup`;
        }
    }
}

// Initialize collapsible behavior
function initializeHomepageCollapsible() {
    // Wait for DOM and other components to be ready
    const init = () => {
        if (document.getElementById('locations-container')) {
            window.homepageCollapsible = new HomepageCollapsibleManager();
            
            // Make LocationInputEnhancer globally available for add person functionality
            if (window.LocationInputEnhancer) {
                window.LocationInputEnhancer = window.LocationInputEnhancer;
            } else {
                // If LocationInputEnhancer isn't loaded yet, wait for it
                const waitForEnhancer = () => {
                    if (window.LocationInputEnhancer) {
                        console.log('✅ LocationInputEnhancer ready for add person functionality');
                    } else {
                        setTimeout(waitForEnhancer, 100);
                    }
                };
                waitForEnhancer();
            }
            
            // Update handle title when locations change
            const updateTitle = () => {
                if (window.homepageCollapsible) {
                    window.homepageCollapsible.updateHandleTitle();
                }
            };
            
            // Listen for location changes
            document.addEventListener('locationinput:change', updateTitle);
            
            // Initial title update
            setTimeout(updateTitle, 1000);
            
        } else {
            console.log('⏳ Waiting for locations container...');
            setTimeout(init, 500);
        }
    };
    
    init();
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHomepageCollapsible);
} else {
    initializeHomepageCollapsible();
}

// Export for global access
window.initializeHomepageCollapsible = initializeHomepageCollapsible;