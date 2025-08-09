/**
 * MarkerStyleService - Provides consistent marker styling and creation
 * Handles all marker-related UI components for both maps and venue displays
 */

class MarkerStyleService {
    constructor() {
        // Reference to UIService
        this.uiService = window.uiService;
        // Default marker styles
        this.styles = {
            // Location markers (user locations)
            location: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4285F4',
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
                scale: 8
            },
            
            // Midpoint marker
            midpoint: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#EA4335',
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
                scale: 10
            },
            
            // Venue markers
            venue: {
                url: 'https://maps.google.com/mapfiles/ms/icons/restaurant.png',
                scaledSize: new google.maps.Size(32, 32),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(16, 32)
            },
            
            // Selected venue
            selectedVenue: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new google.maps.Size(40, 40),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(20, 40)
            },
            
            // Highlighted venue
            highlightedVenue: {
                url: 'https://maps.google.com/mapfiles/ms/icons/ltblue-dot.png',
                scaledSize: new google.maps.Size(36, 36),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(18, 36)
            }
        };
        
        // Animation settings
        this.animations = {
            DROP: google.maps.Animation.DROP,
            BOUNCE: google.maps.Animation.BOUNCE
        };
        
        console.log('MarkerStyleService initialized');
    }
    
    /**
     * Create a marker with the specified style
     * @param {google.maps.Map} map - Google Maps instance
     * @param {Object} position - {lat, lng} position object
     * @param {string} type - Marker type (location, midpoint, venue, etc.)
     * @param {Object} options - Additional options to override defaults
     * @returns {google.maps.Marker} Created marker
     */
    createMarker(map, position, type = 'location', options = {}) {
        const style = this.getStyle(type);
        const marker = new google.maps.Marker({
            position,
            map,
            ...style,
            ...options
        });
        
        // Add animation if specified
        if (options.animation) {
            marker.setAnimation(options.animation);
        }
        
        return marker;
    }
    
    /**
     * Get marker style by type
     * @param {string} type - Marker type
     * @returns {Object} Style object
     */
    getStyle(type) {
        return this.styles[type] || this.styles.location;
    }
    
    /**
     * Create an info window for a venue
     * @param {Object} venue - Venue data
     * @param {Function} onSelect - Callback when venue is selected
     * @param {Function} onDirections - Callback when directions are requested
     * @returns {google.maps.InfoWindow} Info window instance
     */
    createVenueInfoWindow(venue, onSelect, onDirections) {
        const content = this.createVenueInfoContent(venue, onSelect, onDirections);
        return new google.maps.InfoWindow({
            content,
            maxWidth: 280
        });
    }
    
    /**
     * Create HTML content for venue info window
     * @private
     */
    createVenueInfoContent(venue, onSelect, onDirections) {
        // Use UIService to create a venue card
        const card = this.uiService.createVenueCard(venue, onSelect, onDirections);
        
        // Create container and add card
        const container = document.createElement('div');
        container.className = 'venue-info-window';
        container.appendChild(card);
        
        // Add styles
        this.attachInfoWindowStyles(container);
        
        return container;
    }
    
    /**
     * Generate star rating HTML
     * @private
     */
    getRatingStars(rating) {
        if (!rating) return '<span class="no-rating">No ratings</span>';
        
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return `<span class="stars" title="${rating.toFixed(1)}/5">${stars}</span>`;
    }
    
    /**
     * Attach styles for info window
     * @private
     */
    /**
     * Create a marker with consistent styling and behavior
     * @param {google.maps.Map} map - Google Maps instance
     * @param {Object} position - {lat, lng} position object
     * @param {string} type - Marker type (location, midpoint, venue, etc.)
     * @param {Object} options - Additional options to override defaults
     * @returns {google.maps.Marker} Created marker
     */
    createEnhancedMarker(map, position, type = 'location', options = {}) {
        const marker = this.createMarker(map, position, type, options);
        
        // Add animation if specified
        if (options.animation) {
            marker.setAnimation(options.animation);
            
            // Auto-remove animation after it completes
            if (options.animation === google.maps.Animation.BOUNCE) {
                setTimeout(() => {
                    if (marker) marker.setAnimation(null);
                }, 2000);
            }
        }
        
        // Add click handler if provided
        if (options.onClick) {
            marker.addListener('click', (e) => {
                if (options.onClick) options.onClick(e, marker);
            });
        }
        
        return marker;
    }
    
    /**
     * Create a custom SVG marker
     * @param {string} color - Fill color
     * @param {string} label - Optional label text
     * @param {string} icon - Optional icon class (e.g., 'fa-map-marker-alt')
     * @returns {Object} Marker options
     */
    createSvgMarker(color, label = '', icon = '') {
        if (icon) {
            // Create icon with Font Awesome
            const size = 40;
            const svg = `
                <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                    <text x="20" y="26" font-family="Arial" font-size="14" font-weight="bold" 
                          text-anchor="middle" fill="white" stroke="white" stroke-width="0.5">
                        ${label}
                    </text>
                    <foreignObject x="8" y="8" width="24" height="24">
                        <i class="${icon}" style="color: white; font-size: 16px; display: flex; justify-content: center; align-items: center; height: 100%;"></i>
                    </foreignObject>
                </svg>
            `;
            
            return {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
                scaledSize: new google.maps.Size(size, size),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(size/2, size)
            };
        }
        
        // Fallback to simple circle with label
        const size = label ? 36 : 24;
        const svg = `
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                ${label ? `
                <text x="${size/2}" y="${size/2 + 5}" font-family="Arial" font-size="12" font-weight="bold" 
                      text-anchor="middle" fill="white" stroke="white" stroke-width="0.5">
                    ${label}
                </text>` : ''}
            </svg>
        `;
        
        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(size, size),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(size/2, size/2)
        };
    }
    
    attachInfoWindowStyles(container) {
        if (document.getElementById('venue-info-window-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'venue-info-window-styles';
        style.textContent = `
            .venue-info-window {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #333;
                padding: 8px;
            }
            
            .venue-info-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8px;
            }
            
            .venue-name {
                margin: 0;
                font-size: 1.1em;
                font-weight: 600;
                color: #1a73e8;
                margin-right: 8px;
            }
            
            .venue-rating {
                display: flex;
                align-items: center;
                white-space: nowrap;
            }
            
            .stars {
                color: #fbbc04;
                font-size: 0.9em;
                margin-right: 4px;
            }
            
            .rating-count {
                color: #757575;
                font-size: 0.8em;
            }
            
            .no-rating {
                color: #9e9e9e;
                font-style: italic;
                font-size: 0.9em;
            }
            
            .venue-address {
                margin: 4px 0 8px;
                color: #5f6368;
                font-size: 0.9em;
                line-height: 1.4;
            }
            
            .venue-meta {
                display: flex;
                gap: 12px;
                margin-bottom: 12px;
                font-size: 0.9em;
                color: #5f6368;
            }
            
            .price-level {
                color: #0d652d;
                font-weight: 500;
            }
            
            .venue-actions {
                display: flex;
                gap: 8px;
                margin-top: 8px;
            }
            
            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 0.9em;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid transparent;
            }
            
            .btn i {
                margin-right: 6px;
            }
            
            .btn-sm {
                padding: 4px 10px;
                font-size: 0.85em;
            }
            
            .btn-primary {
                background-color: #1a73e8;
                color: white;
                border-color: #1a73e8;
            }
            
            .btn-primary:hover {
                background-color: #1557b0;
                border-color: #1557b0;
            }
            
            .btn-outline-secondary {
                background-color: white;
                color: #5f6368;
                border: 1px solid #dadce0;
            }
            
            .btn-outline-secondary:hover {
                background-color: #f8f9fa;
                border-color: #c6c9ce;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Create a custom SVG marker
     * @param {string} color - Fill color
     * @param {string} label - Optional label text
     * @returns {Object} Marker options
     */
    createSvgMarker(color, label = '') {
        const svg = `
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                <text x="20" y="26" font-family="Arial" font-size="14" font-weight="bold" 
                      text-anchor="middle" fill="white" stroke="white" stroke-width="0.5">
                    ${label}
                </text>
            </svg>
        `;
        
        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(40, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(20, 40)
        };
    }
}

// Create global instance
window.markerStyleService = new MarkerStyleService();

export default MarkerStyleService;
